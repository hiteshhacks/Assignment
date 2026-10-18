
from functools import lru_cache
import hashlib
import uuid
from qdrant_client import QdrantClient, models

from app.core.config import get_settings
from app.services.embedding_service import embed_document

VECTOR_SIZE =384

@lru_cache
def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(url=settings.QDRANT_URL)



def ensure_collection() -> None:
    settings = get_settings()
    client = get_qdrant_client()



    if not client.collection_exists(settings.QDRANT_COLLECTION):
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
def reset_collection() -> None:
    settings = get_settings()
    client = get_qdrant_client()

    if client.collection_exists(settings.QDRANT_COLLECTION):
        client.delete_collection(settings.QDRANT_COLLECTION)

    ensure_collection()

    
def index_document(document: list[dict]) -> int :
    if not document: 
        return 0
    
    settings = get_settings()
    ensure_collection()

    texts =[
        item["text"].strip()
        for item in document
    ]

    if any(not text for text in texts):
        raise ValueError("Document text cannot be empty.")

    vectors = embed_document(texts)
    client = get_qdrant_client()

    points = []

    for document, vector in zip(document, vectors):
        points.append(
            models.PointStruct(
                id=str(
    uuid.UUID(
        bytes=hashlib.sha256(
            (
                document.get("source", "unknown")
                + "|"
                + document.get("title", "")
                + "|"
                + document.get("category", "general")
                + "|"
                + document["text"].strip()
            ).encode("utf-8")
        ).digest()[:16]
    )
),
                vector=vector,
                payload={
                    "text": document["text"],
                    "source": document.get("source", "unknown"),
                    "category": document.get("category", "general"),
                    "title": document.get("title", ""),
                },
            )
        )

    client.upsert(
        collection_name=settings.QDRANT_COLLECTION,
        points=points,
        wait=True,
    )

    return len(points)



    