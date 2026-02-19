import { State } from "../schemas/state";
import { External } from "@/lib/external/schemas/external";
import { generateModule } from "@/lib/state/services/modules";


export async function LLMGenerateState(
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

  const results = await Promise.all(
    modulesToGenerate.map(async (key) => {
const specificModuleData = in_state?.modules?.find(m => m.type === key);

    const result = await generateModule(
      key, 
      profile,
      transcripts, 
      specificModuleData
    );
    return { [key]: result };
    })
  );

  // Merge the array of objects into a single state object
  return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
}