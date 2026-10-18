
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage

from app.services.rag_service import (
    format_evidence,
    retrieve_campus_evidence,
)
from app.workflows.campusmind_graph import campusmind_graph


async def stream_campusmind(
    message: str,
    session_id: str,
) -> AsyncIterator[dict[str, Any]]:
    config = {
        "configurable": {
            "thread_id": session_id,
        }
    }

    # Retrieve evidence for campus-specific queries so the frontend
    # can display the actual sources and relationships.
    evidence = retrieve_campus_evidence(message)

    async for event in campusmind_graph.astream(
        {"messages": [HumanMessage(content=message)]},
        config=config,
        stream_mode="updates",
    ):
        for node_name, update in event.items():
            yield {
                "type": "node_update",
                "node": node_name,
                "status": "completed",
            }

            # Emit evidence only when the knowledge node is selected.
            if node_name == "knowledge":
                items = []

                for item in evidence.get("graph_results", []):
                    items.append({
                        "kind": "graph",
                        "title": item.get("subject") or "Campus relationship",
                        "relationship": (
                            "Faculty: " + ", ".join(item.get("faculty") or [])
                            + " | Prerequisites: "
                            + ", ".join(item.get("prerequisites") or [])
                            + " | Electives: "
                            + ", ".join(item.get("electives") or [])
                        ),
                        "snippet": (
                            "Department: " + str(item.get("department") or "Not specified")
                        ),
                        "source": "Neo4j",
                    })

                for item in evidence.get("document_results", []):
                    items.append({
                        "kind": "document",
                        "title": item.get("title") or "Campus document",
                        "relationship": None,
                        "snippet": item.get("text", ""),
                        "source": item.get("source", "Qdrant"),
                        "score": item.get("score"),
                    })

                yield {
                    "type": "evidence",
                    "items": items,
                }

            for item in update.get("messages", []):
                if isinstance(item, AIMessage) and isinstance(item.content, str):
                    yield {
                        "type": "answer",
                        "node": node_name,
                        "content": item.content,
                    }
