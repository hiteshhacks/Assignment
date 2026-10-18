from langgraph.graph import MessagesState
from typing import Literal, Any

Route = Literal["direct", "llm", "knowledge"]


class CampusMindState(MessagesState):
    route: Route
    route_reason :str
    evidence: dict[str, Any]


