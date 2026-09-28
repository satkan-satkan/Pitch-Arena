import { z } from "zod";
export const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(60).optional(),
});
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  startup: z.string().trim().min(1).max(60),
  industry: z.string().max(60),
  bio: z.string().max(1000),
});
export const projectSchema = z.object({
  name: z.string().trim().min(1).max(60),
  industry: z.string().max(60).default(""),
  description: z.string().max(1000).default(""),
});
export const sessionSchema = z.object({
  projectId: z.uuid(),
  arenaId: z.string(),
  personaId: z.string().optional(),
  ask: z.number().finite().min(1).max(1e10),
  pitchSeconds: z.number().int().min(30).max(600),
  language: z.enum(["ru", "en"]),
  spokenQuestions: z.boolean().default(true),
  useAI: z.boolean().default(false),
  practiceGoal: z
    .object({
      topicId: z.string(),
      criterionId: z.string().optional(),
      source: z.enum(["pitch", "answer"]).optional(),
      title: z.tuple([z.string(), z.string()]),
      instruction: z.tuple([z.string(), z.string()]),
      quote: z.string(),
    })
    .nullable()
    .optional(),
});
export const draftSchema = z.object({
  phase: z.enum(["ready", "pitch", "review", "analysis", "qa"]),
  pitch: z.string().max(12000),
  answer: z.string().max(12000),
  slide: z.number().int().min(0).max(19),
  voiceEnabled: z.boolean(),
  pitchDuration: z.number().min(0).max(600).optional(),
});
export const answerSchema = z.object({
  step: z.number().int().min(0).max(5),
  answer: z.string().trim().min(1).max(12000),
});
