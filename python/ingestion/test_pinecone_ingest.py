import os
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

from pinecone import Pinecone

# 1. Setup
load_dotenv()


api_key = os.getenv("PINECONE_KEY")
hostname = os.getenv("INDEX_HOST")
print('api_key', api_key)

pc = Pinecone(api_key=api_key)
index = pc.Index(hostname)

index.upsert_records(
    hostname,
    [
        {
            "_id": "rec1",
            "text": "Apples are a great source of dietary fiber, which supports digestion and helps maintain a healthy gut.",
            "category": "digestive system",
            "other": "metafield"
        },
    ]
)

loader = DirectoryLoader("/root/MGC2025/test_data", glob="**/*.pdf", loader_cls=PyPDFLoader)
docs = loader.load()

# 3. Chunking (Critical for clinical accuracy)
# We use a 1000 character chunk with overlap so recovery steps aren't cut in half
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100
)
split_docs = text_splitter.split_documents(docs)
print('split_docs?', split_docs)

# 4. Initialize OpenAI Embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
print('embeddings?', embeddings)

# 5. Connect to Pinecone and Upsert
# print(f"Uploading {len(split_docs)} chunks to Pinecone...")
# vectorstore = PineconeVectorStore.from_documents(
#     documents=split_docs,
#     embedding=embeddings,
#     index_name=index_name,
#     namespace="surgery-guidelines" # Good for keeping surgery types organized
# )

# print("Ingestion Complete!")
