import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateRecoveryPlan(
  commitment: any,
  riskScore: number,
  basis: any,
) {
  const prompt = `
You are Oracle, an AI productivity assistant. A user has a commitment that is at risk of failing.
Commitment: ${commitment.title}
Category: ${commitment.category}
Estimated Hours Needed: ${commitment.estHours}
Due Date: ${new Date(commitment.dueAt).toLocaleString()}
Current Risk Score: ${(riskScore * 100).toFixed(0)}%

Risk Factors:
- Time Pressure: ${basis.timePressure.toFixed(2)}
- Load Conflict: ${basis.loadConflict.toFixed(2)}
- Personal Reliability: ${basis.personalReliability.toFixed(2)}
- Category Base Rate: ${basis.categoryBaseRate.toFixed(2)}

Provide a short, actionable recovery plan (3 bullet points max) explaining why the risk is high and what exact steps they should take today to lower this risk. Keep it practical, under 60 words, and emphasize the specific factor driving the risk. Do not use generic advice.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Could not generate recovery plan.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating recovery plan. Please try again later.";
  }
}
