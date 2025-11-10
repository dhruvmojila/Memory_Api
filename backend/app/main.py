from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.services.graph_utils import GraphitiKnowledgeGraph
from app.services.dspy_config import setup_dspy
from app.services.dspy_modules import GraphRAGModule
from app.routers import memory, query
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting up...")  
    print("🚀 Initializing Knowledge Graph service...")
    kg_service = GraphitiKnowledgeGraph()
    await kg_service.initialize()
    app.state.kg_service = kg_service
    print("GraphitiKnowledgeGraph initialized.")

    print("🚀 Initializing DSPY...")
    setup_dspy()
    app.state.rag_module = GraphRAGModule()
    print("DSPY initialized.")
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

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://example.com", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            
    allow_credentials=True,
    allow_methods=["*"],           
    allow_headers=["*"],            
)

app.include_router(memory.router, prefix="/api")
app.include_router(query.router, prefix="/api")

@app.get("/health", summary="Health Check Endpoint")
async def health_check():
    return JSONResponse(content={"status": "ok", "message": "API is running"})