from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional

class MemoryTextInput(BaseModel):
    text: str
    category: str
    source_description: Optional[str] = None

class QueryInput(BaseModel):
    question: str
    category: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class User(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Response Models ---

class MemoryAddResponse(BaseModel):
    success: bool
    user_id: str
    category: str
    group_id: str
    episode_uuid: Optional[str] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None

class RetrievedFact(BaseModel):
    source: str
    relation: str
    target: str
    fact: str
    created_at: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    retrieved_facts: List

# --- Visualization Models ---

class GraphNodeData(BaseModel):
    label: str

class GraphNodePosition(BaseModel):
    x: float
    y: float

class GraphNode(BaseModel):
    id: str
    data: GraphNodeData
    position: GraphNodePosition

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]