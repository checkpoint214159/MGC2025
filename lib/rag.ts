import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

// Connect to the specific index
function getPineconeClient() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        throw new Error("PINECONE_API_KEY is not set");
    }
    return new Pinecone({ apiKey });
}

// Retrieve relevant chunks based on query and metadata filter
export async function getContext(query: string, surgeryType?: string) {
    const indexName = process.env.PINECONE_INDEX;
    if (!indexName) {
        throw new Error("PINECONE_INDEX is not set");
    }

    const pinecone = getPineconeClient();
    const index = pinecone.Index(indexName);

    const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({
            modelName: "text-embedding-3-small", // Dimensions: 1536
        }),
        { pineconeIndex: index }
    );

    // Perform similarity search with optional metadata filtering
    // We want finding relevant advice to be strictly filtered by surgery type if possible
    // so we don't give ACL advice to a Shoulder patient.
    const filter = surgeryType ? { surgeryType: { $eq: surgeryType } } : undefined;

    const results = await vectorStore.similaritySearch(query, 3, filter);

    return results.map((doc) => doc.pageContent).join("\n\n");
}
