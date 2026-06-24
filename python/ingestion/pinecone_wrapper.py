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

        if len(existing.vectors) != 0:
            found_ids = set(existing.vectors.keys())

            raise IndexError(f"Attempted to insert for one or more id that already existed, {id}." \
                f" To upsert call the upsert function, if this was intended. Found ids: {found_ids}")

    @staticmethod
    def _document_to_pinecone_data(doc: Document) -> tuple[dict, dict]:
        """
        quick convert to accepted format by typical pinecone db.
        enforces dictionary type, & make sure keys 'id' and 'text' are there.
        These necessary keys may be changed but js standardize.

        Metadata is automatically included in the data dict, but jic, return it anyway.

        """
        data = dict()
        data['id'] = doc.metadata['source_id']
        data['text'] = doc.page_content
        metadata = doc.metadata
        data.update(metadata)
        return data, metadata

    def insert_entries(self, docs: list[Document], namespace: str = 'default'):
        """
        Batch insert many documents in one network round‑trip.
        Raises an error if any ids already exist (same check as `insert_entry`).
        """
        records = []
        for doc in docs:
            data, metadata = self._document_to_pinecone_data(doc)
            records.append(data)

        # chunk into 96 since pinecone seems to only accept batch size of 96 or less
        n = 96
        record_groups = [records[i:i+n] for i in range(0, len(records), n)]
        self.validify_nonexist(datas=records, namespace=namespace)
        for group in record_groups:
            self.index.upsert_records(namespace=namespace, records=group)

    def delete_entries(self, ids: list[str], namespace: str = 'default'):
        chunk_ids = []
        for id in ids:
            chunk_ids.extend(self.index.list(prefix=id, namespace=namespace))
        return self.index.delete(ids=chunk_ids, namespace=namespace)


    # def upsert_entry(self, data:dict, namespace: str = 'default', **metadata):
    #     return self.index.upsert_records(
    #         namespace=namespace,
    #         records=[
    #             data
    #         ],
    #         # **metadata,
    #     )

    # # NOTE: insert_entries handles batching; parallel threads are now
    # # mostly unused unless the wrapper is missing
