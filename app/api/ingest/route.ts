import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

// set max duration for long-running jobs (e.g. embedding 50 pages)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as Blob;
        const surgeryType = formData.get("surgeryType") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!surgeryType) {
            return NextResponse.json({ error: "No surgery type provided" }, { status: 400 });
        }

        // 1. load pdf
        const loader = new PDFLoader(file);
        const docs = await loader.load();

        // 2. split text (chunking), overlap crucial for maintaining context across boundaries
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const splitDocs = await splitter.splitDocuments(docs);

        // 3. add metadata
        const taggedDocs = splitDocs.map((doc: any) => {
            doc.metadata = {
                ...doc.metadata,
                surgeryType: surgeryType,
                source: (file as File).name,
                uploadedAt: new Date().toISOString(),
            };
            return doc;
        });

        // 4. embed & store in Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
        const index = pinecone.Index(process.env.PINECONE_INDEX!);

        await PineconeStore.fromDocuments(
            taggedDocs,
            new OpenAIEmbeddings({
                modelName: "text-embedding-3-small",
            }),
            { pineconeIndex: index }
        );

        return NextResponse.json({
            success: true,
            message: `Successfully embedded ${taggedDocs.length} chunks`,
        });
    } catch (error) {
        console.error("Ingestion error:", error);
        return NextResponse.json({ error: "Failed to ingest document" }, { status: 500 });
    }
}
