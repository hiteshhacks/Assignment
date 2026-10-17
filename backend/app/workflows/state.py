from langgraph.graph import MessagesState
from typing import Literal

Route = Literal["direct", "llm", "knowledge"]


class CampusMindState(MessagesState):
    route: Route
    route_reason :str


