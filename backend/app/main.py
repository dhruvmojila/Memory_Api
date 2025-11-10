from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.services.graph_utils import GraphitiKnowledgeGraph
from app.services.dspy_config import setup_dspy
from app.services.dspy_modules import GraphRAGModule
from app.routers import memory, query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
import asyncio

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

@app.websocket("/api/graph/updates")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for graph updates.
    Clients connect here and wait for broadcast messages.
    """
    await manager.connect(websocket)
    try:
        while True:
            try:
                # Wait for messages with a timeout
                data = await asyncio.wait_for(
                    websocket.receive_text(), 
                    timeout=30.0
                )
                # Echo back or handle ping messages
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                try:
                    await websocket.send_text("ping")
                except Exception:
                    # Connection is dead
                    break
            except WebSocketDisconnect:
                break
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

app.include_router(memory.router, prefix="/api")
app.include_router(query.router, prefix="/api")

@app.get("/health", summary="Health Check Endpoint")
async def health_check():
    return JSONResponse(content={"status": "ok", "message": "API is running"})