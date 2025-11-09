from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from services.graph_utils import GraphitiKnowledgeGraph
# from app.routers import memory, query

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting up...")  
    print("🚀 Initializing Knowledge Graph service...")
    kg_service = GraphitiKnowledgeGraph()
    await kg_service.initialize()
    app.state.kg_service = kg_service
    print("GraphitiKnowledgeGraph initialized.")
    yield

    print("Shutting down...")  
    print("🔌 Closing Knowledge Graph connection...")
    await kg_service.close()
    print("GraphitiKnowledgeGraph closed.")

app = FastAPI(
    title="LLM Memory API",
    description="An API for a scalable, graph-based LLM memory system.", 
    version="1.0", lifespan=lifespan
)

# app.include_router(memory.router)
# app.include_router(query.router)

@app.get("/health", summary="Health Check Endpoint")
async def health_check():
    return JSONResponse(content={"status": "ok", "message": "API is running"})