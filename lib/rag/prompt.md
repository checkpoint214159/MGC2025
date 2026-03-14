# RAG Backend Implementation Prompt

## Overview
This prompt guides the implementation of a production-ready RAG (Retrieval-Augmented Generation) backend using Pinecone as the vector database. The implementation should support multiple search strategies, reranking, metadata filtering, and development-mode flexibility for testing different retrieval approaches.

## Core Architecture

### 1. Central Hub: `lib/rag.ts`
`rag.ts` is the single source of truth for ALL Pinecone interactions. No other file should directly instantiate Pinecone clients or call the Pinecone API.

**Responsibilities:**
- Initialize and maintain Pinecone client(s)
- Implement all search/query operations (semantic, lexical, hybrid)
- Handle metadata filtering
- Support reranking operations (integrated and standalone)
- Support parallel queries
- Provide development-mode configuration and utilities
- Handle namespacing and index management
- Error handling and logging

**Key Exports:**
- Core query functions (semantic, lexical, hybrid)
- Reranking utilities (integrated and standalone)
- Configuration/state management for dev mode
- Metadata filtering helpers
- Utility functions for merging/deduplicating results

### 2. Integration Layer: `lib/actions.ts`
Actions serve as the client-facing interface. They wrap `rag.ts` functions in `authenticatedAction()` and validate/transform inputs.

**Responsibilities:**
- Wrap rag.ts query functions in `authenticatedAction()`
- Apply authentication/authorization checks
- Validate and transform client arguments
- Return `{ success, data, error }` format
- Pass through all rag.ts functionality without modification

**Key Exports:**
- `queryRAGAction(query, searchType, options)`
- `rerankedRAGAction(query, searchType, rerankType, options)` (if applicable)
- Other action wrappers as needed

---

## Search Types & Implementation

### 1. Semantic Search
**Purpose:** Find semantically similar content using dense vector embeddings.

**Approach:**
- Uses `text-embedding-3-small` (1536 dimensions) to embed queries and documents
- Measures similarity via cosine distance or dot product
- Best for: meaning-based retrieval, synonyms, conceptual matches

**Requirements in `rag.ts`:**
- Function: `semanticSearch(query: string, topK: number, filter?: MetadataFilter, namespace?: string)`
- Should query the dense index with the query text
- Support optional metadata filtering (e.g., `surgeryType`)
- Return: Array of results with ID, score, metadata, and chunk text
- Include `include_metadata=true` and `include_values=false` (performance optimization)

**Dev Mode Testing:**
- Allow override of `topK` parameter via env variable
- Allow override of embedding model for testing different models
- Filter controls for testing different surgery types

---

### 2. Lexical Search
**Purpose:** Find documents matching exact keywords/terms using sparse vectors.

**Approach:**
- Uses `pinecone-sparse-english-v0` for BM25-style keyword matching
- Exact word/phrase matching independent of word order
- Best for: keyword searches, domain-specific terminology, precise matches

**Requirements in `rag.ts`:**
- Function: `lexicalSearch(query: string, topK: number, filter?: MetadataFilter, namespace?: string)`
- Convert query text to sparse vector 
- Query the sparse index
- Support optional metadata filtering
- Return: Array of results with ID, score, metadata
- Include `include_metadata=true` for consistency

**Dev Mode Testing:**
- Allow override of `topK`
- Allow match_term filtering (required keywords that must be present)
- Filter controls for testing different surgery types

---

### 3. Hybrid Search
**Purpose:** Combine semantic and lexical search for comprehensive retrieval.

**Approach:**
- Execute both semantic and lexical queries in parallel (if supported by current index architecture)
- Merge and deduplicate results by ID
- Support weighted combination (alpha parameter for dense vs. sparse balance)
- Best for: balanced results combining meaning and keywords

**Requirements in `rag.ts`:**
- Function: `hybridSearch(query: string, topK: number, alpha?: number, filter?: MetadataFilter, namespace?: string)`
- Execute semantic and lexical searches in parallel using async
- Merge results deduplicating by ID
- Sort merged results by combined score (can weight with alpha)
- Return: Array of deduplicated results with original scores

**Hybrid Implementation Details:**
- If using **single hybrid index** (recommended):
  - Single query with both dense vector and sparse vector
  - Simpler implementation, less latency
- If using **separate indexes**:
  - Query dense and sparse indexes separately
  - Merge deduplication logic per `hybrid_score_norm` example in docs
  - More flexible but more complex

**Dev Mode:**
- Toggle alpha value via env variable (default 0.75 for semantic-heavy)
- Choose which index architecture is active
- Test different weighting strategies

