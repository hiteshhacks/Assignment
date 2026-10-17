from urllib import response
from langchain_core.messages import content
from email import message
# pyrefly: ignore [missing-import]
from langgraph_core.message import SystemMessage
from app.services.llm_service import get_llm
from app.workflows.state import CampusMindState

SYSTEM_PROMPT ="""
You are CampusMind, an intelligent campus assistant.

Help students with:
- Academic concepts and prerequisites
- Study planning and learning paths
- Campus-related questions

Use the conversation history to understand follow-up questions.
Remember relevant information shared earlier in the conversation.
Be helpful, clear, and honest about information you cannot verify.
"""


async def generate_reply(state: CampusMindState) -> dict:
    llm = get_llm()
    message =[ 
        SystemMessage(content=SYSTEM_PROMPT),
        *state["messages"],
    ]
    response =  await llm.ainvoke(message)

    return {"reply": ["response"]}
