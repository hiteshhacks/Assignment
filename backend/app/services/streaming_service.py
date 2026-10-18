
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage

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

            for item in update.get("messages", []):
                if isinstance(item, AIMessage) and isinstance(item.content, str):
                    yield {
                        "type": "answer",
                        "node": node_name,
                        "content": item.content,
                    }
