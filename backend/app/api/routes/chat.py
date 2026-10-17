
from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.agent_service import process_message

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    result = await process_message(
        message=request.message,
        session_id=request.session_id,
    )

    return ChatResponse(**result)
