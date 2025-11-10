from fastapi import APIRouter, Depends, HTTPException
from app.models import QueryInput, QueryResponse, User
from app.services.graph_utils import GraphitiKnowledgeGraph, get_graph_service
from app.services.dspy_modules import get_rag_module, GraphRAGModule
from neo4j import AsyncDriver
from app.models import GraphResponse
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/query",
    tags=["Query"]
)

@router.post("/rag", response_model=QueryResponse)
async def query_rag(
    data: QueryInput,
    kg: GraphitiKnowledgeGraph = Depends(get_graph_service),
    rag_module: GraphRAGModule = Depends(get_rag_module),
    current_user: User = Depends(get_current_user)
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
            user_id=str(current_user.id),
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
            answer=result,
            retrieved_facts=retrieved_facts
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during RAG query: {str(e)}"
        )

@router.get("/visualize", response_model=GraphResponse)
async def get_graph_visualization(
    category: str = None,
    kg: GraphitiKnowledgeGraph = Depends(get_graph_service),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch the entire user/category graph formatted for React Flow.
    Each node includes its metadata to support interactive visualization.
    """
    driver: AsyncDriver = kg.client.driver
    user_id = str(current_user.id)

    nodes = []
    edges = []

    async with driver.session() as session:
        # --- 1️⃣ Nodes Query ---
        if category:
            group_id = f"user_{user_id}_{category}"
            nodes_query = """
            MATCH (n:Entity)
            WHERE n.group_id = $group_id
            RETURN 
                elementId(n) AS id,
                properties(n) AS props,
                n.name AS name,
                n.uuid AS uuid,
                { x: rand() * 500, y: rand() * 500 } AS position
            """
            result = await session.run(nodes_query, group_id=group_id)
        else:
            prefix = f"user_{user_id}_"
            nodes_query = """
            MATCH (n:Entity)
            WHERE n.group_id IS NOT NULL AND n.group_id STARTS WITH $prefix
            RETURN DISTINCT
                elementId(n) AS id,
                properties(n) AS props,
                n.name AS name,
                n.uuid AS uuid,
                { x: rand() * 500, y: rand() * 500 } AS position
            """
            result = await session.run(nodes_query, prefix=prefix)
        
        async for record in result:
            data = record.data()
            # Build the data object with label and all properties
            node_data = dict(data['props'])  # Copy all properties
            node_data['label'] = data['name'] or data['title'] or data['uuid'] or 'Node'
            
            nodes.append({
                'id': data['id'],
                'props': data['props'],
                'data': node_data,
                'position': data['position']
            })

        if category:
            group_id = f"user_{user_id}_{category}"

            edges_query = """
            MATCH (s:Entity)-[r]->(t:Entity)
            WHERE s.group_id = $group_id AND t.group_id = $group_id
            RETURN 
                elementId(r) AS id,
                elementId(s) AS source,
                elementId(t) AS target,
                type(r) AS label,
                properties(r) AS props
            """
            result = await session.run(edges_query, group_id=group_id)
        else:
            prefix = f"user_{user_id}_"
            edges_query = """
            MATCH (s:Entity)-[r]->(t:Entity)
            WHERE s.group_id IS NOT NULL
              AND s.group_id STARTS WITH $prefix
              AND t.group_id IS NOT NULL
              AND t.group_id STARTS WITH $prefix
              AND s.group_id = t.group_id
            RETURN DISTINCT
                elementId(r) AS id,
                elementId(s) AS source,
                elementId(t) AS target,
                type(r) AS label,
                properties(r) AS props
            """
            result = await session.run(edges_query, prefix=prefix)

        async for record in result:
            edges.append(record.data())

    return GraphResponse(nodes=nodes, edges=edges)
