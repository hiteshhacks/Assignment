
from app.core.config import get_settings
from app.services.document_indexing import (
    ensure_collection,
    get_qdrant_client,
)
from app.services.embedding_service import embed_query


def search_documents(
    query: str,
    limit: int = 5,
    category: str | None = None,
) -> list[dict]:
    if not query.strip():
        return []

    if limit < 1:
        raise ValueError("limit must be at least 1.")

    settings = get_settings()
    ensure_collection()

    client = get_qdrant_client()
    vector = embed_query(query)

    query_filter = None

    if category:
        query_filter = {
            "must": [
                {
                    "key": "category",
                    "match": {"value": category},
                }
            ]
        }

    response = client.query_points(
        collection_name=settings.QDRANT_COLLECTION,
        query=vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
    )

    results = []

    for point in response.points:
        payload = point.payload or {}

        results.append(
            {
                "text": payload.get("text", ""),
                "title": payload.get("title", ""),
                "source": payload.get("source", ""),
                "category": payload.get("category", ""),
                "score": point.score,
            }
        )

    return results