---

## Optimization Strategies

### 1. Metadata Filtering
**Purpose:** Narrow search results to specific categories (e.g., by surgery type).

**Requirements:**
- Implement metadata filter expression builder
- Support standard operators: `$eq`, `$ne`, `$gt`, `$in`, `$and`, `$or`, `$exists`
- Apply filters to all search types (semantic, lexical, hybrid)
- Example: `{ surgeryType: { $eq: "ACL" } }` to filter by surgery type

**Implementation in `rag.ts`:**
- Helper function: `buildMetadataFilter(field: string, operator: string, value: any): MetadataFilter`
- Validate filter expressions before querying
- Pass filters to all query operations

**Dev Mode:**
- Allow filter override via environment variable
- Ability to toggle filtering on/off for testing

---

### 2. Reranking
**Purpose:** Improve result quality by using a cross-encoder model to score semantic relevance.

**Two Strategies:**
1. **Integrated Reranking:** Part of the search query operation
   - Simpler, fewer requests
   - Query returns top N results, then reranks to top M

2. **Standalone Reranking:** Post-process search results
   - More flexibility (can rerank results from multiple sources)
   - Used for merging/deduplicating hybrid results before ranking

**Available Models:**
- `cohere-rerank-3.5` (Cohere)
- `bge-reranker-v2-m3` (BGE, recommended)
- `pinecone-rerank-v0` (Pinecone)

**Requirements in `rag.ts`:**
- Function: `integratedRerank(query: string, searchType: 'semantic'|'lexical'|'hybrid', topK: number, rerankerModel: string, rerankerTopN: number, filters?: MetadataFilter)`
  - Execute search with integrated reranking
  - Return top N reranked results
  
- Function: `standaloneRerank(query: string, documents: Array<{id, text}>, rerankerModel: string, topN: number)`
  - Rerank a set of documents independently
  - Useful for reranking merged hybrid results
  - Return reranked results with scores

**Dev Mode:**
- Toggle reranking on/off
- Switch between reranking models via env variable
- Adjust topK and topN values
- Test integrated vs. standalone reranking

---

### 3. Parallel Queries
**Purpose:** Execute multiple searches concurrently for faster results.

**Use Cases:**
- Run hybrid search (semantic + lexical in parallel)
- Run multiple semantic searches with different filters
- Compare different search strategies

**Requirements in `rag.ts`:**
- Use `Promise.all()` or similar for concurrent operations
- Handle partial failures gracefully (if one query fails, others complete)
- Merge results appropriately

**Implementation:**
- Already needed for hybrid search (parallel dense + sparse)
- Consider for comparing multiple filter results

---

## Development Mode Configuration

**Purpose:** Allow developers to experiment with different search/reranking strategies without code changes.

**Environment Variables (in `.env.local` or similar):**
```env
# Pinecone Configuration
PINECONE_API_KEY=...
PINECONE_INDEX=...

# Search Configuration
RAG_SEARCH_TYPE=hybrid  # 'semantic', 'lexical', or 'hybrid'
RAG_TOP_K=10            # Number of results to retrieve
RAG_ALPHA=0.75          # Hybrid search weighting (0-1, only for hybrid)
RAG_METADATA_FILTER={}  # JSON filter expression
RAG_FILTER_FIELD=surgeryType
RAG_FILTER_VALUE=ACL

# Reranking Configuration
RAG_ENABLE_RERANKING=true
RAG_RERANKER_MODEL=bge-reranker-v2-m3  # Choose model
RAG_RERANKER_TOP_N=5                     # Results to return after reranking
RAG_RERANKING_MODE=integrated            # 'integrated' or 'standalone'

# Development Mode
NODE_ENV=development  # Already used to enable dev features
RAG_DEV_MODE=true     # Enable development logging and flexibility
```

**Dev Utilities in `rag.ts`:**
- Configuration loader that reads env variables
- Logger that prints queries, filter expressions, and scores in dev mode
- Helper to switch search strategies on-the-fly
- Utility to test different reranking models

---

## Data Contracts & Type Safety

### Input Types (for client-facing actions):
```typescript
interface RAGQueryRequest {
  query: string;
  searchType: 'semantic' | 'lexical' | 'hybrid';
  topK?: number;
  alpha?: number;  // For hybrid: 0-1 weighting
  metadata?: Record<string, unknown>;  // Filter object
  rerank?: {
    enabled: boolean;
    model?: string;  // 'bge-reranker-v2-m3', etc.
    topN?: number;
    mode?: 'integrated' | 'standalone';
  };
  namespace?: string;
}
```

