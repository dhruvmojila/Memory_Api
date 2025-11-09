System Design Document: Scalable LLM Memory APIIntroductionThis document outlines the complete system architecture and implementation plan for a scalable, open-source, and easy-to-use Memory API for Large Language Models (LLMs). The system is designed to address the inherent statelessness of LLMs by providing a robust, long-term memory layer built upon a knowledge graph. This allows for memory to be ingested, structured, updated, and retrieved in a contextually relevant manner.The architecture is built upon a decoupled, service-oriented design. The backend, powered by FastAPI, serves as the central API gateway. It manages complex, stateful resources—specifically the LLM clients (Groq) and the Neo4j graph database connection—using efficient design patterns. Memory ingestion is handled through a flexible pipeline that can process raw text, PDF documents, and Word documents, parsing them in-memory and structuring them into a Neo4j knowledge graph using the graphiti_core library.For retrieval, the system implements an advanced Retrieval-Augmented Generation (RAG) pipeline. This pipeline uses DSPY to manage and control the prompting logic, ensuring that the LLM's responses are faithfully grounded in the facts retrieved from the knowledge graph.The frontend, built with React, provides a comprehensive management dashboard. This "human-in-the-loop" interface allows users to add new memories, upload documents, and query the RAG system. A key feature of this dashboard is a real-time visualization of the knowledge graph, built with ReactFlow, which updates live as new information is added to the system, facilitated by a WebSocket connection.This document provides a phased, step-by-step implementation guide, starting from the initial backend setup and culminating in a production-ready, open-source project complete with documentation.I. Core System Architecture: A Singleton-Driven ApproachA. The Challenge: Managing Expensive ResourcesThe provided GraphitiKnowledgeGraph class is a "heavy" or "expensive" object. It initializes and holds the connection pool to the Neo4j database and maintains persistent clients for LLM and embedding services (Groq, Gemini).1 In a standard web framework, a new instance of this class might be created for every incoming API request. This behavior would lead to rapid resource exhaustion, as it would open and close a new database connection pool for each request, creating a severe performance bottleneck and preventing the system from scaling.1B. The Solution: FastAPI Lifespan ManagerTo solve this, the system will adopt the Singleton pattern, which ensures only one instance of the GraphitiKnowledgeGraph class exists for the entire application lifecycle.1 The correct, modern way to implement this in an ASGI framework like FastAPI is by using the lifespan context manager.3The lifespan function runs code before the application starts receiving requests and after it stops. This allows for:On Startup: A single GraphitiKnowledgeGraph instance is created and initialized (including building its database indices). This instance is then stored in the global app.state object, making it accessible to the entire application.3On Shutdown: The close() method of the service is called, gracefully shutting down the Neo4j connection pool and any other open resources.4C. Implementation: main.py and services.pyThe existing GraphitiKnowledgeGraph class will be moved to its own file, app/services/graph_service.py. The main application file, app/main.py, will be refactored to manage this service's lifecycle.app/main.py (Refactored):Pythonimport os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from app.services.graph_service import GraphitiKnowledgeGraph

# Import routers will go here

# from app.routers import memory, query

@asynccontextmanager
async def lifespan(app: FastAPI): # --- Startup --- # Create the single, shared instance of the KG service
print("🚀 Initializing Knowledge Graph service...")
kg_service = GraphitiKnowledgeGraph()
await kg_service.initialize()

    # Store the instance in the application state
    app.state.kg_service = kg_service
    print("✅ Knowledge Graph service initialized.")

    yield

    # --- Shutdown ---
    print("🔌 Closing Knowledge Graph connection...")
    await app.state.kg_service.close()
    print("✅ Knowledge Graph connection closed.")

app = FastAPI(
title="LLM Memory API",
description="An API for a scalable, graph-based LLM memory system.",
lifespan=lifespan
)

# Include API routers

# app.include_router(memory.router)

# app.include_router(query.router)

@app.get("/health")
def health_check():
return {"status": "ok"}
D. Accessing the Singleton: Dependency InjectionWith the service instance stored in app.state.kg_service, API routes must be able to access it. FastAPI's Dependency Injection system (Depends) is used for this.5 A simple "dependable" function is created:app/services/graph_service.py (Dependency Function):Python#... (GraphitiKnowledgeGraph class is above)...

from fastapi import Request

