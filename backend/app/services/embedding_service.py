
from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import get_settings


@lru_cache
def get_embeddings() -> HuggingFaceEmbeddings:
    settings = get_settings()

    return HuggingFaceEmbeddings(
        model_name=settings.HF_EMBEDDING_MODEL,
    )


def embed_document(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return get_embeddings().embed_documents(texts)


def embed_query(text: str) -> list[float]:
    return get_embeddings().embed_query(text)

    


    