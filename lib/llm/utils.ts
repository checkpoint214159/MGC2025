import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { generateObject } from 'ai';

export async function generateWithRetry<T>(options: {
  model: any;
  schema: any;
  prompt: string;
  system: string;
  maxRetries?: number;
}): Promise<T> {
  let lastError = "";
  let lastOutput = "";

  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    // try {
      const { object } = await generateObject({
        model: options.model,
        schema: options.schema,
        system: options.system,
        prompt: attempt === 1 
          ? options.prompt 
          : `${options.prompt}\n\nATTEMPT ${attempt} FAILED.\nError: ${lastError}\nLast Output: ${lastOutput}\nPlease fix the JSON structure and ensure all fields (especially 'data') are filled.`,
        // providerOptions: {
        //   anthropic: {
        //     effort: "high" // Forces Claude to work harder on complex JSON
        //   }
        // }
      });
      return object as T;

    // } catch (error) {
    //   if (NoObjectGeneratedError.isInstance(error)) {
    //     lastError = error.message;
    //     lastOutput = error.text || "Empty output";
    //   } else {
    //     lastError = String(error);
    //   }
    //   console.log('lastError?', lastError)
    //   if (attempt === options.maxRetries) throw error;
    //   console.warn(`Attempt ${attempt} failed with error ${error}, retrying...`);
    // }
  }
  throw new Error("Retry logic exhausted");
}