import {
    generateText,
    Output,
    NoObjectGeneratedError,
    jsonSchema,
    zodSchema,
    type Schema,
} from "ai";
import { generateObject } from "ai";
import type { ZodType } from "zod";

/**
 * Make a Zod schema safe for Anthropic's structured-output mode.
 *
 * Anthropic's constrained decoding supports only a subset of JSON Schema. Zod emits
 * several keywords it rejects, each surfacing as a 400 like
 *   "output_config.format.schema: For '<type>' type, property '<kw>' is not supported".
 * Seen so far: `propertyNames` (from z.record/.catchall) and `minimum`/`maximum`
 * (from z.number().min()/.max()). We strip the whole unsupported set (recursively) from
 * the schema sent to the provider; the original Zod schema still validates the model's
 * output, so the constraints are enforced post-hoc rather than during decoding.
 */
const UNSUPPORTED_SCHEMA_KEYS = new Set([
    "propertyNames",
    "minProperties",
    "maxProperties",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minItems",
    "maxItems",
    "uniqueItems",
]);

function stripUnsupportedKeywords(node: any): any {
    if (Array.isArray(node)) return node.map(stripUnsupportedKeywords);
    if (node && typeof node === "object") {
        const out: Record<string, any> = {};
        for (const [key, value] of Object.entries(node)) {
            if (UNSUPPORTED_SCHEMA_KEYS.has(key)) continue;
            out[key] = stripUnsupportedKeywords(value);
        }
        return out;
    }
    return node;
}

export function anthropicSafeSchema<T>(schema: ZodType<T>): Schema<T> {
    const cleaned = stripUnsupportedKeywords(zodSchema(schema).jsonSchema);
    return jsonSchema<T>(cleaned, {
        validate: (value) => {
            const result = schema.safeParse(value);
            return result.success
                ? { success: true, value: result.data }
                : { success: false, error: result.error };
        },
    });
}

export async function generateWithRetry<T>(options: {
    model: any;
    schema: any;
    prompt: string;
    system: string;
    maxRetries?: number;
}): Promise<T> {
    let lastError = "";
    let lastOutput = "";

    for (let attempt = 1; attempt <= (options.maxRetries || 1); attempt++) {
        // try {
        const { object } = await generateObject({
            model: options.model,
            schema: options.schema,
            system: options.system,
            prompt:
                attempt === 1
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
