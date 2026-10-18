
from locale import normalize
import re
from langchain_core.messages import SystemMessage,HumanMessage, AIMessage

from app.services.llm_service import get_llm
from app.workflows.state import CampusMindState

from app.services.rag_service import (
    format_evidence,
    retrieve_campus_evidence,
)

SYSTEM_PROMPT = """
You are CampusMind, an intelligent campus assistant.
Answer the user's latest question directly.
Use previous messages to understand context.
Never repeat the user's message as your answer unless appropriate.
"""


GREETING_PATTERN =re.compile( r"^(hi|hello|hey|good morning|good afternoon|good evening)"
    r"[!,. ]*$",
    re.IGNORECASE,)

NAME_PATTERN =re.compile(
     r"\bmy name is\s+([A-Za-z][A-Za-z '-]{0,49})",
     re.IGNORECASE,
)

NAME_QUESTION_PATTERN = re.compile(
    r"\b(what is|what's|tell me)\s+(my name|my name again)\b"
    r"|\bdo you remember my name\b",
    re.IGNORECASE,
)

CAMPUS_PATTERNS = [
    r"\bwho teaches\b",
    r"\bwhich professor\b",
    r"\bwhich faculty\b",
    r"\bwho is the professor\b",
    r"\bwho handles\b",
    r"\bfaculty for\b",
    r"\bavailable electives\b",
    r"\belectives offered\b",
    r"\bcampus notice\b",
    r"\bcollege notice\b",
    r"\bexam timetable\b",
    r"\bexam schedule\b",
    r"\bcourse registration\b",
    r"\bsubject prerequisites\b",
    r"\bprerequisites for\b",
]


def route_message (state:CampusMindState) -> dict:
    message = state["messages"]

    latest_user_message =next(
        (
        msg.content
        for msg in reversed(message)
        if isinstance(msg,HumanMessage)
        and isinstance(msg.content , str)
    ),
    "",
    )
    text = latest_user_message.strip()
    normalized =text.lower()
    if GREETING_PATTERN.fullmatch(text):
        return {
            "route": "direct",
            "route_reason": "simple_greeting",
        }

    if NAME_PATTERN.search(text):
        return {
            "route": "direct",
            "route_reason": "name_introduction",
        }

    if NAME_QUESTION_PATTERN.search(text):
        return {
            "route": "direct",
            "route_reason": "name_recall",
        }

    if any(
        re.search(pattern, normalized)
        for pattern in CAMPUS_PATTERNS
    ):
        return {
            "route": "knowledge",
            "route_reason": "campus_knowledge_query",
        }

    return {
        "route": "llm",
        "route_reason": "general_question",
    }


def respond_directly(state: CampusMindState) -> dict:
    messages = state["messages"]

    latest_user_message = next(
        msg.content.strip()
        for msg in reversed(messages)
        if isinstance(msg, HumanMessage)
        and isinstance(msg.content, str)
    )

    reason = state["route_reason"]

    if reason == "simple_greeting":
        reply = (
            "Hello! I'm CampusMind. "
            "How can I help you today?"
        )

    elif reason == "name_introduction":
        match = NAME_PATTERN.search(latest_user_message)
        name = match.group(1).strip().rstrip(" .,!") if match else ""

        reply = (
            f"Nice to meet you, {name}!"
            if name
            else "Nice to meet you!"
        )

    elif reason == "name_recall":
        name = None

        for msg in reversed(messages):
            if not isinstance(msg, HumanMessage):
                continue

            if not isinstance(msg.content, str):
                continue

            match = NAME_PATTERN.search(msg.content)
            if match:
                name = match.group(1).strip().rstrip(" .,!") 
                break

        reply = (
            f"Your name is {name}."
            if name
            else "I couldn't find your name in this conversation yet."
        )

    else:
        reply = "I can help with that. What would you like to know?"

    return {"messages": [AIMessage(content=reply)]}



    




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



async def answer_with_campus_evidence(
    state: CampusMindState,
) -> dict:
    messages = state["messages"]

    latest_query = next(
        (
            msg.content
            for msg in reversed(messages)
            if isinstance(msg, HumanMessage)
            and isinstance(msg.content, str)
        ),
        "",
    )

    evidence = retrieve_campus_evidence(latest_query)

    if not evidence["has_evidence"]:
        return {
            "messages": [
                AIMessage(
                    content=(
                        "I couldn't find relevant information in the "
                        "available campus knowledge sources. Please "
                        "check an official campus source or provide "
                        "more details."
                    )
                )
            ]
        }

    context = format_evidence(evidence)

    prompt = SystemMessage(
        content=(
            "You are CampusMind's campus knowledge assistant.\n"
            "Answer the user's question using the retrieved evidence "
            "below and the conversation history for context.\n"
            "Do not invent faculty names, course details, "
            "prerequisites, or campus policies.\n"
            "If the evidence does not establish a fact, clearly "
            "state that it could not be verified.\n"
            "Distinguish graph relationships from document claims.\n"
            "When useful, cite the document title and source.\n\n"
            f"RETRIEVED EVIDENCE:\n{context}"
        )
    )

    response = await get_llm().ainvoke(
        [prompt, *messages]
    )

    if not response.content:
        raise RuntimeError(
            "CampusMind could not generate a grounded answer."
        )

    return {"messages": [response]}
