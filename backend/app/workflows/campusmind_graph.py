
from anyio.lowlevel import checkpoint
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from app.workflows.nodes import generate_reply
from app.workflows.state import CampusMindState


def build_campusmind_graph():
    builder = StateGraph(CampusMindState)

    builder.add_node("generate_reply", generate_reply)

    builder.add_edge(START, "generate_reply")
    builder.add_edge("generate_reply", END)
    checkpointer =MemorySaver()


    return builder.compile(checkpointer=checkpointer)


campusmind_graph = build_campusmind_graph()
