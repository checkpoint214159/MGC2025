import { getModel } from '@/lib/llm/model';
import { getModuleBlueprint } from '@/lib/state/services/mapping';
import { generateWithRetry } from '@/lib/llm/utils';

export async function generateModule(
  moduleKey: string,
  profile: string,
  transcripts: any,
  prevState: any
) {
  const {schema, systemPrompt} = getModuleBlueprint(moduleKey, profile)
  
  // console.log('systemPrompt???', systemPrompt)
  // console.log('schema??', schema)
  // console.log('prompt??', `
  //     PREVIOUS STATE: ${prevState ? JSON.stringify(prevState) : "No previous state. This is a fresh start."}
  //     USER PROFILE: ${profile}
  //     EVIDENCE LOG (Snapshot):
  //     ${transcripts}`)
  const output = await generateWithRetry({
    model: getModel(),
    schema: schema,
    system: systemPrompt,
    prompt: `
      PREVIOUS STATE: ${prevState ? JSON.stringify(prevState) : "No previous state. This is a fresh start."}
      USER PROFILE: ${profile}
      EVIDENCE LOG (Snapshot):
      ${transcripts}`,
  });
  // console.log('SUCCESSFUL GENERATION FOR MODULE', moduleKey)
  // console.log('output?', output)
  return output;
}