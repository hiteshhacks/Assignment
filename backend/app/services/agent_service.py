
from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage

from app.workflows.campusmind_graph import campusmind_graph


async def process_message(
    message: str,
    session_id: str | None = None,
) -> dict:
    if not session_id or session_id == "null":
        session_id = str(uuid4())

    config = {
        "configurable": {
            "thread_id": session_id,
        }
    }

    result = await campusmind_graph.ainvoke(
        {
            "messages": [HumanMessage(content=message)]
        },
        config=config,
    )

    ai_messages = [
        item
        for item in result["messages"]
        if isinstance(item, AIMessage)
    ]

    if not ai_messages:
        raise RuntimeError(
            "LangGraph finished without producing an AI message. "
            "Check that generate_reply is registered in the graph."
        )

    reply = ai_messages[-1].content

    if not isinstance(reply, str) or not reply.strip():
        raise RuntimeError("The AI response is empty or not text.")

    return {
        "session_id": session_id,
        "message": message,
        "reply": reply,
        "status": "success",
    }
