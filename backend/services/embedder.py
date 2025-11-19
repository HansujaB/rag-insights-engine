# backend/services/embedder.py
import os
from typing import List, Dict, Any
import numpy as np
try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if genai and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class EmbeddingService:
    """Service for generating embeddings using various models"""
    
    def __init__(self, model_name: str = "models/text-embedding-004"):
        self.model_name = model_name
        self.embedding_cache: Dict[str, List[float]] = {}
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text
        
        Returns:
            Embedding vector as list of floats
        """
        # Check cache
        cache_key = f"{self.model_name}:{text[:100]}"
        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]
        
        # Generate embedding
        if genai and GEMINI_API_KEY:
            try:
                result = genai.embed_content(
                    model=self.model_name,
                    content=text,
                    task_type="retrieval_document"
                )
                embedding = result['embedding']
                self.embedding_cache[cache_key] = embedding
                return embedding
            except Exception as e:
                print(f"Gemini embedding error: {e}")
                return self._fallback_embedding(text)
        else:
            return self._fallback_embedding(text)
    
    def embed_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches
        
        Args:
            texts: List of input texts
            batch_size: Number of texts to process at once
        
        Returns:
            List of embedding vectors
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            if genai and GEMINI_API_KEY:
                try:
                    # Gemini can handle batch requests
                    result = genai.embed_content(
                        model=self.model_name,
                        content=batch,
                        task_type="retrieval_document"
                    )
                    # Handle both single and batch responses
                    if isinstance(result['embedding'][0], list):
                        embeddings.extend(result['embedding'])
                    else:
                        embeddings.append(result['embedding'])
                except Exception as e:
                    print(f"Batch embedding error: {e}")
                    # Fallback to individual processing
                    for text in batch:
                        embeddings.append(self._fallback_embedding(text))
            else:
                # Fallback embeddings
                for text in batch:
                    embeddings.append(self._fallback_embedding(text))
        
        return embeddings
    
    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a query (optimized for retrieval)
        
        Args:
            query: Query text
        
        Returns:
            Embedding vector
        """
        if genai and GEMINI_API_KEY:
            try:
                result = genai.embed_content(
                    model=self.model_name,
                    content=query,
                    task_type="retrieval_query"
                )
                return result['embedding']
            except Exception as e:
                print(f"Query embedding error: {e}")
                return self._fallback_embedding(query)
        else:
            return self._fallback_embedding(query)
    
    def _fallback_embedding(self, text: str, dim: int = 768) -> List[float]:
        """
        Generate a simple fallback embedding for testing
        Uses a deterministic hash-based approach
        """
        # Simple hash-based embedding for testing without API key
        np.random.seed(hash(text) % (2**32))
        embedding = np.random.randn(dim).tolist()
        
        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = (np.array(embedding) / norm).tolist()
        
        return embedding
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))


# Global embedder instance
_embedder = None

def get_embedder(model_name: str = "models/text-embedding-004") -> EmbeddingService:
    """Get or create embedder instance"""
    global _embedder
    if _embedder is None:
        _embedder = EmbeddingService(model_name)
    return _embedder