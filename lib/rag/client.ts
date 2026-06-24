import { Pinecone } from "@pinecone-database/pinecone";
import {
    RAGResponse,
    RAGResult,
    RAGConfig,
    MetadataFilter,
} from "@/lib/rag/schemas/rag";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
    if (!pineconeClient) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) {
            throw new Error(
                "PINECONE_API_KEY environment variable is not set. Please configure it in .env.local",
            );
        }
        pineconeClient = new Pinecone({ apiKey });
    }
    return pineconeClient;
}

export function getIndex(namespace?: string) {
    const indexName = process.env.PINECONE_INDEX;
    if (!indexName) {
        throw new Error(
            "PINECONE_INDEX environment variable is not set. Please configure it in .env.local",
        );
    }
    if (!namespace) {
        namespace = getEnvNamespace();
    }
    const client = getPineconeClient();
    return client.Index(indexName).namespace(namespace);
}

export function getEnvNamespace(): string {
    return process.env.RAG_NAMESPACE || "__default__";
}
