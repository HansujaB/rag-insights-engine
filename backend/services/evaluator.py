# backend/services/evaluator.py

import os
import re
from typing import Dict, Any, List, Optional

# Import Grok generator wrapper
try:
    from backend.services.grok_llm import grok_generate
except:
    from services.grok_llm import grok_generate


class RAGEvaluator:
    """Evaluate RAG responses using Grok (LLM-as-a-Judge)."""

    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("GROK_MODEL", "grok-2-latest")

    # ------------------------------------------------------------
    # Main RAG Evaluation Method
    # ------------------------------------------------------------
    def evaluate_response(
        self,
        query: str,
        generated_answer: str,
        expected_answer: Optional[str] = None,
        context_chunks: Optional[List[str]] = None
    ) -> Dict[str, Any]:

        prompt = self._build_evaluation_prompt(
            query=query,
            generated_answer=generated_answer,
            expected_answer=expected_answer,
            context_chunks=context_chunks
        )

        try:
            evaluation_text = grok_generate(prompt, model=self.model_name)
            scores = self._parse_evaluation(evaluation_text)

            return {
                "scores": scores,
                "feedback": evaluation_text,
                "evaluator_model": self.model_name
            }

        except Exception as e:
            print(f"[Evaluator] Grok evaluation error:", e)
            return self._fallback_evaluation(query, generated_answer, expected_answer)

    # ------------------------------------------------------------
    # Prompt for Grok LLM-as-a-Judge
    # ------------------------------------------------------------
    def _build_evaluation_prompt(
        self,
        query: str,
        generated_answer: str,
        expected_answer: Optional[str],
        context_chunks: Optional[List[str]]
    ) -> str:

        context_section = ""
        if context_chunks:
            ctx = "\n".join([f"[{i+1}] {chunk}" for i, chunk in enumerate(context_chunks)])
            context_section = f"\nRETRIEVED CONTEXT:\n{ctx}\n"

        expected_section = ""
        if expected_answer:
            expected_section = f"\nEXPECTED ANSWER:\n{expected_answer}\n"

        return f"""You are an expert evaluator of RAG (Retrieval-Augmented Generation) systems.

Evaluate the following response.

QUERY:
{query}

GENERATED ANSWER:
{generated_answer}
{expected_section}{context_section}

Provide numeric scores from 0 to 100 for each:

1. RELEVANCE – How well does the answer address the query?
2. ACCURACY – Is the content factually correct?
3. COMPLETENESS – Does it fully answer the question?
4. COHERENCE – Is the answer clear and well-structured?
5. FAITHFULNESS – Does the answer stick to the retrieved context?

Respond STRICTLY in the format:

RELEVANCE: <score>/100
ACCURACY: <score>/100
COMPLETENESS: <score>/100
COHERENCE: <score>/100
FAITHFULNESS: <score>/100
OVERALL: <score>/100

FEEDBACK:
<one paragraph of feedback>
"""

    # ------------------------------------------------------------
    # Parse LLM evaluation output
    # ------------------------------------------------------------
    def _parse_evaluation(self, text: str) -> Dict[str, float]:
        scores = {
            "relevance": 0.0,
            "accuracy": 0.0,
            "completeness": 0.0,
            "coherence": 0.0,
            "faithfulness": 0.0,
            "overall": 0.0
        }

        for line in text.split("\n"):
            upper = line.upper()
            if ":" in upper:
                key, val = upper.split(":", 1)
                key = key.strip().lower()
                numbers = re.findall(r"\d+", val)
                if numbers:
                    if key in scores:
                        scores[key] = float(numbers[0])

        # Calculate OVERALL if missing
        if scores["overall"] == 0.0:
            scores["overall"] = sum([
                scores["relevance"],
                scores["accuracy"],
                scores["completeness"],
                scores["coherence"],
                scores["faithfulness"]
            ]) / 5.0

        return scores

    # ------------------------------------------------------------
    # Simple fallback evaluation
    # ------------------------------------------------------------
    def _fallback_evaluation(
        self,
        query: str,
        generated_answer: str,
        expected_answer: Optional[str] = None
    ) -> Dict[str, Any]:

        length = len(generated_answer.split())
        score = 70 if length > 10 else 40

        scores = {
            "relevance": score,
            "accuracy": score,
            "completeness": score,
            "coherence": score,
            "faithfulness": score,
            "overall": score
        }

        feedback = f"""[Fallback Evaluation Mode]
Answer length: {length} words
Automatic heuristic score: {score}/100
Set GROK_API_KEY in your .env for LLM-based evaluation.
"""

        return {
            "scores": scores,
            "feedback": feedback,
            "evaluator_model": "fallback"
        }

    # ------------------------------------------------------------
    # Compare RAG pipeline runs
    # ------------------------------------------------------------
    def compare_pipelines(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not results:
            return {"error": "No results provided"}

        comparisons = []
        for r in results:
            scores = r.get("scores", {})
            comparisons.append({
                "pipeline_config": r.get("config", {}),
                "overall_score": scores.get("overall", 0),
                "relevance": scores.get("relevance", 0),
                "accuracy": scores.get("accuracy", 0),
                "completeness": scores.get("completeness", 0),
                "coherence": scores.get("coherence", 0),
                "faithfulness": scores.get("faithfulness", 0)
            })

        comparisons.sort(key=lambda x: x["overall_score"], reverse=True)
        winner = comparisons[0]

        return {
            "winner": winner,
            "all_results": comparisons,
            "total_pipelines": len(comparisons)
        }


# ------------------------------------------------------------
# Singleton accessor
# ------------------------------------------------------------
_evaluator = None

def get_evaluator(model_name: Optional[str] = None) -> RAGEvaluator:
    global _evaluator
    if _evaluator is None:
        _evaluator = RAGEvaluator(model_name)
    return _evaluator