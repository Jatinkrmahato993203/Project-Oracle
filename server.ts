import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, commitments, riskScores, recoveryPlans } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { calculateRiskScore, computeTimePressure } from './src/lib/risk-engine.ts';
import { generateRecoveryPlan } from './src/lib/gemini.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get current user and priorities
  app.get('/api/commitments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.dbUser;
      if (!dbUser) return res.status(401).json({ error: "User not synced" });

      const items = await db.select().from(commitments)
        .where(eq(commitments.userId, dbUser.id));

      // Also fetch their latest risk scores
      const result = await Promise.all(items.map(async (item) => {
        const scores = await db.select().from(riskScores)
          .where(eq(riskScores.commitmentId, item.id))
          .orderBy(desc(riskScores.computedAt))
          .limit(1);
        
        const plans = await db.select().from(recoveryPlans)
          .where(eq(recoveryPlans.commitmentId, item.id))
          .orderBy(desc(recoveryPlans.generatedAt))
          .limit(1);

        return {
          ...item,
          riskScore: scores[0]?.score ? Number(scores[0].score) : 0,
          basis: scores[0]?.basis || null,
          recoveryPlan: plans[0]?.content || null
        };
      }));

      // Sort by risk score descending
      result.sort((a, b) => b.riskScore - a.riskScore);

      res.json(result);
    } catch (error) {
      console.error('Failed to get commitments:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  // Create new commitment
  app.post('/api/commitments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.dbUser;
      if (!dbUser) return res.status(401).json({ error: "User not synced" });

      const { title, category, dueAt, estHours, stakesInr } = req.body;

      // 1. Insert commitment
      const inserted = await db.insert(commitments).values({
        userId: dbUser.id,
        title,
        category,
        dueAt: new Date(dueAt),
        estHours: estHours.toString(),
        stakesInr: stakesInr ? stakesInr.toString() : "0"
      }).returning();

      const newCommitment = inserted[0];

      // 2. Compute risk score based on heuristic
      // In a real app we'd compute total loadConflict dynamically. 
      // For MVP we just use an approximation or zero for brand new users.
      const timePressure = computeTimePressure(newCommitment.dueAt, Number(newCommitment.estHours));
      
      const priors = dbUser.onboardingPriors || {};
      const categoryBaseRate = priors[category] || 0.4; // Default prior
      
      const basis = {
        timePressure,
        loadConflict: 0.5, // Dummy default for MVP load conflict
        personalReliability: 0.5, // Dummy default for new users
        categoryBaseRate
      };

      const score = calculateRiskScore(basis);

      // 3. Save Risk Score
      await db.insert(riskScores).values({
        commitmentId: newCommitment.id,
        score: score.toString(),
        basis: basis as any
      });

      // 4. Generate recovery plan if risk > 0.6
      let planText = null;
      if (score > 0.6) {
        planText = await generateRecoveryPlan(newCommitment, score, basis);
        await db.insert(recoveryPlans).values({
          commitmentId: newCommitment.id,
          content: planText
        });
      }

      res.json({
        ...newCommitment,
        riskScore: score,
        basis,
        recoveryPlan: planText
      });
    } catch (error: any) {
      console.error('Failed to create commitment:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  });
  
  // Re-evaluate a commitment (A/B simulator)
  app.post('/api/commitments/:id/simulate', requireAuth, async (req: AuthRequest, res) => {
    try {
       const dbUser = req.dbUser;
       if (!dbUser) return res.status(401).json({ error: "User not synced" });
       
       const { simulatedEstHours } = req.body;
       const commitmentId = Number(req.params.id);
       
       const item = await db.select().from(commitments).where(eq(commitments.id, commitmentId)).limit(1);
       if (!item || item.length === 0) return res.status(404).json({error: "Not found"});
       
       const timePressure = computeTimePressure(item[0].dueAt, Number(simulatedEstHours));
       const priors = dbUser.onboardingPriors || {};
       const categoryBaseRate = priors[item[0].category] || 0.4; 
       
       const basis = {
         timePressure,
         loadConflict: 0.5, 
         personalReliability: 0.5,
         categoryBaseRate
       };

       const score = calculateRiskScore(basis);
       res.json({ simulatedScore: score, basis });
    } catch(err) {
       console.error(err);
       res.status(500).json({error: "Simulation failed"});
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