def get_graph_service(request: Request) -> GraphitiKnowledgeGraph:
"""
Dependency injection function to get the shared
GraphitiKnowledgeGraph instance from the app state.
"""
return request.app.state.kg_service
Any route that includes kg_service: GraphitiKnowledgeGraph = Depends(get_graph_service) in its signature will receive the same shared instance, ensuring high performance and efficient resource management.4II. Project Structure and Endpoint DefinitionA. The Why: A Scalable File StructureThe initial single-file project is not maintainable. A scalable application requires a logical separation of concerns. The project will be organized into a standard FastAPI project structure, separating API routes, data models, and core business logic (services).B. The New Project Structure.
├── backend/
│ ├── app/
│ │ ├── **init**.py
│ │ ├── main.py # (Created in Step 1)
│ │ ├── models.py # (New) API data contracts (Pydantic)
│ │ ├── routers/
│ │ │ ├── **init**.py
│ │ │ ├── memory.py # (New) Endpoints for adding memory
│ │ │ └── query.py # (New) Endpoints for retrieving memory
│ │ └── services/
│ │ ├── **init**.py
│ │ ├── graph_service.py # (From Step 1) Contains GraphitiKnowledgeGraph
│ │ ├── dspy_config.py # (New) DSPY module configuration
│ │ └── websocket_manager.py # (New) For real-time updates
│ ├──.env
│ ├──.env.example
│ └── requirements.txt
├── frontend/
│ ├── package.json
│ ├── src/
│ └──... (React Project)
├──.gitignore
├── LICENSE
└── README.md
C. API Data Contracts: app/models.pyPydantic models define the API's "contract".6 They provide automatic data validation for all incoming and outgoing JSON payloads.7app/models.py:Pythonfrom pydantic import BaseModel
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
III. Building the Memory Ingestion EndpointsA. The Why: A Multi-Modal Ingestion PipelineThe system must accept memory from various sources: plain text, PDF files, and DOCX files. This requires a flexible ingestion endpoint that can identify the file type and route it to the correct parser.B. Base Endpoint: Plain TextThe simplest endpoint accepts raw text via a JSON payload.app/routers/memory.py:Pythonfrom fastapi import APIRouter, Depends
from app.models import MemoryTextInput, MemoryAddResponse
from app.services.graph_service import GraphitiKnowledgeGraph, get_graph_service

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
C. Advanced Endpoint: File UploadsThis endpoint handles file uploads using UploadFile. It must also accept the user_id and category as form data.9app/routers/memory.py (Additions):Pythonimport io
from fastapi import File, UploadFile, Form, HTTPException, status
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
#... (imports from above)

async def parse_file_in_memory(file: UploadFile) -> str:
"""
Parses an uploaded file (PDF, DOCX, TXT) in memory
and returns its text content.
"""
content_type = file.content_type
file_bytes = await file.read()

    # Use BytesIO to treat the byte string as a file
    file_like_object = io.BytesIO(file_bytes)

    # We must reset the file pointer after reading
    await file.seek(0)

    try:
        if content_type == "application/pdf":
            # PyPDFLoader can work with file-like objects
            # To make it work reliably, we save it to a temp name
            # managed by the loader.

            # A more direct way with BytesIO:
            loader = PyPDFLoader(file_like_object)
            docs = loader.load() # LangChain's load() is sync

            # Note: For full async, one would use loader.aload()
            # or run loader.load() in a threadpool

            return "\n\n".join([doc.page_content for doc in docs])

        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # python-docx can read from a file-like object [11, 12]
            # LangChain's loader simplifies this [13, 14]

            # Docx2txtLoader needs a path. To stay in memory,
            # we can pass the file-like object directly to python-docx
            from docx import Document
            document = Document(file_like_object)
            return "\n\n".join([para.text for para in document.paragraphs])

        elif content_type == "text/plain":
            return file_bytes.decode('utf-8')

        else:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {content_type}"
            )
    except Exception as e:
        # Handle parsing errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse file {file.filename}: {str(e)}"
        )

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

