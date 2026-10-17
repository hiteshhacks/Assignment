
from uuid import uuid4

from app.workflows.campusmind_graph import campusmind_graph


async def process_message(
    message: str,
    session_id: str | None = None,
) -> dict:
    if session_id is None:
        session_id = str(uuid4())

    result = await campusmind_graph.ainvoke(
        {"message": message, "reply": ""}
    )

    return {
        "session_id": session_id,
        "message": message,
        "reply": result["reply"],
        "status": "success",
    }
