import { Nut } from 'lucide-react';
import { z } from 'zod';

const NutrientSchema = z.object({
  target: z.number(),
  unit: z.string(),
  label: z.string(),
});

const NutritionModuleSchema = z.object({
  title: z.string(),
  goalCalories: z.number(),
  // Global Daily Targets
  targets: z.object({
    macros: z.record(z.string(), NutrientSchema),
    micros: z.array(z.object({
      name: z.string(),
      target: z.number(),
      unit: z.string(),
      importance: z.string(),
    })),
  }),
  // The Checklist items now include their own nutritional weight
  checklists: z.array(z.object({
    id: z.string(),
    name: z.string(),
    calories: z.number(),
    macros: z.object({
      protein: z.number().default(0),
      carbs: z.number().default(0),
      fats: z.number().default(0),
    }).optional(),
    micros: z.array(z.object({
      name: z.string(),
      value: z.number(),
      unit: z.string(),
    })).optional(),
  })),
}).optional();


const ExerciseSchema = z.object({
    summary: z.string(),
    tasks: z.array(z.object({
    id: z.string(),
    props: z.object({
        name: z.string(),
        reps: z.string(),
        precaution: z.string(),
        intensity: z.enum(["blue", "orange", "red"]),
    })
    }))
}).optional();

export {NutrientSchema, NutritionModuleSchema, ExerciseSchema}