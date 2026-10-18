from app.services.document_indexing import (
    reset_collection,
    index_document,
)
from app.services.sample_documents import SAMPLE_DOCUMENTS

if __name__ == "__main__":
    reset_collection()
    count = index_document(SAMPLE_DOCUMENTS)
    print(f"Indexed {count} documents into a clean collection.")