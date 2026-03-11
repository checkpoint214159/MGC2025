from pinecone import Pinecone
import os
from dotenv import load_dotenv
from langchain_core.documents import Document
from pinecone import FetchResponse


class PineconeWrapper:
    """
    to handle loading form env, verify indexes dont exist before inserting,
    and other utils
    """

    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("PINECONE_KEY")
        self.hostname = os.getenv("INDEX_HOST")
        self.pc = Pinecone(api_key=self.api_key)
        self.index = self.pc.Index(self.hostname)

    def validify_nonexist(self, datas:list[dict], namespace: str = 'default'):
        ids_to_check = [data['id'] for data in datas]
        existing: FetchResponse = self.index.fetch(ids=ids_to_check, namespace=namespace)
        print('existing', existing.vectors)

        if len(existing.vectors) != 0:
            found_ids = set(existing.vectors.keys())

            raise IndexError(f"Attempted to insert for one or more id that already existed, {id}." \
                f" To upsert call the upsert function, if this was intended. Found ids: {found_ids}")

    @staticmethod
    def _document_to_pinecone_data(doc: Document) -> tuple[dict, dict]:
        """
        quick convert to accepted format by typical pinecone db.
        enforces dictionary type, & make sure keys 'id' and 'text' are there.
        These necessary keys may be changed but js standardize
        """
        data = dict()
        data['id'] = doc.metadata['source_id']
        data['text'] = doc.page_content
        metadata = doc.metadata
        return data, metadata

    def insert_entry(self, doc:Document, namespace: str = 'default'):
        """
        Insert only allows for unique insert.
        To upsert i.e update-insert, use the corresponding func.
        """
        data, metadata = self._document_to_pinecone_data(doc)
        self.validify_nonexist(datas=[data])
        return self.upsert_entry(data, namespace, **metadata)

    def upsert_entry(self, data:dict, namespace: str = 'default', **metadata):
        return self.index.upsert_records(
            namespace=namespace,
            records=[
                data
            ],
            # **metadata,
        )
    
    # TODO: make it multiple entries in the future