This implementation uses io.BytesIO to create an in-memory, file-like object from the uploaded bytes. This avoids writing the file to disk, which is more efficient and scalable. The file content is then passed to the appropriate parsing library—PyPDFLoader for PDFs 15 or python-docx for DOCX files 12—to extract the raw text.IV. Building the GraphRAG Query EndpointA. The Why: Controlled, Faithful GenerationA simple chat endpoint is insufficient. The system requires a RAG pipeline where the LLM's answer is strictly based on the context retrieved from the memory graph. DSPY is the ideal tool for this, as it allows for structured, controllable, and optimizable prompting.16B. Configuring DSPY: app/services/dspy_config.pyA new service file will be created to configure the DSPY components.app/services/dspy_config.py:Pythonimport os
import dspy

def setup_dspy():
"""
Configures the DSPY environment with the Groq LLM.
""" # 1. Configure the LLM # We use a fast model for generation, as the heavy lifting (retrieval) # is done by the graph [17]
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
raise ValueError("GROQ_API_KEY environment variable not set.")

    groq_llm = dspy.GroqLM(model="llama-3.1-8b-instant", api_key=groq_api_key)
    dspy.configure(lm=groq_llm)

    # 2. Define the RAG Signature
    # This signature defines the task: answer a question *only*
    # based on the provided context [18, 19, 20]
    class GraphRAGSignature(dspy.Signature):
        """Answers questions based *only* on the provided context from the knowledge graph."""

        context: str = dspy.InputField(desc="Facts retrieved from the memory graph.")
        question: str = dspy.InputField()
        answer: str = dspy.OutputField(desc="A concise answer based *strictly* on the context.")

    # 3. Define the RAG Module
    # We use ChainOfThought to force the LLM to "think" about the context
    # before answering, improving faithfulness [16, 21, 22]
    rag_module = dspy.ChainOfThought(GraphRAGSignature)

    return rag_module

# Create and configure the module on import

rag_module = setup_dspy()
C. Implementing the RAG Query EndpointThe RAG endpoint orchestrates the retrieve-format-generate pipeline.app/routers/query.py:Pythonfrom fastapi import APIRouter, Depends, HTTPException
from app.models import QueryInput, QueryResponse
from app.services.graph_service import GraphitiKnowledgeGraph, get_graph_service
from app.services.dspy_config import rag_module # Import our configured module

router = APIRouter(
prefix="/query",
tags=["Query"]
)

@router.post("/rag", response_model=QueryResponse)
async def query_rag(
data: QueryInput,
kg: GraphitiKnowledgeGraph = Depends(get_graph_service)
):
"""
Query the memory graph using a RAG pipeline. 1. Retrieve facts from the graph. 2. Generate an answer based _only_ on those facts using DSPY.
"""
try: # 1. Retrieve: Get facts from the knowledge graph
search_result = await kg.search_knowledge(
query=data.question,
user_id=data.user_id,
category=data.category
)

        retrieved_facts = search_result.get('facts',)

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

