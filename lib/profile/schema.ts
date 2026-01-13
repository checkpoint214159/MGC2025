import { z } from "zod";
import { ThreadSchema } from "@/lib/external/schemas/thread";


// export const ProfileInputSchema = z.object({
//   thread: ThreadSchema,

// });

export const BiometricsSchema = z.object({
  age: z.coerce.number().min(0).max(120),
  sex: z.enum(["Male", "Female", "Other"]),
  treatment: z.string().min(2, "Please specify your surgery/treatment"),
  surgeryDate: z.coerce.date(),
  weightKg: z.coerce.number().optional(),
  heightCm: z.coerce.number().optional(),
});

export const BaselineSchema = z.object({
  painLevel: z.number().min(0).max(10), // 0-10 scale
  mobilityScore: z.number().min(1).max(5), // 1: Bedbound, 5: Fully Mobile
  breathingDifficulty: z.boolean(),
  adlScore: z.number().min(1).max(5), // Activities of Daily Living (eating, dressing)
  initialNotes: z.string().optional(),
});

export type Biometrics = z.infer<typeof BiometricsSchema>;
export type Baseline = z.infer<typeof BaselineSchema>;

// export type ProfileInput = z.infer<typeof ProfileSchema>;

