import os
import asyncio
from fastapi import Request
from datetime import datetime
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType
from graphiti_core.llm_client.groq_client import GroqClient
from graphiti_core.llm_client.config import LLMConfig as CustomLLMConfig
from graphiti_core.llm_client.gemini_client import GeminiClient, LLMConfig
from graphiti_core.embedder.gemini import GeminiEmbedder, GeminiEmbedderConfig
from graphiti_core.cross_encoder.gemini_reranker_client import GeminiRerankerClient
from graphiti_core.utils.maintenance.graph_data_operations import clear_data

class GraphitiKnowledgeGraph:
    def __init__(
        self
    ):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.neo4j_uri = os.getenv("NEO4J_URI")
        self.neo4j_username = os.getenv("NEO4J_USERNAME")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("MODEL")

        if not all([self.groq_api_key, self.neo4j_uri, self.neo4j_username, self.neo4j_password]):
            raise ValueError(
                "Missing required environment variables. Please ensure all of the following are set:\n"
                "- GROQ_API_KEY\n"
                "- NEO4J_URI\n"
                "- NEO4J_USERNAME\n"
                "- NEO4J_PASSWORD"
            )
        
        if self.model_name == "GRQO":
            llm_config = CustomLLMConfig(
                api_key=self.groq_api_key,
                model="llama-3.3-70b-versatile",
                small_model="llama-3.1-8b-instant"
            )
            llm_client = GroqClient(config=llm_config)
        else:
            llm_client = GeminiClient(
                            config=LLMConfig(
                                api_key=self.gemini_api_key,
                                model="gemini-2.5-flash"
                            )
                        )
        
        embedder = GeminiEmbedder(
                        config=GeminiEmbedderConfig(
                            api_key=self.gemini_api_key,
                            embedding_model="gemini-embedding-001"
                        )
                    )
        cross_encoder = GeminiRerankerClient(
                            config=LLMConfig(
                                api_key=self.gemini_api_key,
                                model="gemini-2.5-flash"
                            )
                        )
        print(f"🔤 Eembedding model")
        
        self.client = Graphiti(
            uri=self.neo4j_uri,           
            user=self.neo4j_username,     
            password=self.neo4j_password, 
            llm_client=llm_client,
            embedder=embedder,
            cross_encoder=cross_encoder 
        )
        
        self._indices_built = False
    
    async def initialize(self):
        if not self._indices_built:
            # await clear_data(self.client.driver)
            await self.client.build_indices_and_constraints()
            self._indices_built = True
            print("✅ Database indices and constraints built successfully")
    
    async def add_knowledge(
        self,
        text: str,
        user_id: str,
        category: str,
        source_description: Optional[str] = None,
        episode_type: EpisodeType = EpisodeType.text,
        reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Add text or data to the knowledge graph with user/category isolation.
        
        Args:
            text: Input text or JSON string to process
            user_id: Unique identifier for the user (e.g., "user_123")
            category: Category/domain label (e.g., "finance", "health", "chat")
            source: Source identifier (default: "user_input")
            source_description: Optional description of the source
            episode_type: Type of episode (text, message, or json)
            reference_time: Timestamp for the episode (defaults to now)
        
        Returns:
            Dict containing metadata about the created episode
        
        Example:
            >>> kg = GraphitiKnowledgeGraph()
            >>> await kg.initialize()
            >>> result = await kg.add_knowledge(
            ...     text="Alice met Bob at the conference in SF.",
            ...     user_id="user_123",
            ...     category="networking"
            ... )
        """
        if not self._indices_built:
            await self.initialize()
        
        group_id = f"user_{user_id}_{category}"

        if reference_time is None:
            reference_time = datetime.now()
        
        if source_description is None:
            source_description = f"Knowledge from {user_id} in {category} category"
        
        try:
            result = await self.client.add_episode(
                name=f"{category}_{datetime.now().isoformat()}",
                episode_body=text,
                source_description=source_description,
                source=episode_type,
                reference_time=reference_time,
                group_id=group_id
            )
            
            print(f"✅ Added episode for {group_id}")
            
            return {
                "success": True,
                "user_id": user_id,
                "category": category,
                "group_id": group_id,
                "episode_uuid": str(result.episode.uuid if hasattr(result, "episode") else ""),
                "timestamp": reference_time.isoformat(),
                "episode_type": episode_type.value
            }
            
        except Exception as e:
            print(f"❌ Error adding episode for {group_id}: {str(e)}")
            return {
                "success": False,
                "user_id": user_id,
                "category": category,
                "group_id": group_id,
                "error": str(e)
            }
    
    async def search_knowledge(
        self,
        query: str,
        user_id: str,
        category: str = None,
        num_results: int = 10
    ) -> Dict[str, Any]:
        """
        Search the knowledge graph for a specific user/category.
        
        Args:
            query: Search query
            user_id: User identifier
            category: Category to search within
            num_results: Number of results to return
        
        Returns:
            Search results with relevant facts and relationships
        """
        if category:
            group_ids = [f"user_{user_id}_{category}"]
        else:
            group_ids = await self._get_group_ids_for_user(user_id)
        
        if not group_ids:
            return {"success": True, "group_ids": group_ids, "query": query, "num_results": 0, "facts": []}

        try:
            results = await self.client.search(
                query=query,
                group_ids=group_ids, 
                num_results=num_results
            )
            
            facts = []

            edges = results if isinstance(results, list) else getattr(results, 'edges', [])
            for edge in edges:
                facts.append({
                    "source": edge.source_node_uuid,
                    "relation": edge.name,
                    "target": edge.target_node_uuid,
                    "fact": edge.fact,
                    "created_at": edge.created_at.isoformat() if edge.created_at else None
                })
            
            return {
                "success": True,
                "group_id": group_ids,
                "query": query,
                "num_results": len(facts),
                "facts": facts
            }
            
        except Exception as e:
            return {
                "success": False,
                "group_id": group_ids,
                "error": str(e)
            }
    
    async def close(self):
        """Close the database connection."""
        await self.client.close()
        print("✅ Database connection closed")

    async def _get_group_ids_for_user(self, user_id: str) -> List[str]:
        """
        Query Neo4j for distinct group_id values for this user.
        Returns something like ["user_1_Job", "user_1_personal", ...]
        """
        prefix = f"user_{user_id}_"
        # Try to use the driver's execute_query helper if present (docs show it exists)
        try:
            records, _, _ = await self.client.driver.execute_query(
                """
                MATCH (n)
                WHERE n.group_id IS NOT NULL AND n.group_id STARTS WITH $prefix
                RETURN DISTINCT n.group_id AS group_id
                """,
                prefix=prefix,
            )
            return [r["group_id"] for r in records]
        except AttributeError:
            # Fallback to a regular session.run for drivers without execute_query helper
            group_ids = []
            async with self.client.driver.session() as session:
                result = await session.run(
                    """
                    MATCH (n)
                    WHERE n.group_id IS NOT NULL AND n.group_id STARTS WITH $prefix
                    RETURN DISTINCT n.group_id AS group_id
                    """,
                    prefix=prefix,
                )
                records = await result.list()
                for rec in records:
                    # rec is a Record; rec["group_id"] extracts the value
                    group_ids.append(rec["group_id"])
            return group_ids

def get_graph_service(request: Request) -> GraphitiKnowledgeGraph:
    """
    Dependency injection function to get the shared
    GraphitiKnowledgeGraph instance from the app state.
    """
    return request.app.state.kg_service
# if __name__ == "__main__":
#     async def main():
#         kg = GraphitiKnowledgeGraph()
#         await kg.initialize()
        
#         result1 = await kg.add_knowledge(
#             text="Apple Inc. reported strong Q4 earnings with revenue of $89.5 billion.",
#             user_id="user_001",
#             category="finance"
#         )
#         print(f"Result 1: {result1}")
        
#         # User 1: Health data (different category, isolated)
#         result2 = await kg.add_knowledge(
#             text="Regular exercise improves cardiovascular health and reduces stress.",
#             user_id="user_001",
#             category="health"
#         )
#         print(f"Result 2: {result2}")
        
#         # User 2: Finance data (different user, isolated)
#         result3 = await kg.add_knowledge(
#             text="Tesla's stock price increased by 15% this quarter.",
#             user_id="user_002",
#             category="finance"
#         )
#         print(f"Result 3: {result3}")
        
#         # Search user 1's finance knowledge
#         search_results = await kg.search_knowledge(
#             query="earnings revenue",
#             user_id="user_001",
#             category="finance"
#         )
#         print(f"\nSearch results for user_001 finance: {search_results}")
        
#         # # Clean up
#         await kg.close()
    
#     # Run example
#     asyncio.run(main())