from pinecone.grpc import PineconeGRPC as Pinecone
from pinecone import ServerlessSpec
from dotenv import load_dotenv
import os

load_dotenv()

api_key = os.getenv("PINECONE_KEY")

pc = Pinecone(api_key=api_key)

pc.create_index(
  name="mgc-2025",
  dimension=1536,
  metric="cosine",
  spec=ServerlessSpec(
    cloud="aws",
    region="us-east-1"
  )
)