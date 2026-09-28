import { z } from "zod";
import { sessionSchema } from "./schemas.js";
const text = z.string().max(18000);
const pair = z.tuple([text, text]);
const count = z.number().finite().min(0).max(1000000);
const check = z.object({
  id: text,
  label: pair,
  hint: pair,
  found: z.boolean(),
  quote: text,
});
const topic = z.object({
  id: text,
  name: pair,
  checks: z.array(check).max(10),
  points: count,
  found: z.boolean(),
  label: text,
  quote: text,
  status: text,
});
const question = z.object({
  id: text,
  topicId: text,
  text,
  checks: z.array(text).max(10),
  speakerIndex: count,
  followUp: z.boolean().optional(),
  parentId: text.optional(),
});
export const historySchema = z
  .object({
    id: z.union([text, z.number().finite()]),
    date: text.refine((v) => Number.isFinite(Date.parse(v))),
    startup: z.string().max(60),
    arenaId: text,
    arena: text.optional(),
    region: text.optional(),
    score: z.number().min(0).max(100),
    xp: z.number().min(0).max(500).optional(),
    duration: count.default(0),
    pitchDuration: count.optional(),
    pitchLimit: count.optional(),
    ask: z.number().finite().min(0).max(1e10).optional(),
    stars: z.number().int().min(1).max(3).optional(),
    questions: z.array(text).max(20),
    answers: z.array(text).max(20),
    pitchTranscript: text.optional(),
    scoringVersion: z.number().int().min(1).max(3).optional(),
    coverage: count.optional(),
    evidence: count.optional(),
    words: count.optional(),
    numericEvidence: z.array(text).max(20).optional(),
    questionPlan: z.array(question).max(6).optional(),
    analysis: z
      .object({
        version: count,
        words: count,
        topics: z.array(topic).length(5),
        score: count,
        metrics: z.array(text).max(100),
        excerpt: text,
      })
      .optional(),
    dimensions: z
      .array(
        z.object({
          id: text,
          name: pair,
          pitchPoints: count,
          answerPoints: count,
          points: count,
        }),
      )
      .length(5)
      .optional(),
    answerReports: z
      .array(
        z.object({
          questionId: text,
          topicId: text,
          checks: z.array(check).max(10),
          points: count,
          quote: text,
        }),
      )
      .max(6)
      .optional(),
    nextGoal: sessionSchema.shape.practiceGoal.optional(),
    practiceGoal: sessionSchema.shape.practiceGoal.optional(),
    newMedals: z
      .array(
        z.object({
          id: text,
          name: pair,
          icon: text,
          earned: z.boolean().optional(),
          description: pair.optional(),
        }),
      )
      .max(20)
      .optional(),
  })
  .superRefine((r, ctx) => {
    if (
      r.scoringVersion === 3 &&
      (!r.analysis || !r.dimensions || !r.answerReports || !r.nextGoal)
    )
      ctx.addIssue({ code: "custom", message: "Missing version 3 feedback" });
  });
