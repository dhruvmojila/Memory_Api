from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# --- Request Models ---

class MemoryTextInput(BaseModel):
    text: str
    user_id: str
    category: str
    source_description: Optional[str] = None

class QueryInput(BaseModel):
    question: str
    user_id: str
    category: str

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