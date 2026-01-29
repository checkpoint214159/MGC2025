import { State } from "../schemas/state";
import { External } from "@/lib/external/schemas/external";
import { generateModule } from "@/lib/state/services/modules";


export async function LLMGenerateState2(
  in_state: State | null, 
  x: External, 
  userId: string 
) {
  const transcripts = x.threadContext.map(thread => {
  const msgs = thread.messages?.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n") || "No messages";
    return `### Thread: ${thread.title || 'General'}\n${msgs}`;
  }).join("\n\n---\n\n");

  const profile = x.profile

  // Define which modules you want to generate this turn
  const modulesToGenerate = ['exercise', 'nutrition'];

  // const systemPrompt = `ROLE: Senior Clinical Rehabilitation Specialist.
  // TASK: Generate a "Recovery Blueprint" JSON object following the provided schema.

  // STRICT SCHEMA RULES:
  // - You must output exactly two keys: "exercise" and "nutrition".
  // - For the "type" field inside each, use exactly "exercise" or "nutrition".
  // - If the user should rest, provide a low-intensity/rest-day "exercise" plan.
  // - Do NOT wrap the result in any extra keys like "recovery_plan" or "modules".
  // - No IDs or timestamps.

  // CLINICAL LOGIC:
  // - Analyze the provided Evidence Log for pain, surgery type, and mobility.
  // - If pain is mentioned, adjust exercise intensity down.
  // - If post-surgery, set high-protein nutrition goals.
  // `;

  const results = await Promise.all(
    modulesToGenerate.map(async (key) => {
      const result = await generateModule(
        key, 
        profile,
        transcripts, 
        in_state?.modules?.[key]
      );
      return { [key]: result };
    })
  );

  // Merge the array of objects into a single state object
  return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
}