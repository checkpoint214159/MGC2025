import { Pinecone } from "@pinecone-database/pinecone";
import { RAGResponse,
  RAGResult,
  RAGConfig,
  MetadataFilter } from "@/lib/rag/schemas/rag";
import { getEnvNamespace, getIndex, getPineconeClient } from "./client";

function getRAGConfig(): RAGConfig {
  return {
    searchType: (process.env.RAG_SEARCH_TYPE as any) || "hybrid",
    topK: parseInt(process.env.RAG_TOP_K || "10"),
    alpha: parseFloat(process.env.RAG_ALPHA || "0.75"),
    enableReranking: process.env.RAG_ENABLE_RERANKING === "true",
    rerankerModel: process.env.RAG_RERANKER_MODEL || "bge-reranker-v2-m3",
    rerankerTopN: parseInt(process.env.RAG_RERANKER_TOP_N || "5"),
    rerankingMode: (process.env.RAG_RERANKING_MODE as any) || "standalone",
    devMode: process.env.RAG_DEV_MODE === "true" || process.env.NODE_ENV === "development",
  };
}

function logDev(message: string, data?: unknown) {
  if (getRAGConfig().devMode) {
    // TODO: insufficient logging for production
    console.log(`[RAG Dev] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
}


// ============================================================================
// METADATA FILTERING
// ============================================================================

export function buildMetadataFilter(
  field: string,
  operator: string,
  value: any
): MetadataFilter {
  const validOperators = ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists"];

  if (!validOperators.includes(operator)) {
    throw new Error(
      `Invalid operator: ${operator}. Valid operators are: ${validOperators.join(", ")}`
    );
  }

  return {
    [field]: {
      [operator]: value,
    },
  };
}

export async function semanticSearch(
  query: string,
  topK?: number,
  filter?: MetadataFilter,
  namespace?: string,
  rerank?: boolean,
): Promise<RAGResponse> {
  const startTime = Date.now();
  const config = getRAGConfig();
  const _topK = topK ?? config.topK;
  const _namespace = namespace ?? getEnvNamespace();
  const doRerank = rerank ?? true;

  try {
    logDev("Semantic Search", {
      query,
      topK: _topK,
      filter,
      namespace: _namespace,
      rerank: doRerank
    });

    const index = getIndex(namespace);

    const searchResults = await index.searchRecords({
      query: {
        topK: 2,
        inputs: { text: 'Disease prevention' },
      },
      fields: ['text', 'category'],
      ...(doRerank && {
        rerank: {
          model: process.env.RAG_RERANKER_MODEL ?? 'bge-reranker-v2-m3',
          rankFields: ['text'],
          topN: 2,
        }
      })
    });

    const results: RAGResult[] = (searchResults.result?.hits || []).map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      text: hit.fields?.text || hit.fields?.text || "",
      metadata: hit.fields,
    }));

    logDev("Semantic Search Results", { count: results.length, scores: results.map((r) => r.score) });

    return {
      results,
      totalCount: results.length,
      searchType: "semantic",
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("Semantic search error:", error);
    throw new Error(`Semantic search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// // ============================================================================
// // SEARCH: LEXICAL
// // ============================================================================

// export async function lexicalSearch(
//   query: string,
//   topK?: number,
//   filter?: MetadataFilter,
//   namespace?: string
// ): Promise<RAGResponse> {
//   const startTime = Date.now();
//   const config = getRAGConfig();
//   const _topK = topK ?? config.topK;
//   const _namespace = namespace ?? getEnvNamespace();

//   try {
//     logDev("Lexical Search", {
//       query,
//       topK: _topK,
//       filter,
//       namespace: _namespace,
//     });

//     const index = getIndex();

//     // Use integrated embedding for sparse vector search
//     const searchResults = await index.search({
//       namespace: _namespace,
//       query: {
//         inputs: { text: query },
//         top_k: _topK,
//         filter: filter,
//       },
//       fields: ["surgeryType", "text", "text"],
//     });

//     const results: RAGResult[] = (searchResults.result?.hits || []).map((hit: any) => ({
//       id: hit._id,
//       score: hit._score,
//       text: hit.fields?.text || hit.fields?.text || "",
//       metadata: hit.fields,
//     }));

//     logDev("Lexical Search Results", { count: results.length, scores: results.map((r) => r.score) });

//     return {
//       results,
//       totalCount: results.length,
//       searchType: "lexical",
//       executionTime: Date.now() - startTime,
//     };
//   } catch (error) {
//     console.error("Lexical search error:", error);
//     throw new Error(`Lexical search failed: ${error instanceof Error ? error.message : String(error)}`);
//   }
// }

// // ============================================================================
// // SEARCH: HYBRID
// // ============================================================================

// function mergeAndDeduplicateResults(
//   semanticResults: RAGResult[],
//   lexicalResults: RAGResult[],
//   alpha: number
// ): RAGResult[] {
//   // Create map for deduplication
//   const resultsMap = new Map<string, RAGResult>();

//   // Normalize scores (lexical can be much higher than semantic)
//   const semanticScores = semanticResults.map((r) => r.score);
//   const lexicalScores = lexicalResults.map((r) => r.score);

//   const semanticMax = Math.max(...semanticScores, 1);
//   const lexicalMax = Math.max(...lexicalScores, 1);

//   // Add semantic results
//   semanticResults.forEach((result) => {
//     const normalizedScore = (result.score / semanticMax) * alpha;
//     resultsMap.set(result.id, {
//       ...result,
//       score: normalizedScore,
//     });
//   });

//   // Add/merge lexical results
//   lexicalResults.forEach((result) => {
//     const normalizedScore = (result.score / lexicalMax) * (1 - alpha);
//     const existing = resultsMap.get(result.id);

//     if (existing) {
//       // Combine scores for duplicate results
//       existing.score += normalizedScore;
//     } else {
//       resultsMap.set(result.id, {
//         ...result,
//         score: normalizedScore,
//       });
//     }
//   });

//   // Sort by combined score descending
//   return Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
// }

// export async function hybridSearch(
//   query: string,
//   topK?: number,
//   alpha?: number,
//   filter?: MetadataFilter,
//   namespace?: string
// ): Promise<RAGResponse> {
//   const startTime = Date.now();
//   const config = getRAGConfig();
//   const _topK = topK ?? config.topK;
//   const _alpha = alpha ?? config.alpha;
//   const _namespace = namespace ?? getEnvNamespace();

//   if (_alpha < 0 || _alpha > 1) {
//     throw new Error("alpha must be between 0 and 1");
//   }

//   try {
//     logDev("Hybrid Search", {
//       query,
//       topK: _topK,
//       alpha: _alpha,
//       filter,
//       namespace: _namespace,
//     });

//     // Execute semantic and lexical searches in parallel
//     const [semanticResponse, lexicalResponse] = await Promise.all([
//       semanticSearch(query, _topK * 2, filter, _namespace), // Get more results for better merging
//       lexicalSearch(query, _topK * 2, filter, _namespace),
//     ]);

//     const merged = mergeAndDeduplicateResults(
//       semanticResponse.results,
//       lexicalResponse.results,
//       _alpha
//     );

//     // Trim to requested topK
//     const results = merged.slice(0, _topK);

//     logDev("Hybrid Search Results", { count: results.length, scores: results.map((r) => r.score) });

//     return {
//       results,
//       totalCount: results.length,
//       searchType: "hybrid",
//       executionTime: Date.now() - startTime,
//     };
//   } catch (error) {
//     console.error("Hybrid search error:", error);
//     throw new Error(
//       `Hybrid search failed: ${error instanceof Error ? error.message : String(error)}`
//     );
//   }
// }

// ============================================================================
// RERANKING
// ============================================================================

// export async function standaloneRerank(
//   query: string,
//   documents: Array<{ id: string; text: string }>,
//   rerankerModel?: string,
//   topN?: number
// ): Promise<RAGResult[]> {
//   const config = getRAGConfig();
//   const _model = rerankerModel ?? config.rerankerModel;
//   const _topN = topN ?? config.rerankerTopN;

//   try {
//     logDev("Standalone Reranking", {
//       query,
//       documentCount: documents.length,
//       model: _model,
//       topN: _topN,
//     });

//     const client = getPineconeClient();

//     const rerankResult = await client.inference.rerank({
//       model: _model as any,
//       query: query,
//       documents: documents.map((doc) => ({
//         id: doc.id,
//         text: doc.text,
//       })),
//       top_n: _topN,
//       rank_fields: ["text"],
//       return_documents: true,
//       parameters: {
//         truncate: "END",
//       },
//     });

//     const results: RAGResult[] = (rerankResult.data || []).map((item: any) => ({
//       id: item.document.id,
//       score: item.score,
//       text: item.document.text,
//       rerankScore: item.score,
//     }));

//     logDev("Reranking Results", { count: results.length, scores: results.map((r) => r.rerankScore) });

//     return results;
//   } catch (error) {
//     console.error("Reranking error:", error);
//     throw new Error(
//       `Reranking failed: ${error instanceof Error ? error.message : String(error)}`
//     );
//   }
// }

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Legacy function for retrieving context. Combines semantic search with metadata filtering.
 * @deprecated Use semanticSearch, lexicalSearch, or hybridSearch instead
 */
export async function getContext(query: string, surgeryType?: string): Promise<string> {
  const filter = surgeryType ? buildMetadataFilter("surgeryType", "$eq", surgeryType) : undefined;

  const response = await semanticSearch(query, 3, filter);

  return response.results.map((result) => result.text).join("\n\n");
}
