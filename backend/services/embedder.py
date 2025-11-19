# backend/services/embedder.py
import os
from typing import List, Dict
import threading

import numpy as np
from sentence_transformers import SentenceTransformer

# --------------------------
# Configuration
# --------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# For embeddings, we use SentenceTransformers since Groq doesn't provide embedding API
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

_lock = threading.Lock()


class EmbeddingService:
    def __init__(self, model_name: str = None):
        self.model = model_name or EMBEDDING_MODEL
        self.cache: Dict[str, List[float]] = {}

        # Load SentenceTransformer model
        try:
            self._st_model = SentenceTransformer(self.model)
            print(f"✓ Loaded embedding model: {self.model}")
        except Exception as e:
            raise RuntimeError(
                f"Failed to load SentenceTransformer model '{self.model}'. "
                f"Error: {e}\n"
                f"Make sure sentence-transformers is installed: pip install sentence-transformers"
            )

    # --------------------------------------
    # SentenceTransformer Embedding
    # --------------------------------------
    def _st_embed(self, texts: List[str]) -> List[List[float]]:
        vecs = self._st_model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        out = []
        for v in vecs:
            n = np.linalg.norm(v)
            out.append((v / n).tolist() if n > 0 else v.tolist())
        return out

    # --------------------------------------
    # Single Text Embedding
    # --------------------------------------
    def embed_text(self, text: str) -> List[float]:
        key = f"{self.model}:{text[:200]}"

        if key in self.cache:
            return self.cache[key]

        # Get embedding from SentenceTransformer
        vec = self._st_embed([text])[0]

        arr = np.array(vec, dtype=float)
        n = np.linalg.norm(arr)
        arr = arr / n if n > 0 else arr

        vec = arr.tolist()
        self.cache[key] = vec
        return vec

    # --------------------------------------
    # Batch Embeddings
    # --------------------------------------
    def embed_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        out = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            emb = self._st_embed(batch)

            for v in emb:
                arr = np.array(v, dtype=float)
                n = np.linalg.norm(arr)
                out.append((arr / n).tolist() if n > 0 else arr.tolist())

        return out

    def embed_query(self, query: str) -> List[float]:
        return self.embed_text(query)

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        a = np.array(v1, dtype=float)
        b = np.array(v2, dtype=float)
        na = np.linalg.norm(a)
        nb = np.linalg.norm(b)
        return float(np.dot(a, b) / (na * nb)) if na > 0 and nb > 0 else 0.0


# GLOBAL SINGLETON
_embedder = None
_embedder_lock = threading.Lock()


def get_embedder(model_name: str = None) -> EmbeddingService:
    global _embedder
    with _embedder_lock:
        if _embedder is None:
            _embedder = EmbeddingService(model_name=model_name)
        return _embedder
