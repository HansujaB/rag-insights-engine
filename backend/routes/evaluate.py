# backend/routes/evaluate.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.evaluator import get_evaluator
from services.generator import get_generator

router = APIRouter()


# -------------------------------------
# Request Models
# -------------------------------------

class EvaluationRequest(BaseModel):
    query: str
    generated_answer: str
    expected_answer: Optional[str] = None
    context_chunks: Optional[List[str]] = None
    evaluator_model: str = "llama-3.1-8b-instant"     # OLLAMA DEFAULT


class ComparisonRequest(BaseModel):
    query: str
    results: List[Dict[str, Any]]


class QuestionGenerationRequest(BaseModel):
    doc_id: str
    num_questions: int = 5
    model_name: str = "llama-3.1-8b-instant"          # OLLAMA DEFAULT


# -------------------------------------
# Evaluate Single Response
# -------------------------------------

@router.post("/evaluate")
async def evaluate_response(request: EvaluationRequest):
    """
    Evaluate a RAG response using Ollama evaluator.
    """
    evaluator = get_evaluator(request.evaluator_model)

    result = evaluator.evaluate_response(
        query=request.query,
        generated_answer=request.generated_answer,
        expected_answer=request.expected_answer,
        context_chunks=request.context_chunks
    )

    return result


# -------------------------------------
# Compare Multiple Pipelines
# -------------------------------------

@router.post("/compare-pipelines")
async def compare_pipelines(request: ComparisonRequest):
    """
    Compare multiple pipeline results and pick the winner.
    """
    evaluator = get_evaluator()

    evaluated_results = []

    for result in request.results:
        eval_result = evaluator.evaluate_response(
            query=request.query,
            generated_answer=result.get("answer", ""),
            expected_answer=result.get("expected_answer"),
            context_chunks=result.get("context_chunks", [])
        )

        evaluated_results.append({
            "config": result.get("config", {}),
            "answer": result.get("answer", ""),
            "scores": eval_result["scores"],
            "feedback": eval_result["feedback"]
        })

    comparison = evaluator.compare_pipelines(evaluated_results)

    return {
        "query": request.query,
        "comparison": comparison,
        "evaluated_results": evaluated_results
    }


# -------------------------------------
# Generate Test Questions
# -------------------------------------

@router.post("/generate-questions")
async def generate_test_questions(request: QuestionGenerationRequest):
    """
    Generate test questions using Ollama.
    """
    from routes.upload import get_docs_store
    docs_store = get_docs_store()

    if request.doc_id not in docs_store:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = docs_store[request.doc_id]
    text = doc.get("text", "")

    if not text:
        raise HTTPException(status_code=400, detail="Document has no text content")

    generator = get_generator(request.model_name)

    questions = generator.generate_test_questions(
        document_text=text,
        num_questions=request.num_questions
    )

    return {
        "doc_id": request.doc_id,
        "filename": doc.get("filename"),
        "questions": questions,
        "count": len(questions)
    }


# -------------------------------------
# Batch Evaluation
# -------------------------------------

@router.post("/batch-evaluate")
async def batch_evaluate(queries: List[Dict[str, Any]]):
    """
    Evaluate multiple query-answer pairs using Ollama.
    """
    evaluator = get_evaluator()

    results = []
    for item in queries:
        eval_result = evaluator.evaluate_response(
            query=item.get("query", ""),
            generated_answer=item.get("generated_answer", ""),
            expected_answer=item.get("expected_answer"),
            context_chunks=item.get("context_chunks", [])
        )

        results.append({
            "query": item.get("query"),
            "scores": eval_result["scores"],
            "feedback": eval_result["feedback"]
        })

    if results:
        avg_scores = {
            k: sum(r["scores"][k] for r in results) / len(results)
            for k in ["relevance", "accuracy", "completeness", "coherence", "faithfulness", "overall"]
        }
    else:
        avg_scores = {}

    return {
        "total_queries": len(queries),
        "results": results,
        "average_scores": avg_scores
    }