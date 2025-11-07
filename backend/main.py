from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from utils.graph_utils import GraphitiKnowledgeGraph

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting up...")  
    kg = GraphitiKnowledgeGraph()
    await kg.initialize()
    print("GraphitiKnowledgeGraph initialized.")
    yield

    print("Shutting down...")  
    await kg.close()
    print("GraphitiKnowledgeGraph closed.")

app = FastAPI(title="Memory Api", version="1.0", lifespan=lifespan)

@app.get("/health", summary="Health Check Endpoint")
async def health_check():
    return JSONResponse(content={"status": "ok", "message": "API is running"})