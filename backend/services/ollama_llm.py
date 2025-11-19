import os
import requests
import time
import random

# Environment variables
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
OLLAMA_GEN_PATH = "/api/generate"

def _backoff_sleep(attempt):
    time.sleep(min(30, (2 ** attempt) + random.random()))

def ollama_generate(prompt: str, model: str = None, max_tokens: int = 512, temperature: float = 0.7) -> str:
    """
    Simple wrapper for Ollama's /api/generate endpoint.
    Compatible with old code paths even if Grok is primary now.
    """

    model_name = model or OLLAMA_MODEL
    url = OLLAMA_URL.rstrip("/") + OLLAMA_GEN_PATH
    
    payload = {
        "model": model_name,
        "prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": temperature
    }

    for attempt in range(5):
        try:
            resp = requests.post(url, json=payload, timeout=60)
        except requests.RequestException:
            _backoff_sleep(attempt)
            continue
        
        if resp.status_code == 200:
            try:
                data = resp.json()
                # try common response formats
                if "response" in data:
                    return data["response"]
                if "text" in data:
                    return data["text"]
                if "generated" in data:
                    return data["generated"]
                if "choices" in data and data["choices"] and "text" in data["choices"][0]:
                    return data["choices"][0]["text"]

                # fallback return raw response text
                return resp.text
            except Exception:
                return resp.text
        
        # Retry on server errors
        if resp.status_code in (429, 500, 502, 503):
            _backoff_sleep(attempt)
            continue
        else:
            break
    
    raise RuntimeError(
        f"Ollama generate failed: "
        f"{resp.status_code if 'resp' in locals() else 'no response'}"
    )