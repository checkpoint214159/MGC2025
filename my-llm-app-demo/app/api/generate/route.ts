import { generateObject } from 'ai';
import { z } from 'zod';
import { NutritionModuleSchema, ExerciseSchema } from './schema';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";


const EXAMPLE_WIDGET_OUTPUT = {
  "modules": {
    "exercise": {
      "summary": "Focus on circulation and light respiratory recovery.",
      "tasks": [
        {
          "id": "ex-1",
          "props": {
            "name": "Ankle Pumps",
            "reps": "2 sets of 15",
            "frequency": "Every hour while awake",
            "precaution": "Avoid if you feel sharp calf pain.",
            "intensity": "blue"
          }
        },
        {
          "id": "ex-2",
          "props": {
            "name": "Diaphragmatic Breathing",
            "reps": "10 deep breaths",
            "frequency": "5 times per day",
            "precaution": "Stop if you feel lightheaded.",
            "intensity": "blue"
          }
        },
        {
          "id": "ex-3",
          "props": {
            "name": "Assisted Hallway Walk",
            "reps": "5 minutes",
            "frequency": "2 times per day",
            "precaution": "Must have a caregiver present.",
            "intensity": "orange"
          }
        }
      ]
    },
    "nutrition": {
      "title": "Clear Liquid & Soft Food Transition",
      "goalCalories": 1800,
      "macros": {
        "protein": { "target": 80, "unit": "g", "label": "Protein" },
        "carbs": { "target": 200, "unit": "g", "label": "Carbs" },
        "fats": { "target": 50, "unit": "g", "label": "Fats" }
      },
      "micros": [
        { "name": "Sodium", "target": 3000, "unit": "mg", "importance": "Fluid balance" },
        { "name": "Potassium", "target": 2500, "unit": "mg", "importance": "Muscle function" }
      ],
      "checklists": [
        { "id": "nut-1", "name": "Electrolyte Drink (500ml)", "calories": 50 },
        { "id": "nut-2", "name": "Protein Shake", "calories": 250 },
        { "id": "nut-3", "name": "Greek Yogurt (Plain)", "calories": 120 }
      ]
    },
    "symptoms": {
      "emergencyProtocol": "Call your surgeon immediately if fever exceeds 38.5°C or if you notice heavy bleeding.",
      "dailyChecks": [
        { "id": "sym-1", "label": "Is the incision site red or leaking?", "critical": true },
        { "id": "sym-2", "label": "Have you had a bowel movement today?", "critical": false },
        { "id": "sym-3", "label": "Rate your pain from 1-10", "critical": false }
      ]
    }
  }
}

const schema = z.object({
  modules: z.object({
    exercise: ExerciseSchema,

    nutrition: NutritionModuleSchema,

    symptoms: z.object({
      dailyChecks: z.array(z.object({
        id: z.string(),
        label: z.string(),
        critical: z.boolean()
      })),
      emergencyProtocol: z.string()
    }).optional()
  })
});


export async function POST(req: Request) {
    /**
     * Generates information for our dashboard for users
     * Should add additional hooks for medical professionals to review or input information
     * 
     */
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { age, sex, treatment } = await req.json();  // use next time for llm output

    const systemPrompt = `
        You are a medical recovery expert. Based on the patient's data, 
        select exactly 2-3 recovery widgets from the available list.
        
        Available Widget Types:
        - EXERCISE_TRACKER: For physical movements or PT.
        - NUTRITION_PLAN: For dietary restrictions.
        - SYMPTOM_CHECKER: For tracking pain or red flags.

        For NUTRITION_PLAN widgets, prioritize High-Protein targets (1.5g/kg) and Low-Residue diet items.
        Structure macros as a dictionary and micros as an array of electrolyte goals.

        Return ONLY the JSON structure.
    `;

//   const { object } = await generateObject({
//             model: "deepseek/deepseek-v3.2", // Use the same string as your chat
//             system: systemPrompt,
//             prompt: `Patient: ${age}yo ${sex}, Surgery: ${treatment}`,
//             schema: z.object({
//                 widgets: z.array(
//                     z.object({
//                         id: z.string(),
//                         type: z.enum(["EXERCISE_TRACKER", "NUTRITION_PLAN", "SYMPTOM_CHECKER"]),
//                         props: z.object({
//                             name: z.string(),
//                             goal: z.string(),
//                             reps: z.string().optional(),
//                             precaution: z.string(),
//                             intensityColor: z.enum(["blue", "orange", "red"]),
//                         }),
//                     })
//                 ),
//             }),
//         });



  // Here you would: 
  await prisma.user.update({
    where: { id: userId },
    data: { 
      treatment: treatment,
      dashboardConfig: EXAMPLE_WIDGET_OUTPUT,
   }
  })
  
  return Response.json(EXAMPLE_WIDGET_OUTPUT);
}