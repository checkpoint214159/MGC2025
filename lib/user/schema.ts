import { z } from "zod";


export const BiometricsSchema = z.object({
  age: z.coerce.number().min(0).max(120),
  sex: z.enum(["Male", "Female", "Other"]),
  treatment: z.string().min(2, "Please specify your surgery/treatment"),
  surgeryDate: z.coerce.date(),
});

// export const BaselineSchema = z.object({
//   height: z.coerce.number().positive("Height is required"),
//   weight: z.coerce.number().positive("Weight is required"),
//   assessedAt: z.coerce.date().default(() => new Date()),
//   assessmentType: z.enum(["pre-op", "initial-consult", "post-op"]).default("pre-op"),

// }).catchall(
//   z.union([z.string(), z.number(), z.boolean()])
// );

export type Biometrics = z.infer<typeof BiometricsSchema>;

