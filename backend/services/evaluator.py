# backend/services/evaluator.py
import os
from typing import Dict, Any, List
try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if genai and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class RAGEvaluator:
    """Service for evaluating RAG responses"""
    
    def __init__(self, model_name: str = "models/text-embedding-004"):
        self.model_name = model_name
        if genai and GEMINI_API_KEY:
            self.model = genai.GenerativeModel(model_name)
        else:
            self.model = None
    
    def evaluate_response(
        self,
        query: str,
        generated_answer: str,
        expected_answer: str = None,
        context_chunks: List[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a RAG response using Gemini
        
        Args:
            query: Original query
            generated_answer: Answer from RAG system
            expected_answer: Ground truth answer (optional)
            context_chunks: Retrieved context (optional)
        
        Returns:
            Evaluation scores and feedback
        """
        if not self.model:
            return self._fallback_evaluation(query, generated_answer, expected_answer)
        
        # Build evaluation prompt
        prompt = self._build_evaluation_prompt(
            query, 
            generated_answer, 
            expected_answer,
            context_chunks
        )
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,  # Low temperature for consistent evaluation
                }
            )
            
            # Parse evaluation
            scores = self._parse_evaluation(response.text)
            
            return {
                "scores": scores,
                "feedback": response.text,
                "evaluator_model": self.model_name
            }
        
        except Exception as e:
            print(f"Evaluation error: {e}")
            return self._fallback_evaluation(query, generated_answer, expected_answer)
    
    def _build_evaluation_prompt(
        self,
        query: str,
        generated_answer: str,
        expected_answer: str = None,
        context_chunks: List[str] = None
    ) -> str:
        """Build evaluation prompt"""
        
        context_section = ""
        if context_chunks:
            context = "\n".join([f"[{i+1}] {chunk}" for i, chunk in enumerate(context_chunks)])
            context_section = f"""
RETRIEVED CONTEXT:
{context}
"""
        
        expected_section = ""
        if expected_answer:
            expected_section = f"""
EXPECTED ANSWER:
{expected_answer}
"""
        
        return f"""You are an expert evaluator for RAG (Retrieval-Augmented Generation) systems.

Evaluate the following RAG response:

QUERY:
{query}

GENERATED ANSWER:
{generated_answer}
{expected_section}{context_section}

Provide scores (0-100) for the following metrics:

1. RELEVANCE: How well does the answer address the query?
2. ACCURACY: Is the information factually correct?
3. COMPLETENESS: Does it cover all important aspects?
4. COHERENCE: Is it well-structured and clear?
5. FAITHFULNESS: Does it stay true to the context (no hallucinations)?

Respond in this format:
RELEVANCE: [score]/100
ACCURACY: [score]/100
COMPLETENESS: [score]/100
COHERENCE: [score]/100
FAITHFULNESS: [score]/100
OVERALL: [average score]/100

FEEDBACK:
[Brief explanation of strengths and weaknesses]
"""
    
    def _parse_evaluation(self, text: str) -> Dict[str, float]:
        """Parse evaluation scores from response"""
        scores = {
            "relevance": 0.0,
            "accuracy": 0.0,
            "completeness": 0.0,
            "coherence": 0.0,
            "faithfulness": 0.0,
            "overall": 0.0
        }
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip().upper()
            if ':' in line:
                metric, value = line.split(':', 1)
                metric = metric.strip().lower()
                
                # Extract numeric score
                import re
                numbers = re.findall(r'\d+', value)
                if numbers:
                    score = float(numbers[0])
                    if metric in scores:
                        scores[metric] = score
        
        # Calculate overall if not provided
        if scores["overall"] == 0.0:
            scores["overall"] = sum([
                scores["relevance"],
                scores["accuracy"],
                scores["completeness"],
                scores["coherence"],
                scores["faithfulness"]
            ]) / 5.0
        
        return scores
    
    def _fallback_evaluation(
        self,
        query: str,
        generated_answer: str,
        expected_answer: str = None
    ) -> Dict[str, Any]:
        """Simple fallback evaluation"""
        # Basic heuristics
        answer_length = len(generated_answer.split())
        has_content = answer_length > 10
        
        base_score = 60.0 if has_content else 30.0
        
        scores = {
            "relevance": base_score,
            "accuracy": base_score,
            "completeness": base_score,
            "coherence": base_score,
            "faithfulness": base_score,
            "overall": base_score
        }
        
        feedback = f"""[Fallback Evaluation Mode]
Answer length: {answer_length} words
Basic quality: {"Acceptable" if has_content else "Too short"}

Note: Set GEMINI_API_KEY environment variable for detailed AI evaluation.
"""
        
        return {
            "scores": scores,
            "feedback": feedback,
            "evaluator_model": "fallback"
        }
    
    def compare_pipelines(
        self,
        results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare multiple pipeline results
        
        Args:
            results: List of evaluation results from different pipelines
        
        Returns:
            Comparison summary with winner
        """
        if not results:
            return {"error": "No results to compare"}
        
        # Calculate aggregate scores
        comparisons = []
        for result in results:
            scores = result.get("scores", {})
            comparisons.append({
                "pipeline_config": result.get("config", {}),
                "overall_score": scores.get("overall", 0),
                "relevance": scores.get("relevance", 0),
                "accuracy": scores.get("accuracy", 0),
                "completeness": scores.get("completeness", 0),
                "coherence": scores.get("coherence", 0),
                "faithfulness": scores.get("faithfulness", 0),
            })
        
        # Sort by overall score
        comparisons.sort(key=lambda x: x["overall_score"], reverse=True)
        
        winner = comparisons[0] if comparisons else None
        
        return {
            "winner": winner,
            "all_results": comparisons,
            "total_pipelines": len(comparisons)
        }


# Global evaluator instance
_evaluator = None

def get_evaluator(model_name: str = "models/text-embedding-004") -> RAGEvaluator:
    """Get or create evaluator instance"""
    global _evaluator
    if _evaluator is None:
        _evaluator = RAGEvaluator(model_name)
    return _evaluator