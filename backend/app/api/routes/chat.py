
from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.agent_service import process_message

from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json

from app.services.streaming_service import stream_campusmind


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


@router.post("/stream")
async def stream_chat(request: ChatRequest):
    session_id = request.session_id

    if not session_id or session_id == "null":
        session_id = str(uuid4())

    async def event_generator():
        try:
            async for event in stream_campusmind(
                message=request.message,
                session_id=session_id,
            ):
                payload = {
                    "session_id": session_id,
                    **event,
                }

                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

            yield "data: {\"type\":\"done\"}\n\n"

        except Exception as exc:
            error_payload = {
                "type": "error",
                "message": str(exc),
            }
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

