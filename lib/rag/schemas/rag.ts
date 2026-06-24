export interface RAGResult {
    id: string;
    score: number;
    text: string;
    metadata?: Record<string, unknown>;
    rerankScore?: number;
}

export interface RAGResponse {
    results: RAGResult[];
    totalCount: number;
    searchType: string;
    executionTime?: number;
    reranked?: boolean;
}

export type MetadataFilter = Record<string, unknown>;

export interface RAGConfig {
    searchType: "semantic" | "lexical" | "hybrid";
    topK: number;
    alpha: number; // For hybrid: blend weight (0=sparse only, 1=dense only)
    enableReranking: boolean;
    rerankerModel: string;
    rerankerTopN: number;
    rerankingMode: "integrated" | "standalone";
    devMode: boolean;
}
