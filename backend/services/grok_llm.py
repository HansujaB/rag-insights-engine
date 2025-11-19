import os
import requests

GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-2-latest")

def grok_generate(prompt, model=None, max_tokens=1024, temperature=0.7):
    if not GROK_API_KEY:
        raise RuntimeError("Missing GROK_API_KEY")

    url = "https://api.x.ai/v1/chat/completions"

    payload = {
        "model": model or GROK_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code != 200:
        raise RuntimeError(f"Grok API error: {response.status_code} {response.text}")

    data = response.json()
    return data["choices"][0]["message"]["content"]
