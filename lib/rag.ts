import { Pinecone } from "@pinecone-database/pinecone";

/**
 * Retrieves the top hospital-guideline chunks relevant to a query from Pinecone,
 * using the same integrated-inference embedding the plan pipeline uses. Returns an
 * empty string when Pinecone is not configured so callers can degrade gracefully.
 */
export async function getContext(query: string, surgeryType?: string): Promise<string> {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey || !indexName) return "";

  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.Index(indexName);

  const embedding = await pinecone.inference.embed("nvidia-llama-text-embed-v2", [query], {
    inputType: "query",
  });
  const vector = (embedding as unknown as Array<{ values?: number[] }>)[0]?.values;
  if (!vector) return "";

  const result = await index.query({
    vector,
    topK: 3,
    includeMetadata: true,
    ...(surgeryType ? { filter: { surgeryType: { $eq: surgeryType } } } : {}),
  });

  return (result.matches ?? [])
    .map((match) => (match.metadata as { text?: string } | undefined)?.text ?? "")
    .filter(Boolean)
    .join("\n\n");
}
