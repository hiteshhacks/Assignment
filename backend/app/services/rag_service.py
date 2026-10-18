
from app.services.graph_retrieval import retrieve_graph_context
from app.services.vector_retrieval import search_documents


def retrieve_campus_evidence(query: str) -> dict:
    graph_results = retrieve_graph_context(query)

    vector_results = search_documents(
        query=query,
        limit=4,
    )

    evidence = {
        "query": query,
        "graph_results": graph_results,
        "document_results": vector_results,
    }

    evidence["has_evidence"] = bool(
        graph_results or vector_results
    )

    return evidence


def format_evidence(evidence: dict) -> str:
    sections = []

    for item in evidence["graph_results"]:
        sections.append(
            "[NEO4J GRAPH]\n"
            f"Subject: {item.get('subject')}\n"
            f"Department: {item.get('department')}\n"
            f"Faculty: {', '.join(item.get('faculty') or [])}\n"
            f"Prerequisites: "
            f"{', '.join(item.get('prerequisites') or [])}\n"
            f"Related electives: "
            f"{', '.join(item.get('electives') or [])}"
        )

    for item in evidence["document_results"]:
        sections.append(
            "[QDRANT DOCUMENT]\n"
            f"Title: {item.get('title')}\n"
            f"Category: {item.get('category')}\n"
            f"Source: {item.get('source')}\n"
            f"Text: {item.get('text')}\n"
            f"Similarity score: {item.get('score')}"
        )

    if not sections:
        return "No relevant campus evidence was retrieved."

    return "\n\n".join(sections)
