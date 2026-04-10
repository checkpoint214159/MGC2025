import { semanticSearch, buildMetadataFilter } from "@/lib/rag/service";

export const ragTools = [
  {
    name: "search_guidelines",
    description:
      "Semantic search over hospital guidelines, clinical best practices, and medical literature " +
      "indexed in the Pinecone vector store. Returns ranked passages relevant to the query.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language search query (e.g. 'post-operative colostomy wound care')",
        },
        surgeryType: {
          type: "string",
          description:
            "Optional filter by surgery/treatment type (e.g. 'colostomy'). " +
            "Matches the 'surgeryType' metadata field on indexed documents.",
        },
        topK: {
          type: "number",
          description: "Number of results to return. Defaults to 5.",
        },
        rerank: {
          type: "boolean",
          description:
            "Whether to apply cross-encoder reranking for higher precision. Defaults to true.",
        },
      },
      required: ["query"],
    },
    handler: async (args: {
      query: string;
      surgeryType?: string;
      topK?: number;
      rerank?: boolean;
    }) => {
      const filter = args.surgeryType
        ? buildMetadataFilter("surgeryType", "$eq", args.surgeryType)
        : undefined;

      const response = await semanticSearch(
        args.query,
        args.topK ?? 5,
        filter,
        undefined,
        args.rerank ?? true,
      );

      return {
        results: response.results.map((r) => ({
          id: r.id,
          text: r.text,
          score: r.score,
          metadata: r.metadata ?? {},
        })),
        totalCount: response.totalCount,
        searchType: response.searchType,
        executionTime: response.executionTime,
      };
    },
  },
];
