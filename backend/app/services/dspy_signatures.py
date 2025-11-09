import dspy

class GraphRAGSignature(dspy.Signature):
    """Answers questions based *only* on the provided context from the knowledge graph."""
    
    context: str = dspy.InputField(desc="Facts retrieved from the memory graph.")
    question: str = dspy.InputField(desc="Questions or query asked by the user.")
    answer: str = dspy.OutputField(desc="A concise answer based *strictly* on the context.")