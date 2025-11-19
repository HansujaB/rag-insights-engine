# backend/services/embedder.py
import os
import time
import random
from typing import List, Dict, Any
import numpy as np

try:
    import google.generativeai as genai
except ImportError:
    genai = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if genai and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


FALLBACK_MODELS = [
    "models/text-embedding-004",
    "models/text-embedding-3-large",
    "models/text-embedding-3-small",
    "models/embedding-001"
]


def retry_backoff(attempt):
    """Exponential backoff with jitter"""
    sleep_time = min(60, (2 ** attempt) + random.random())
    time.sleep(sleep_time)


class EmbeddingService:
    """Service for generating embeddings with auto-fallback & retry"""

    def __init__(self, model_name: str = "models/text-embedding-004"):
        self.model_name = model_name
        self.embedding_cache: Dict[str, List[float]] = {}

    # ---------------------------------------------------------
    # INTERNAL HELPER — always attempts all models before fallback mode
    # ---------------------------------------------------------
    def _try_embed(self, content, task_type):
        for attempt, model in enumerate(FALLBACK_MODELS):
            try:
                result = genai.embed_content(
                    model=model,
                    content=content,
                    task_type=task_type
                )
                return result, model

            except Exception as e:
                if "429" in str(e):
                    print(f"[429] Rate limit hit for model={model}, retrying...")
                    retry_backoff(attempt)
                    continue  # try next model
                print(f"[ERROR] Model {model} failed: {e}")
                continue

        return None, None  # all models failed → fallback

    # ---------------------------------------------------------
    # SINGLE TEXT EMBEDDING
    # ---------------------------------------------------------
    def embed_text(self, text: str) -> List[float]:
        cache_key = f"{self.model_name}:{text[:100]}"

        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]

        if not (genai and GEMINI_API_KEY):
            return self._fallback_embedding(text)

        result, used_model = self._try_embed(text, "retrieval_document")

        if not result:
            print("Gemini embedding completely failed → Using fallback embedding")
            return self._fallback_embedding(text)

        embedding = result["embedding"]
        self.embedding_cache[cache_key] = embedding
        return embedding

    # ---------------------------------------------------------
    # BATCH EMBEDDING (with retry + model fallback)
    # ---------------------------------------------------------
    def embed_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        embeddings = []

        if not (genai and GEMINI_API_KEY):
            return [self._fallback_embedding(t) for t in texts]

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            result, used_model = self._try_embed(batch, "retrieval_document")

            if not result:
                print("Batch embedding failed for all models → fallback for entire batch")
                embeddings.extend([self._fallback_embedding(t) for t in batch])
                continue

            raw = result["embedding"]

            # Google API sometimes returns embedding for single text even in batch calls
            if isinstance(raw[0], list):
                embeddings.extend(raw)
            else:
                embeddings.append(raw)

        return embeddings

    # ---------------------------------------------------------
    # QUERY EMBEDDING (for FAISS retrieval)
    # ---------------------------------------------------------
    def embed_query(self, query: str) -> List[float]:
        if not (genai and GEMINI_API_KEY):
            return self._fallback_embedding(query)

        result, used_model = self._try_embed(query, "retrieval_query")

        if not result:
            print("Query embedding failed → fallback")
            return self._fallback_embedding(query)

        return result["embedding"]

    # ---------------------------------------------------------
    # FALLBACK EMBEDDING (only if everything fails)
    # ---------------------------------------------------------
    def _fallback_embedding(self, text: str, dim: int = 768) -> List[float]:
        np.random.seed(hash(text) % (2**32))
        vec = np.random.randn(dim).tolist()
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = (np.array(vec) / norm).tolist()
        return vec

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        dot = np.dot(v1, v2)
        n1 = np.linalg.norm(v1)
        n2 = np.linalg.norm(v2)
        if n1 == 0 or n2 == 0:
            return 0.0
        return float(dot / (n1 * n2))


# Global embedder instance
_embedder = None

def get_embedder(model_name: str = "models/text-embedding-004") -> EmbeddingService:
    global _embedder
    if _embedder is None:
        _embedder = EmbeddingService(model_name)
    return _embedder
