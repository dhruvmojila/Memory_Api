import dspy
import re
from services.dspy_signatures import GraphRAGSignature
from fastapi import Request

class GraphRAGModule(dspy.Module):
    def __init__(self):
        super().__init__()
        self.predictor = dspy.ChainOfThought(GraphRAGSignature)
    
    def forward(
        self,
        context: str,
        question: str
    ) -> str:
        prediction = self.predictor(
            context=context,
            question=question
        )
        
        response = self._clean_response(prediction.response)
        
        return response
    
    def _clean_response(self, text: str) -> str:
        # Remove any XML/HTML-like tags
        text = re.sub(r'<.*?>', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def inspect_last_prompt(self, n: int = 1):
        dspy.inspect_history(n=n)
    
def get_rag_module(request: Request) -> GraphRAGModule:
    return request.app.state.rag_module