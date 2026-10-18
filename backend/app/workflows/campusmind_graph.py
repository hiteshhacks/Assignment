
# from anyio.lowlevel import checkpoint
# from langgraph.graph import END, START, StateGraph
# from langgraph.checkpoint.memory import MemorySaver
# from app.workflows.nodes import generate_reply
# from app.workflows.state import CampusMindState


# def build_campusmind_graph():
#     builder = StateGraph(CampusMindState)

#     builder.add_node("generate_reply", generate_reply)

#     builder.add_edge(START, "generate_reply")
#     builder.add_edge("generate_reply", END)
#     checkpointer =MemorySaver()


#     return builder.compile(checkpointer=checkpointer)


# campusmind_graph = build_campusmind_graph()



from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.workflows.nodes import (
    generate_reply,
    answer_with_campus_evidence,
    respond_directly,
    route_message,
)
from app.workflows.state import CampusMindState


def select_route(state: CampusMindState) -> str:
    return state["route"]


def build_campusmind_graph():
    builder = StateGraph(CampusMindState)

    builder.add_node("router", route_message)
    builder.add_node("direct", respond_directly)
    builder.add_node("llm", generate_reply)
    builder.add_node("knowledge", answer_with_campus_evidence)

    builder.add_edge(START, "router")

    builder.add_conditional_edges(
        "router",
        select_route,
        {
            "direct": "direct",
            "llm": "llm",
            "knowledge": "knowledge",
        },
    )

    builder.add_edge("direct", END)
    builder.add_edge("llm", END)
    builder.add_edge("knowledge", END)

    return builder.compile(checkpointer=MemorySaver())


campusmind_graph = build_campusmind_graph()