V. Constructing the Memory Management Dashboard (Frontend)A. Enabling Cross-Origin Resource Sharing (CORS)The React frontend (e.g., http://localhost:3000) and the FastAPI backend (http://localhost:8000) run on different "origins." Browser security will block the frontend from making API calls unless the backend explicitly allows it.23 This is solved by adding CORS middleware to main.py.app/main.py (Additions):Python#... (other imports)
from fastapi.middleware.cors import CORSMiddleware

#... (lifespan function)

app = FastAPI(...)

# --- Add CORS Middleware ---

origins =

app.add_middleware(
CORSMiddleware,
allow_origins=origins,
allow_credentials=True,
allow_methods=["*"], # Allows all methods (GET, POST, etc.)
allow_headers=["*"], # Allows all headers
)

#... (app.include_router, etc.)
B. Dashboard Layout and FormsThe React frontend will be structured with Shadcn components to provide a clean, modern UI.24 The main application component (App.tsx) will use Shadcn Tabs to create three distinct functional areas:"Add Text" Tab: Contains Textarea and Input fields. An onClick handler on a Button will fetch the /memory/text endpoint, sending a JSON body."Upload File" Tab: Contains an <input type="file" /> and Input fields. Its onClick handler must use the FormData API.26 It will create a FormData object, append the file, user_id, and category, and fetch the /memory/upload endpoint."Query Memory" Tab: Contains an Input for the question. Its fetch call to /query/rag will update the state with the answer and retrieved_facts, displaying both to the user.VI. Real-Time Graph Visualization with ReactFlowA. The Challenge: Data Format and Real-Time UpdatesVisualizing the graph requires solving two problems:Data-Format Problem: Neo4j's query results do not match the specific nodes and edges array format required by ReactFlow.27 A translation layer is needed.Real-Time Problem: The visualization must update automatically when new memory is added, without requiring a manual page refresh. This is a perfect use case for WebSockets.28B. Backend: The Graph-to-ReactFlow API EndpointA new endpoint is created in app/routers/query.py to serve graph data in the exact format ReactFlow expects.app/routers/query.py (Additions):Python#... (other imports)
from app.models import GraphResponse
from neo4j import AsyncDriver

@router.get("/visualize", response*model=GraphResponse)
async def get_graph_visualization(
user_id: str,
category: str,
kg: GraphitiKnowledgeGraph = Depends(get_graph_service)
):
"""
Fetch all nodes and edges for a user/category's graph,
formatted specifically for ReactFlow.
"""
group_id = f"user*{user*id}*{category}"
driver: AsyncDriver = kg.client.driver

    nodes =
    edges =

    async with driver.session() as session:
        # --- 1. Nodes Query ---
        # This query formats nodes to match ReactFlow's { id, data, position }
        # structure [27, 30]
        nodes_query = """
        MATCH (n:Entity) WHERE n.group_id = $group_id
        RETURN
            elementId(n) as id,
            { label: n.name } as data,
            { x: rand() * 400, y: rand() * 400 } as position
        """
        result = await session.run(nodes_query, group_id=group_id)
        nodes = [record.data() for record in await result.list()]

        # --- 2. Edges Query ---
        # This query formats edges to match ReactFlow's { id, source, target, label }
        # structure [27, 31, 32]
        edges_query = """
        MATCH (s:Entity)-[r]->(t:Entity)
        WHERE s.group_id = $group_id AND t.group_id = $group_id
        RETURN
            elementId(r) as id,
            elementId(s) as source,
            elementId(t) as target,
            type(r) as label
        """
        result = await session.run(edges_query, group_id=group_id)
        edges = [record.data() for record in await result.list()]

    return GraphResponse(nodes=nodes, edges=edges)

C. Backend: The Real-Time WebSocket NotifierA simple WebSocket manager will broadcast updates to all connected clients.app/services/websocket_manager.py:Pythonfrom typing import List
from fastapi import WebSocket

class ConnectionManager:
def **init**(self):
self.active_connections: List =

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

# Create a single instance to be used by the app

manager = ConnectionManager()
This manager is then used in main.py and routers/memory.py.app/main.py (Additions):Python#... (other imports)
from fastapi import WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager

#... (app and middleware)...

@app.websocket("/graph/updates")
async def websocket_endpoint(websocket: WebSocket):
"""
WebSocket endpoint for graph updates.
Clients connect here and wait for broadcast messages.
"""
await manager.connect(websocket)
try:
while True: # Keep the connection alive
await websocket.receive_text()
except WebSocketDisconnect:
manager.disconnect(websocket)
app/routers/memory.py (Integration):Python#... (imports)
from app.services.websocket_manager import manager as websocket_manager

#... (router)

@router.post("/text",...)
async def add_text_memory(
data: MemoryTextInput,
kg: GraphitiKnowledgeGraph = Depends(get_graph_service)
):
result = await kg.add_knowledge(...)

    # --- ADD THIS LINE ---
    if result.get("success"):
        await websocket_manager.broadcast("graph_updated")

    return result

@router.post("/upload",...)
async def add_file_memory(
#... (parameters)
):
#... (file parsing logic)

    result = await kg.add_knowledge(...)

    # --- ADD THIS LINE ---
    if result.get("success"):
        await websocket_manager.broadcast("graph_updated")

    return result

D. Frontend: The ReactFlow Visualization ComponentA new React component (GraphVisualizer.tsx) will be created.It will use useState hooks to store nodes and edges.It will define a fetchGraphData function to call the /query/visualize endpoint and update the component's state.A useEffect hook will call fetchGraphData when the component first mounts.A second useEffect hook will establish a WebSocket connection to ws://localhost:8000/graph/updates.33The ws.onmessage handler will be set to listen for the "graph*updated" message. When this message is received, it will simply call fetchGraphData() again, triggering ReactFlow to re-render with the new graph structure.VII. Preparing the Project for Open-Source DistributionA. The Why: Shipping a Professional Open-Source ProjectTo "ship it as open source," the project requires more than just code. It needs a permissive license and clear documentation to build trust and encourage community adoption and contribution.34B. Selecting a License: MIT vs. Apache 2.0While the MIT license is simple and permissive 35, the Apache License 2.0 is the superior choice for a modern AI/ML project. The Apache 2.0 license includes an explicit patent grant.36 This clause protects the project and its users from patent claims by contributors, which is a critical consideration in the rapidly innovating AI space.37 A LICENSE file containing the full text of the Apache License 2.0 will be added to the project root.C. Creating the README.mdThe README.md is the project's "front page".34 It will be structured to provide a comprehensive overview for both users and potential contributors.38README.md Structure:Project Title & Badges: A clear, branded name for the Memory API.Description: A concise paragraph explaining what the project is and the problem it solves.Features: A bulleted list of all key capabilities (e.g., GraphRAG, PDF/DOCX parsing, DSPY-controlled generation, real-time ReactFlow visualization).Technology Stack: A table listing all the technologies used (FastAPI, Neo4j, Groq, DSPY, React, etc.).Getting Started:Prerequisites (e.g., Python 3.10+, Node.js, Neo4j instance).git clone...Backend Setup: cd backend, pip install -r requirements.txt, create .env from .env.example, uvicorn app.main:app --reload.Frontend Setup: cd frontend, npm install, npm run dev.API Reference: A brief overview of the main API endpoints.Contributing: A link to the CONTRIBUTING.md file.39D. Creating the CONTRIBUTING.mdThis file encourages community involvement by defining clear guidelines.40CONTRIBUTING.md Structure:Code of Conduct: A link to a CODE_OF_CONDUCT.md file.How to Contribute:Reporting Bugs: Instructions for opening a GitHub Issue.Suggesting Enhancements: Guidelines for feature requests.Pull Request Process: The technical workflow (fork, branch, commit, create PR).Development Environment Setup: A more detailed version of the "Getting Started" guide for developers.VIII. Final Recommendations and AI Coding Agent PromptsA. Phased Implementation StrategyThis design document outlines a complete, end-to-end system. The implementation should be phased to manage complexity. A logical order would be:Phase 1 (Backend Core): Implement Steps I and II (Singleton and Project Structure).Phase 2 (Backend Ingestion): Implement Step III (Text and File Ingestion Endpoints).Phase 3 (Backend RAG): Implement Step IV (DSPY Configuration and RAG Endpoint).Phase 4 (Frontend UI): Implement Step V (CORS and React Dashboard for ingestion/querying).Phase 5 (Frontend Visualization): Implement Step VI (ReactFlow and WebSocket Endpoints).Phase 6 (Open Source): Implement Step VII (Documentation and Licensing).B. AI Coding Agent PromptsThe following prompts are designed to be given to an AI coding agent, one step at a time. After the agent completes a step, verify the "Expectations" are met before proceeding to the next.Step 1: Refactor Core Service and Implement Singleton PatternPrompt:"I have an existing FastAPI project in a single file (main.py) that contains a class called GraphitiKnowledgeGraph. This class is expensive to initialize and manages a Neo4j connection.Your task is to refactor this project into a scalable structure.Create a new project structure:backend/app/backend/app/services/backend/app/routers/Move the GraphitiKnowledgeGraph class and all its imports (like os, asyncio, Graphiti, etc.) into a new file: backend/app/services/graph_service.py.In backend/app/services/graph_service.py, add a new dependency injection function get_graph_service(request: Request) -> GraphitiKnowledgeGraph that returns request.app.state.kg_service.Create a new backend/app/main.py.In backend/app/main.py, implement a FastAPI lifespan context manager.Inside the lifespan manager:On startup, create one instance of GraphitiKnowledgeGraph from app.services.graph_service.Call its await kg_service.initialize() method.Store this single instance in app.state.kg_service.On shutdown (in the finally block), call await app.state.kg_service.close().Add a simple /health check endpoint to main.py."Expectations:A new file backend/app/services/graph_service.py exists, containing the GraphitiKnowledgeGraph class and the get_graph_service function.A new file backend/app/main.py exists.main.py contains the lifespan function, which correctly creates and stores the kg_service in app.state.The old main.py file is now gone or replaced by the new one.Step 2: Define Pydantic Models and API RoutersPrompt:"Now, let's create the API contracts (Pydantic models) and API router files.Create a new file backend/app/models.py.In backend/app/models.py, define the following Pydantic models:MemoryTextInput(BaseModel): with fields text: str, user_id: str, category: str, source_description: Optional[str] = None.QueryInput(BaseModel): with fields question: str, user_id: str, category: str.MemoryAddResponse(BaseModel): with fields success: bool, user_id: str, category: str, group_id: str, episode_uuid: Optional[str] = None, timestamp: Optional[str] = None, error: Optional[str] = None.RetrievedFact(BaseModel): with fields source: str, relation: str, target: str, fact: str, created_at: Optional[str] = None.QueryResponse(BaseModel): with fields answer: str, retrieved_facts: List.GraphNodeData(BaseModel): label: str.GraphNodePosition(BaseModel): x: float, y: float.GraphNode(BaseModel): id: str, data: GraphNodeData, position: GraphNodePosition.GraphEdge(BaseModel): id: str, source: str, target: str, label: str.GraphResponse(BaseModel): nodes: List[GraphNode], edges: List[GraphEdge].Create two new empty router files:backend/app/routers/memory.pybackend/app/routers/query.pyIn backend/app/main.py, import these two router files and include them in the app object using app.include_router()."Expectations:The backend/app/models.py file exists and contains all 9 Pydantic models.backend/app/routers/memory.py and backend/app/routers/query.py exist.backend/app/main.py now contains app.include_router(memory.router) and app.include_router(query.router).Step 3: Implement Memory Ingestion Endpoints (Text and File)Prompt:"Let's build the ingestion endpoints in backend/app/routers/memory.py.In backend/app/routers/memory.py, create an APIRouter.Create a /memory/text POST endpoint:It should take data: MemoryTextInput from app.models as the body.It must use the Depends(get_graph_service) to get the kg service.It should call await kg.add_knowledge() using the data from the Pydantic model.It should return the result, which matches the MemoryAddResponse model.Create a /memory/upload POST endpoint:It must take file: UploadFile = File(...), user_id: str = Form(...), and category: str = Form(...).It also needs the kg service dependency.Create a helper function async def parse_file_in_memory(file: UploadFile) -> str.This function must:Read the file bytes: file_bytes = await file.read().Create an io.BytesIO object from the bytes.Use if file.content_type ==... to check the file type.If 'application/pdf': Use langchain_community.document_loaders.PyPDFLoader to load the io.BytesIO object and return the concatenated text.If 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': Use python-docx to load the io.BytesIO object, iterate through document.paragraphs, and return the joined text.If 'text/plain': Decode the bytes and return the string.If unknown, raise an HTTPException.The /upload endpoint should call parse_file_in_memory with the file.Then, it should call await kg.add_knowledge() with the parsed text, user_id, and category.Return the MemoryAddResponse.Install the new dependencies: pip install langchain-community pypdf python-docx."Expectations:backend/app/routers/memory.py contains the /text and /upload endpoints.The /upload endpoint correctly uses UploadFile, Form, and the parse_file_in_memory helper.The helper function correctly handles PDF, DOCX, and TXT content types.Both endpoints use the Depends(get_graph_service) dependency.Step 4: Implement GraphRAG Endpoint with DSPYPrompt:"Now, let's build the RAG query pipeline using DSPY and Groq.Install the required libraries: pip install dspy-ai groq.Create a new file backend/app/services/dspy_config.py.In this new file:Import dspy and os.Create a function setup_dspy():Inside the function, configure dspy.GroqLM using the GROQ_API_KEY from os.getenv(). Use the model llama-3.1-8b-instant.Configure DSPY globally: dspy.configure(lm=groq_llm).Define a class GraphRAGSignature(dspy.Signature):Docstring: "Answers questions based only on the provided context from the knowledge graph."context: str = dspy.InputField(desc="Facts retrieved...")question: str = dspy.InputField()answer: str = dspy.OutputField(desc="A concise answer based *strictly* on the context.")Define the module: rag_module = dspy.ChainOfThought(GraphRAGSignature).Return rag_module.At the bottom of the file, call rag_module = setup_dspy() to create the module instance on import.Now, open backend/app/routers/query.py.Create an APIRouter.Import rag_module from app.services.dspy_config.Create a /query/rag POST endpoint:It should take data: QueryInput from app.models.It needs the kg = Depends(get_graph_service).Step 1 (Retrieve): Call search_result = await kg.search_knowledge(...) using the data.Step 2 (Format): Get the retrieved_facts from the search_result. Create a context_str by joining all the 'fact' strings from the list. If the list is empty, set context_str = "No relevant facts found in memory."Step 3 (Generate): Call the DSPY module: result = rag_module(context=context_str, question=data.question).Step 4 (Respond): Return a QueryResponse containing answer=result.answer and the original retrieved_facts."Expectations:backend/app/services/dspy_config.py exists and correctly configures dspy.GroqLM and the ChainOfThought module.backend/app/routers/query.py exists and has the /rag endpoint.The /rag endpoint correctly implements the Retrieve-Format-Generate-Respond pipeline.Step 5: Configure Backend for Frontend Integration (CORS & WebSockets)Prompt:"Before we build the frontend, we must prepare the backend for it. We need to enable CORS and set up the WebSocket manager for real-time updates.In backend/app/main.py:Import from fastapi.middleware.cors import CORSMiddleware.Add the CORS middleware to the app object.Allow origins: ["http://localhost:3000", "http://localhost:5173"].Allow credentials, all methods (["*"]), and all headers (["*"]).Create a new file: backend/app/services/websocket_manager.py.In this new file, create a ConnectionManager class:**init**: self.active_connections: List =.async def connect(self, websocket: WebSocket): Accepts the connection and adds it to the list.def disconnect(self, websocket: WebSocket): Removes the websocket from the list.async def broadcast(self, message: str): Loops over all connections and sends the text message.At the bottom, create a singleton instance: manager = ConnectionManager().In backend/app/main.py:Import manager from app.services.websocket_manager and WebSocket, WebSocketDisconnect.Create a new WebSocket endpoint: @app.websocket("/graph/updates").Inside, call await manager.connect(websocket).Use a try/except WebSocketDisconnect block. In the try block, have a while True: await websocket.receive_text() loop to keep the connection alive. In the except block, call manager.disconnect(websocket).In backend/app/routers/memory.py:Import manager as websocket_manager from app.services.websocket_manager.In both the /text and /upload endpoints, after the await kg.add_knowledge(...) call, add a check:if result.get("success"): await websocket_manager.broadcast("graph_updated")"Expectations:backend/app/main.py now contains the CORSMiddleware configuration.backend/app/services/websocket_manager.py exists with the ConnectionManager class and manager instance.backend/app/main.py has the @app.websocket("/graph/updates") endpoint.backend/app/routers/memory.py now broadcasts "graph_updated" on successful memory addition.Step 6: Implement Graph-to-ReactFlow Translation EndpointPrompt:"Let's create the last backend endpoint. This one will query the graph and return the data in the exact format ReactFlow requires.Go to backend/app/routers/query.py.Create a new GET endpoint: @router.get("/visualize", response_model=GraphResponse).The endpoint should take user_id: str and category: str as query parameters.It needs the kg = Depends(get_graph_service).Get the group_id = f"user*{user*id}*{category}".Get the driver from kg.client.driver.Run two Cypher queries asynchronously using async with driver.session() as session::Nodes Query:CypherMATCH (n:Entity) WHERE n.group_id = $group_id
RETURN
elementId(n) as id,
{ label: n.name } as data,
{ x: rand() _ 400, y: rand() _ 400 } as position
Run this query, get the list of records, and store it in a nodes list.Edges Query:CypherMATCH (s:Entity)-[r]->(t:Entity)
WHERE s.group_id = $group_id AND t.group_id = $group_id
RETURN
elementId(r) as id,
elementId(s) as source,
elementId(t) as target,
type(r) as label
Run this query, get the list of records, and store it in an edges list.Finally, return a GraphResponse(nodes=nodes, edges=edges)."Expectations:backend/app/routers/query.py contains the new /visualize GET endpoint.The endpoint runs two separate Cypher queries for nodes and edges.The queries use elementId() and aliases (id, data, position, source, target, label) to perfectly match the GraphResponse Pydantic model defined in app/models.py.Step 7: Build the React + Shadcn Dashboard FrontendPrompt:"Now, let's build the frontend. I have a React + Tailwind project already set up.Install Shadcn and ReactFlow: npm install @xyflow/react and npx shadcn-ui@latest init.Add the Shadcn components we will need: tabs, card, input, textarea, button, toast.In App.tsx, set up the main layout:Use Shadcn Tabs with three triggers: "Add Text", "Upload File", and "Query Memory".Each TabsContent will contain a Card for its functionality."Add Text" Tab:Use useState for text, userId, category.Create a form with Textarea (for text) and Input (for user/category).The "Add Memory" Button's onClick handler should:fetch('http://localhost:8000/memory/text',...) with method: 'POST', headers: {'Content-Type': 'application/json'}, and a JSON.stringify body.Show a toast on success."Upload File" Tab:Use useState for file: File | null, userId, category.Create a form with <input type="file" /> and Input fields.The "Upload File" Button's onClick handler must:Create const formData = new FormData().Append the data: formData.append('file', file), formData.append('user_id', userId), etc.fetch('http://localhost:8000/memory/upload', { method: 'POST', body: formData }). (No 'Content-Type' header, the browser sets it)."Query Memory" Tab:Use useState for question, userId, category, answer, and retrievedFacts.Create a form for question, userId, and category.The "Query" Button's onClick handler should:fetch('http://localhost:8000/query/rag',...) with a POST JSON body.Set the answer and retrievedFacts from the JSON response.Render the answer in a Card.Render the retrievedFacts as a list."Expectations:App.tsx shows three tabs.The "Add Text" tab sends a JSON POST request.The "Upload File" tab sends a multipart/form-data POST request.The "Query Memory" tab sends a JSON POST request and displays both the answer and the retrieved_facts.Step 8: Build the Real-Time ReactFlow ComponentPrompt:"This is the final coding step. Let's create the ReactFlow visualization.Create a new component src/components/GraphVisualizer.tsx.Inside this component:Import ReactFlow, useNodesState, useEdgesState from @xyflow/react.Import @xyflow/react/dist/style.css.Use the useNodesState and useEdgesState hooks: const [nodes, setNodes, onNodesChange] = useNodesState();Define a fetchGraphData function using useCallback. This function will:fetch('http://localhost:8000/query/visualize?user_id=...&category=...'). (Use a hardcoded user/category for now, or add inputs).On success, call setNodes(response.nodes) and setEdges(response.edges).Create a useEffect hook with an empty dependency array `.Inside, call fetchGraphData() to load the initial graph.Create a second useEffect hook, also with `. This is for the WebSocket.Inside, create the WebSocket: const ws = new WebSocket('ws://localhost:8000/graph/updates');Define the onmessage handler: ws.onmessage = (event) => { if (event.data === 'graph_updated') { console.log('Graph updated, refetching...'); fetchGraphData(); } };In the useEffect's return (cleanup) function, call ws.close().In the component's return JSX, render <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange}...> inside a sized div.Add this <GraphVisualizer /> component to your App.tsx, perhaps in a new "Visualize" tab or alongside the "Query Memory" tab."Expectations:A GraphVisualizer.tsx component exists.The component fetches data from /visualize on mount.The component successfully connects to the /graph/updates WebSocket.Crucial Test: When a new memory is added via the "Add Text" tab, the GraphVisualizer component should automatically update and show the new nodes/edges without a page refresh.Step 9: Create Open-Source DocumentationPrompt:"The project is code-complete. Now, prepare it for open-source release.Create a LICENSE file in the project root. Populate it with the full text of the Apache License 2.0.Create a README.md file in the project root.In README.md, add the following sections:A project title and a one-paragraph description.Features: A bulleted list of everything we built (GraphRAG, PDF/DOCX parsing, DSPY control, ReactFlow viz, etc.).Technology Stack: A table of all the technologies (FastAPI, Neo4j, Groq, DSPY, React, ReactFlow, Shadcn).Getting Started: A step-by-step guide for a new user to clone, install backend dependencies (pip install -r requirements.txt), install frontend dependencies (npm install), set up the .env file, and run both servers.Contributing: A short section that says "See CONTRIBUTING.md for details."Create a CONTRIBUTING.md file in the project root.In CONTRIBUTING.md, add sections for:How to Report BugsHow to Suggest EnhancementsPull Request Process"Expectations:A LICENSE file exists with the Apache 2.0 license text.A README.md file exists with all the specified sections.A CONTRIBUTING.md file exists with clear guidelines for contributors.
