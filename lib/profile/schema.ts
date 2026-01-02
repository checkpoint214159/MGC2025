import { z } from "zod";


export const ProfileSchema = z.object({
  age: z.coerce.number().min(0).max(120),
  sex: z.enum(["Male", "Female", "Other"]),
  treatment: z.string().min(3),
  profile: z.string().optional(),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

