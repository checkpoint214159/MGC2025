import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";


const EXAMPLE_WIDGET_OUTPUT = {
  "widgets": [
    {
      "id": "ex-1",
      "type": "EXERCISE_TRACKER",
      "props": {
        "name": "Ankle Pumps",
        "goal": "Perform 20 repetitions to promote blood flow",
        "reps": "2 sets of 10",
        "precaution": "Avoid if you feel sharp pain in the calf area",
        "intensityColor": "blue"
      }
    },
    {
      "id": "ex-2",
      "type": "EXERCISE_TRACKER",
      "props": {
        "name": "Quad Sets",
        "goal": "Strengthen thigh muscles without moving the joint",
        "reps": "10 holds (5 sec each)",
        "precaution": "Keep the small of your back pressed against the bed",
        "intensityColor": "orange"
      }
    },
    {
      "id": "nut-1",
      "type": "NUTRITION_PLAN",
      "props": {
        "name": "Low-Residue Diet",
        "goal": "Reduce bowel activity to allow internal healing",
        "precaution": "Avoid whole grains, raw fruits, and seeds",
        "intensityColor": "orange"
      }
    },
    {
      "id": "nut-2",
      "type": "NUTRITION_PLAN",
      "props": {
        "name": "Hydration Protocol",
        "goal": "Drink 2.5 Liters of water with electrolytes daily",
        "precaution": "Limit caffeine as it may cause dehydration",
        "intensityColor": "blue"
      }
    },
    {
      "id": "sym-1",
      "type": "SYMPTOM_CHECKER",
      "props": {
        "name": "Incision Site Check",
        "goal": "Monitor for redness, swelling, or unusual discharge",
        "precaution": "Contact doctor if temperature exceeds 38°C",
        "intensityColor": "red"
      }
    },
    {
      "id": "sym-2",
      "type": "SYMPTOM_CHECKER",
      "props": {
        "name": "Pain Management Log",
        "goal": "Track effectiveness of prescribed analgesics",
        "precaution": "Do not exceed maximum daily dosage of paracetamol",
        "intensityColor": "orange"
      }
    }
  ]
}

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