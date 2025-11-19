# backend/services/generator.py

import os
from typing import List, Dict, Any, Optional

# Grok wrapper
try:
    from backend.services.grok_llm import grok_generate
except:
    from services.grok_llm import grok_generate


class LLMGenerator:
    """LLM generator using Grok (xAI Cloud API)."""

    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("GROK_MODEL", "grok-2-latest")

    # -----------------------------------------------------------
    # RAG Answer Generation
    # -----------------------------------------------------------
    def generate_answer(
        self,
        query: str,
        context_chunks: List[str],
        max_tokens: int = 1024,
        temperature: float = 0.7
    ) -> Dict[str, Any]:

        context = "\n\n".join(
            f"[{i+1}] {chunk}" for i, chunk in enumerate(context_chunks)
        )
        prompt = self._build_rag_prompt(query, context)

        try:
            answer = grok_generate(
                prompt=prompt,
                model=self.model_name,
                max_tokens=max_tokens,
                temperature=temperature
            )
        except Exception as e:
            print("Grok generation error:", e)
            return self._fallback_answer(query, context_chunks)

        return {
            "answer": answer,
            "model": self.model_name,
            "usage": {},
            "context_used": len(context_chunks)
        }

    def _build_rag_prompt(self, query: str, context: str) -> str:
        return f"""You are a helpful assistant that answers questions using ONLY this context.

CONTEXT:
{context}

QUESTION:
{query}

If context is insufficient, say so.
Cite chunks like [1], [2].
ANSWER:
"""

    def _fallback_answer(self, query: str, context_chunks: List[str]) -> Dict[str, Any]:
        preview = context_chunks[0][:200] + "..." if context_chunks else "No context."
        return {
            "answer": f"[Fallback Mode] {preview}",
            "model": "fallback",
            "usage": {},
            "context_used": len(context_chunks)
        }

    # -----------------------------------------------------------
    # Question Generation for Quizzes
    # -----------------------------------------------------------
    def generate_test_questions(
        self, document_text: str, num_questions: int = 5
    ) -> List[Dict[str, str]]:

        prompt = f"""Generate {num_questions} factual Q&A pairs from this document.

DOCUMENT:
{document_text[:2000]}...

Format strictly as:
Q1: question
A1: answer
"""

        try:
            text = grok_generate(prompt, model=self.model_name)
        except Exception as e:
            print("Grok question generation error:", e)
            return self._fallback_questions(document_text, num_questions)

        lines = [ln.strip() for ln in text.split("\n")]
        questions = []
        q, a = None, None

        for line in lines:
            if line.startswith("Q") and ":" in line:
                if q and a:
                    questions.append({"question": q, "expected_answer": a})
                q = line.split(":", 1)[1].strip()
                a = None
            elif line.startswith("A") and ":" in line and q:
                a = line.split(":", 1)[1].strip()

        if q and a:
            questions.append({"question": q, "expected_answer": a})

        return questions[:num_questions]

    def _fallback_questions(self, text: str, num: int) -> List[Dict[str, str]]:
        return [{
            "question": f"Sample Q{i+1}",
            "expected_answer": "Fallback answer"
        } for i in range(num)]


# Singleton
_generator = None

def get_generator(model_name: Optional[str] = None) -> LLMGenerator:
    global _generator
    if _generator is None:
        _generator = LLMGenerator(model_name)
    return _generator