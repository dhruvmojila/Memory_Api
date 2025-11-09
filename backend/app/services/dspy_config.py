import os
import dspy
import time
from litellm import RateLimitError

class GroqSafeLM(dspy.LM):
    def __call__(self, *args, **kwargs):
        retries = 5
        delay = 2
        for attempt in range(retries):
            try:
                return super().__call__(*args, **kwargs)
            except RateLimitError as e:
                print(f"[Groq RateLimit] Attempt {attempt+1}/{retries} - waiting {delay}s")
                time.sleep(delay)
                delay *= 2  # exponential backoff
        raise Exception("Groq rate limit exceeded repeatedly.")

def setup_dspy():
    """
    Configures the DSPY environment with the Groq LLM.
    """
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable not set.")
    
    groq_llm = GroqSafeLM(
        model="groq/llama-3.1-8b-instant",  
        api_key=groq_api_key,
        temperature=0.7,
        model_type="chat"
    )

    dspy.configure(lm=groq_llm)