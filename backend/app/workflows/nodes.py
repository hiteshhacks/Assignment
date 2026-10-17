
from app.services.llm_service import get_llm
from app.workflows.state import CampusMindState


async def generate_reply(state: CampusMindState) -> dict:
    llm = get_llm()

    response = await llm.ainvoke(
        [
            (
                "system",
                "You are CampusMind, an intelligent campus assistant. "
                "Help students with academics, study planning, "
                "prerequisites, and campus-related questions. "
                "Be helpful, clear, and honest about information "
                "you cannot verify.",
            ),
            ("human", state["message"]),
        ]
    )

    return {"reply": str(response.content)}
