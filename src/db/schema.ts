import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  name: text("name"),
  email: text("email").notNull(),
  onboardingPriors: jsonb("onboarding_priors"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commitments = pgTable("commitments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  dueAt: timestamp("due_at").notNull(),
  estHours: numeric("est_hours").notNull(),
  stakesInr: numeric("stakes_inr"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const completionHistory = pgTable("completion_history", {
  id: serial("id").primaryKey(),
  commitmentId: integer("commitment_id")
    .references(() => commitments.id)
    .notNull(),
  completedAt: timestamp("completed_at"),
  wasOnTime: boolean("was_on_time"),
});

export const riskScores = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  commitmentId: integer("commitment_id")
    .references(() => commitments.id)
    .notNull(),
  score: numeric("score").notNull(),
  basis: jsonb("basis"),
  computedAt: timestamp("computed_at").defaultNow(),
});

export const recoveryPlans = pgTable("recovery_plans", {
  id: serial("id").primaryKey(),
  commitmentId: integer("commitment_id")
    .references(() => commitments.id)
    .notNull(),
  content: text("content").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  commitments: many(commitments),
}));

export const commitmentsRelations = relations(commitments, ({ one, many }) => ({
  author: one(users, {
    fields: [commitments.userId],
    references: [users.id],
  }),
  completionHistory: many(completionHistory),
  riskScores: many(riskScores),
  recoveryPlans: many(recoveryPlans),
}));
