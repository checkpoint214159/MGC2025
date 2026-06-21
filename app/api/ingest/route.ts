import { NextResponse } from "next/server";

// RAG document ingestion is temporarily disabled.
//
// The original handler used @langchain/community PDFLoader + OpenAIEmbeddings +
// Pinecone to embed uploaded PDFs. It's stubbed out for now because:
//   1. Nothing in the app calls this route yet (not a wired feature).
//   2. The eager OpenAI client forced OPENAI_API_KEY into the build, and
//      PDFLoader/pdf-parse are Node-heavy and awkward to bundle for Workers.
//
// Offline ingestion is handled by the Python pipeline under python/ingestion/.
// Restore the original handler from git history when ingestion is reinstated,
// ideally with a Workers-friendly embedding/loader path and a lazily-constructed
// OpenAI client (so the key is only read at request time, never at build time).
export async function POST() {
    return NextResponse.json(
        { error: "Document ingestion is not enabled." },
        { status: 501 },
    );
}