### Output Types (from rag.ts):
```typescript
interface RAGResult {
  id: string;
  score: number;        // Similarity score (0-1 or higher for sparse)
  text: string;         // Chunk content
  metadata?: {
    surgeryType?: string;
    [key: string]: unknown;
  };
  rerankScore?: number; // If reranked, the reranker's score
}

interface RAGResponse {
  results: RAGResult[];
  totalCount: number;
  searchType: string;
  executionTime?: number;  // Dev mode tracing
}
```

---

## Error Handling

**Scenarios to handle in `rag.ts`:**
1. Missing/invalid Pinecone API key → throw error, log clearly
2. Index not found → validate index exists on startup
3. Query timeout → implement timeout with graceful fallback
4. Metadata filter error → validate filter expression before querying
5. Reranking failure → fallback to original search results
6. Network failures → exponential backoff or circuit breaker

**Action-level (`lib/actions.ts`):**
- Catch all errors from rag.ts
- Return `{ success: false, error: message }`
- Log errors for debugging

---

## Testing & Development Workflow

**Manual Testing Checklist:**
1. Test semantic search with sample medical query → verify surgery-type filtered results
2. Test lexical search with keywords → verify exact word matches rank high
3. Test hybrid search → verify results are merged and neither approach dominates alone
4. Test metadata filtering → query same input with and without filter, verify count difference
5. Test reranking → compare results with/without reranking, verify scores improve
6. Test parallel queries → time hybrid search vs. sequential semantic+lexical

**Dev Mode Usage:**
- Set `RAG_DEV_MODE=true` to enable detailed logging
- Adjust `RAG_SEARCH_TYPE` and re-run same query to compare strategies
- Modify `RAG_ALPHA` and test hybrid weighting
- Toggle `RAG_ENABLE_RERANKING` and compare result quality

---

## Current State of `lib/rag.ts`

**Existing Code Issues:**
- Current `getContext()` is a template using deprecated LangChain approach
- Uses `PineconeStore` wrapper (older SDK pattern)
- Does not support multiple search types
- No reranking support
- No metadata filtering flexibility
- No dev mode configuration

**Refactoring Approach:**
- Keep the Pinecone client initialization pattern
- Replace `PineconeStore` with direct `index.search()` and `index.query()` calls
- Add new functions for each search type
- Add reranking orchestration functions
- Add dev configuration system
- Preserve the namespacing and metadata filtering concepts from old code

---

## Integration Points

### With `lib/actions.ts`:
- Each new rag.ts function gets a corresponding action wrapper
- Actions validate input, call rag.ts, wrap response in `{ success, data, error }`

### With Client Components:
- Client calls action with `RAGQueryRequest`
- Action validates authentication and calls rag.ts
- Client receives `{ success, data, error }` and processes results

### With Ingestion Pipeline:
- Existing ingest routes should continue working
- Ensure metadata (surgeryType) is preserved during ingestion
- Verify namespace consistency

---

## Non-Code Decisions to Make

1. **Hybrid Index Strategy:** Should we use single hybrid index (simpler) or separate dense/sparse (more flexible)?
   - Recommend: Start with separate indexes (more control, can add sparse-only queries later)

2. **Reranking Default:** Should reranking be on by default or opt-in?
   - Recommend: Opt-in via env variable, off by default for performance

3. **Parallel Query Handling:** If one search fails in hybrid mode, what happens?
   - Recommend: Fail gracefully, return best single result + error log

4. **Namespace Usage:** Should we use namespaces for different data sources or keep single namespace?
   - Recommend: Keep single default namespace for now, add per-surgery-type filtering via metadata instead

5. **Score Normalization:** Should we normalize scores across semantic/lexical/reranked results for comparison?
   - Recommend: Keep original scores, note in output which type and if reranked

---

## Success Criteria

After implementation, the following should be true:

1. ✅ `rag.ts` contains ALL Pinecone interaction code, no other file uses Pinecone directly
2. ✅ Developers can switch between search strategies via environment variables
3. ✅ Semantic, lexical, and hybrid searches all work and return properly formatted results
4. ✅ Metadata filtering works for all search types (tested with surgery type filter)
5. ✅ Reranking can be toggled and different models tested
6. ✅ All functionality is wrapped in actions.ts with proper authentication
7. ✅ Dev mode provides detailed logging and tracing
8. ✅ Parallel queries work for hybrid search (dense + sparse in parallel)
9. ✅ Error handling is comprehensive and user-facing errors are clear
10. ✅ Performance is acceptable (typical query < 500ms)

