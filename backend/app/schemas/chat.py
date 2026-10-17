

from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1 , 
        max_length=5000,
        description="User message",
    )
    sessions_id: str | None =  Field(
        default=None,
        description="Conversation Session ID",
    )

class ChatResponse(BaseModel):
    session_id: str
    message: str
    reply: str
    status: str = "success"


