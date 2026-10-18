
from functools import lru_cache
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from app.core.config import get_settings

@lru_cache
def get_embeddings() -> HuggingFaceEndpointEmbeddings :
    settings = get_settings()

    return HuggingFaceEndpointEmbeddings(
        model = settings.HF_EMBEDDING_MODEL,
        task ="feature-extraction",
        huggingfacehub_api_token = settings.HF_TOKEN
    )

def embed_document(texts :list[str]) -> list[list[float]]:
    if not texts:
        return[]
    return get_embeddings().embed_documents(texts)

def embed_query(text:str)->list[float]:
    return get_embeddings().embed_query(text)
    


    