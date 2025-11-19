# backend/services/embedder.py
"""
Ollama-based embedder (Grok) with ST fallback and robust retrying.

Environment:
  OLLAMA_URL   - e.g. http://localhost:11434
  OLLAMA_MODEL - e.g. grok-3o (set to the local model name you run)

Behavior:
  - Primary: Ollama /embed endpoint
  - Fallback: sentence-transformers if Ollama unreachable
  - Safe retries on 429/5xx with exponential backoff + jitter
  - Batch & single embedding functions compatible with existing callers
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

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "grok-3o")
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
        self._st_model = None
        if SentenceTransformer is not None:
            try:
                st_name = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
                self._st_model = SentenceTransformer(st_name)
            except Exception:
                self._st_model = None

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
                if isinstance(data, dict):
                    if "embedding" in data:
                        emb = data["embedding"]
                        if isinstance(emb[0], (int, float)):
                            return [emb]
                        return emb
                    if "embeddings" in data:
                        return data["embeddings"]
                    if "results" in data and isinstance(data["results"], list):
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
                last_err = OllamaEmbedError(f"Ollama returned status {resp.status_code}: {resp.text}")
                if resp.status_code in (429, 503, 502, 500):
                    _backoff_sleep(attempt)
                    continue
                else:
                    break
        raise OllamaEmbedError(f"Ollama embed failed after retries: {last_err}")

    def _st_embed(self, texts: List[str]) -> List[List[float]]:
        if self._st_model is None:
            return [self._fallback_rand_vec(t) for t in texts]
        vecs = self._st_model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        out = []
        for v in vecs:
            n = np.linalg.norm(v)
            if n > 0:
                out.append((v / n).tolist())
            else:
                out.append(v.tolist())
        return out

    def _fallback_rand_vec(self, text: str, dim: int = FALLBACK_DIM) -> List[float]:
        rng = np.random.RandomState(abs(hash(text)) % (2 ** 32))
        v = rng.randn(dim)
        n = np.linalg.norm(v)
        if n > 0:
            v = v / n
        return v.tolist()

    def embed_text(self, text: str) -> List[float]:
        key = f"{self.model}:{text[:200]}"
        if key in self.cache:
            return self.cache[key]
        try:
            res = self._call_ollama_embed([text])
            vec = res[0]
        except Exception:
            try:
                vec = self._st_embed([text])[0]
            except Exception:
                vec = self._fallback_rand_vec(text)
        arr = np.array(vec, dtype=float)
        n = np.linalg.norm(arr)
        if n > 0:
            arr = arr / n
        vec = arr.tolist()
        self.cache[key] = vec
        return vec

    def embed_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        out = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                emb = self._call_ollama_embed(batch)
                if not isinstance(emb, list) or len(emb) != len(batch):
                    raise OllamaEmbedError("Mismatched embedding count from Ollama")
            except Exception:
                try:
                    emb = self._st_embed(batch)
                except Exception:
                    emb = [self._fallback_rand_vec(t) for t in batch]
            for v in emb:
                arr = np.array(v, dtype=float)
                n = np.linalg.norm(arr)
                if n > 0:
                    arr = arr / n
                out.append(arr.tolist())
        return out

    def embed_query(self, query: str) -> List[float]:
        return self.embed_text(query)

    def cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        a = np.array(v1, dtype=float)
        b = np.array(v2, dtype=float)
        na = np.linalg.norm(a)
        nb = np.linalg.norm(b)
        if na == 0 or nb == 0:
            return 0.0
        return float(np.dot(a, b) / (na * nb))

_embedder = None
_embedder_lock = threading.Lock()

def get_embedder(model_name: str = None, ollama_url: str = None) -> EmbeddingService:
    global _embedder
    with _embedder_lock:
        if _embedder is None:
            _embedder = EmbeddingService(model_name=model_name, ollama_url=ollama_url)
        return _embedder