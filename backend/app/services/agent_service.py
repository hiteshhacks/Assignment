
from uuid import uuid4


async def process_message(
    message: str,
    session_id: str | None = None,
) -> dict:
    if session_id is None:
        session_id = str(uuid4())

    reply = (
        "Welcome to CampusMind! Your message has been received. "
        "AI reasoning, campus knowledge retrieval, and agentic "
        "actions will be integrated in upcoming steps."
    )

    return {
        "session_id": session_id,
        "message": message,
        "reply": reply,
        "status": "success",
    }
