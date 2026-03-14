from gdrive_utils import (
    read_file_to_memory,
    find_folder_id,
    list_files_in_folder
)
from google.oauth2 import service_account
from googleapiclient.discovery import build
from pinecone_wrapper import PineconeWrapper
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import re

def clean_medical_text(text: str) -> str:
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = re.sub(r"\n(?=[a-z])", " ", text)
    text = re.sub(r"\s+", " ", text)
    
    return text.strip()

class GDriveIngestor:
    """
    TODO subclass this
    """

    def __init__(self):
        self.folder_service = self.setup_service()
        self.pinecone_client = PineconeWrapper()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=100
        )

    def process_to_langchain(self, service, file_id, file_name):
        raw_text = read_file_to_memory(service, file_id)
        cleaned_text = clean_medical_text(raw_text)
        
        return Document(
            page_content=cleaned_text,
            metadata={"source_id": file_id, "file_name": file_name}
        )

    def _chunkify(self, id, doc: Document, *metadata):
        """chunkifies + formats text into chunks to ingest into vector db."""
        chunks = self.text_splitter.split_documents([doc])
        for i, chunk in enumerate(chunks):
            chunk.metadata['source_id'] = f"{chunk.metadata['source_id']}_chunk{i}"

        return chunks # This is now a list of Document objects

    def setup_service(self):
        SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
        SERVICE_ACCOUNT_FILE = 'service_account.json'
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)

        # builds the service object
        service = build("drive", "v3", credentials=creds)
        return service

    def ingest_folder(self, folder_name):
        """
        Currently only ingests pdfs, all found in a folder.
        """
        folder_id = find_folder_id(self.folder_service, folder_name)
        files: list[dict] = list_files_in_folder(self.folder_service, folder_id)
        for file in files:
            if file['mimeType'] == 'application/pdf':
                id = file['id']
                self.ingest_file(id, file['name'])

    def delete_folder(self, folder_name):
        """
        Currently only ingests pdfs, all found in a folder.
        """
        folder_id = find_folder_id(self.folder_service, folder_name)
        files: list[dict] = list_files_in_folder(self.folder_service, folder_id)
        del_ids =  [file['id'] for file in files]
        self.delete_entries(del_ids)

    def ingest_file(self, id, filename):
        doc: Document = self.process_to_langchain(
            self.folder_service, id, filename)
        
        chunks: list[Document] = self._chunkify(id, doc)

        # parallelize insertion to Pinecone
        try:
            # first attempt a bulk upsert if available
            self.pinecone_client.insert_entries(chunks)
        except AttributeError:
            # fallback: use a thread pool to insert one-by-one
            from concurrent.futures import ThreadPoolExecutor, as_completed
            with ThreadPoolExecutor(max_workers=8) as exe:
                futures = [exe.submit(self.pinecone_client.insert_entry, c) for c in chunks]
                for fut in as_completed(futures):
                    # propagate exceptions here so callers see them
                    fut.result()

        return chunks
    
    def delete_entries(self, ids):
        # delete all ids. Dangerous!
        self.pinecone_client.delete_entries(ids)
    
        
        

if __name__ == "__main__":
    # basic test when running main script.

    ingestor = GDriveIngestor()
    ingestor.delete_folder("Journal of Pain, The_20260220")
    ingestor.ingest_folder("Journal of Pain, The_20260220")
