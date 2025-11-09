from fastapi import APIRouter, Depends, HTTPException
from app.models import QueryInput, QueryResponse
from app.services.graph_utils import GraphitiKnowledgeGraph, get_graph_service
from app.services.dspy_modules import get_rag_module, GraphRAGModule

router = APIRouter(
    prefix="/query",
    tags=["Query"]
)

@router.post("/rag", response_model=QueryResponse)
async def query_rag(
    data: QueryInput,
    kg: GraphitiKnowledgeGraph = Depends(get_graph_service),
    rag_module: GraphRAGModule = Depends(get_rag_module)
):
    """
    Query the memory graph using a RAG pipeline.
    1. Retrieve facts from the graph.
    2. Generate an answer based *only* on those facts using DSPY.
    """
    try:
        # 1. Retrieve: Get facts from the knowledge graph
        search_result = await kg.search_knowledge(
            query=data.question,
            user_id=data.user_id,
            category=data.category
        )
        
        retrieved_facts = search_result.get('facts', [])

        # 2. Format: Convert facts into a simple string context
        facts_list = [fact.get('fact', '') for fact in retrieved_facts]
        context_str = ". ".join(facts_list)
        
        if not context_str:
            context_str = "No relevant facts found in memory."

        # 3. Generate: Call the DSPY module
        # This will use Groq to generate a faithful answer
        result = rag_module(context=context_str, question=data.question)
        
        # 4. Respond
        return QueryResponse(
            answer=result.answer,
            retrieved_facts=retrieved_facts
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during RAG query: {str(e)}"
        )