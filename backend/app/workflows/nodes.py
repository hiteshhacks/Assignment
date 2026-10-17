
from langchain_core.messages import SystemMessage

from app.services.llm_service import get_llm
from app.workflows.state import CampusMindState


SYSTEM_PROMPT = """
You are CampusMind, an intelligent campus assistant.
Answer the user's latest question directly.
Use previous messages to understand context.
Never repeat the user's message as your answer unless appropriate.
"""


async def generate_reply(state: CampusMindState) -> dict:
    llm = get_llm()

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        *state["messages"],
    ]

    response = await llm.ainvoke(messages)

    if not response.content:
        raise RuntimeError("Groq returned an empty response.")

    print("CampusMind LLM response:", response.content)

    return {"messages": [response]}
