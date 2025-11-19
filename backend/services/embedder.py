# backend/services/embedder.py
"""
Ollama-based embedder with SentenceTransformer fallback.

Environment:
  OLLAMA_URL   - e.g. http://localhost:11434
  OLLAMA_MODEL - embedding model, e.g. nomic-embed-text, bge-m3

Behavior:
  - Primary: Ollama /embed endpoint (local, fast)
  - Fallback: sentence-transformers (offline also)
  - Final fallback: deterministic random embedding
  - Robust retrying for 429/5xx failures
"""

import os
import time
import random
from typing import List, Dict
import threading

import numpy as np
import requests

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

# --------------------------
# Correct Ollama Defaults
# --------------------------
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
# GOOD default embedding model (no grok!)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama-3.1-8b-instant")

OLLAMA_EMBED_PATH = "/embed"

MAX_RETRIES = 5
INITIAL_BACKOFF = 0.5
MAX_BACKOFF = 30
FALLBACK_DIM = 768

_lock = threading.Lock()


def _backoff_sleep(attempt: int):
    t = min(MAX_BACKOFF, INITIAL_BACKOFF * (2 ** attempt)) + random.random() * 0.1
    time.sleep(t)


class OllamaEmbedError(Exception):
    pass


class EmbeddingService:
    def __init__(self, model_name: str = None, ollama_url: str = None):
        self.model = model_name or OLLAMA_MODEL
        self.ollama_url = ollama_url or OLLAMA_URL
        self.embed_url = self.ollama_url.rstrip("/") + OLLAMA_EMBED_PATH

        self.cache: Dict[str, List[float]] = {}

        # Optional ST fallback
        self._st_model = None
        if SentenceTransformer is not None:
            try:
                st_name = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
                self._st_model = SentenceTransformer(st_name)
            except Exception:
                self._st_model = None

    # --------------------------------------
    # Ollama Embedding Call
    # --------------------------------------
    def _call_ollama_embed(self, inputs: List[str]) -> List[List[float]]:
        payload = {"model": self.model, "input": inputs}
        headers = {"Content-Type": "application/json"}
        last_err = None

        for attempt in range(MAX_RETRIES):
            try:
                resp = requests.post(self.embed_url, json=payload, headers=headers, timeout=60)
            except requests.RequestException as e:
                last_err = e
                _backoff_sleep(attempt)
                continue

            if resp.status_code == 200:
                try:
                    data = resp.json()
                except ValueError:
                    raise OllamaEmbedError("Invalid JSON response from Ollama")

                # Accept all valid Ollama response formats
                if isinstance(data, dict):
                    if "embedding" in data:
                        emb = data["embedding"]
                        return [emb] if isinstance(emb[0], (int, float)) else emb
                    if "embeddings" in data:
                        return data["embeddings"]
                    if "results" in data:
                        out = []
                        for r in data["results"]:
                            if isinstance(r, dict) and "embedding" in r:
                                out.append(r["embedding"])
                        if out:
                            return out

                if isinstance(data, list) and isinstance(data[0], list):
                    return data

                raise OllamaEmbedError("Unexpected Ollama embed response structure")

            else:
                last_err = OllamaEmbedError(f"Ollama returned {resp.status_code}: {resp.text}")
                if resp.status_code in (429, 500, 502, 503):
                    _backoff_sleep(attempt)
                    continue
                break

        raise OllamaEmbedError(f"Ollama embed failed after retries: {last_err}")

    # --------------------------------------
    # SentenceTransformer Fallback
    # --------------------------------------
    def _st_embed(self, texts: List[str]) -> List[List[float]]:
        if self._st_model is None:
            return [self._fallback_rand_vec(t) for t in texts]

        vecs = self._st_model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        out = []
        for v in vecs:
            n = np.linalg.norm(v)
            out.append((v / n).tolist() if n > 0 else v.tolist())
        return out

    # --------------------------------------
    # Final Fallback Embedding
    # --------------------------------------
    def _fallback_rand_vec(self, text: str, dim: int = FALLBACK_DIM) -> List[float]:
        rng = np.random.RandomState(abs(hash(text)) % (2**32))
        v = rng.randn(dim)
        n = np.linalg.norm(v)
        return (v / n).tolist() if n > 0 else v.tolist()

    # --------------------------------------
    # Single Text Embedding
    # --------------------------------------
    def embed_text(self, text: str) -> List[float]:
        key = f"{self.model}:{text[:200]}"

        if key in self.cache:
            return self.cache[key]

        # Try in order (Ollama → ST → fallback)
        try:
            vec = self._call_ollama_embed([text])[0]
        except Exception:
            try:
                vec = self._st_embed([text])[0]
            except Exception:
                vec = self._fallback_rand_vec(text)

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
            try:
                emb = self._call_ollama_embed(batch)
            except Exception:
                try:
                    emb = self._st_embed(batch)
                except Exception:
                    emb = [self._fallback_rand_vec(t) for t in batch]

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


def get_embedder(model_name: str = None, ollama_url: str = None) -> EmbeddingService:
    global _embedder
    with _embedder_lock:
        if _embedder is None:
            _embedder = EmbeddingService(model_name=model_name, ollama_url=ollama_url)
        return _embedder
