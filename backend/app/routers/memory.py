from fastapi import APIRouter, Depends
from app.models import MemoryTextInput, MemoryAddResponse
from app.services.graph_utils import GraphitiKnowledgeGraph, get_graph_service
from fastapi import File, UploadFile, Form, HTTPException, status
from typing import Optional

from app.utils.memory_helpers import parse_file_in_memory

router = APIRouter(
    prefix="/memory",
    tags=["Memory Ingestion"]
)

@router.post("/text", response_model=MemoryAddResponse)
async def add_text_memory(
    data: MemoryTextInput,
    kg: GraphitiKnowledgeGraph = Depends(get_graph_service)
):
    """
    Add a raw text snippet to the knowledge graph.
    """
    result = await kg.add_knowledge(
        text=data.text,
        user_id=data.user_id,
        category=data.category,
        source_description=data.source_description
    )
    return result

@router.post("/upload", response_model=MemoryAddResponse)
async def add_file_memory(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    category: str = Form(...),
    source_description: Optional[str] = Form(None),
    kg: GraphitiKnowledgeGraph = Depends(get_graph_service)
):
    """
    Upload a file (PDF, DOCX, TXT), parse it in memory,
    and add its content to the knowledge graph.
    """
    print(f"Receiving file: {file.filename} ({file.content_type})")
    
    # Parse the file content based on its type
    parsed_text = await parse_file_in_memory(file)
    
    if not parsed_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty or could not be parsed."
        )

    # Use the filename as the source description if one isn't provided
    desc = source_description or f"Content from uploaded file: {file.filename}"
    
    # Add the extracted text to the knowledge graph
    result = await kg.add_knowledge(
        text=parsed_text,
        user_id=user_id,
        category=category,
        source_description=desc
    )
    return result