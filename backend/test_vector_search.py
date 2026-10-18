
from app.services.document_indexing import index_document
from app.services.sample_documents import SAMPLE_DOCUMENTS
from app.services.vector_retrieval import search_documents


if __name__ == "__main__":
    count = index_document(SAMPLE_DOCUMENTS)
    print(f"Indexed {count} documents.")

    results = search_documents(
        "What should I know before studying machine learning?",
        limit=3,
    )

    print("\nSearch results:")

    for result in results:
        print(f"\nTitle: {result['title']}")
        print(f"Category: {result['category']}")
        print(f"Score: {result['score']:.4f}")
        print(f"Text: {result['text']}")
