# backend/services/ollama_llm.py
import os, requests, time, random
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_GEN_PATH = "/api/generate"
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "grok-3o")

def _backoff_sleep(attempt):
    time.sleep(min(30, (2 ** attempt) + random.random()))

def ollama_generate(prompt: str, model: str = None, max_tokens: int = 512, temperature: float = 0.0) -> str:
    m = model or DEFAULT_MODEL
    url = OLLAMA_URL.rstrip("/") + OLLAMA_GEN_PATH
    payload = {
        "model": m,
        "prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    for attempt in range(5):
        try:
            resp = requests.post(url, json=payload, timeout=60)
        except requests.RequestException as e:
            _backoff_sleep(attempt)
            continue
        if resp.status_code == 200:
            try:
                data = resp.json()
                # common shapes: { "response": "..." } or {"generated": "..."} or {"choices":[{"text": "..."}]}
                if isinstance(data, dict):
                    if "response" in data:
                        return data["response"]
                    if "generated" in data:
                        return data["generated"]
                    if "choices" in data and isinstance(data["choices"], list) and "text" in data["choices"][0]:
                        return data["choices"][0]["text"]
                # fallback to raw text
                return resp.text
            except:
                return resp.text
        else:
            if resp.status_code in (429, 500, 502, 503):
                _backoff_sleep(attempt)
                continue
            else:
                break
    raise RuntimeError(f"Ollama generate failed: {resp.status_code if 'resp' in locals() else 'no response'}")