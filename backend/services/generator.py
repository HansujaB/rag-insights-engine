# backend/services/generator.py
import os
from typing import List, Dict, Any
try:
    from groq import Groq
except ImportError:
    Groq = None

# Configure Groq API
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class LLMGenerator:
    """Service for generating answers using Groq API"""
    
    def __init__(self, model_name: str = "llama-3.1-8b-instant"):
        self.model_name = model_name
        if Groq and GROQ_API_KEY:
            self.client = Groq(api_key=GROQ_API_KEY)
        else:
            self.client = None
    
    def generate_answer(
        self, 
        query: str, 
        context_chunks: List[str],
        model_name: str = None,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Generate answer using retrieved context
        
        Args:
            query: User query
            context_chunks: Retrieved text chunks
            model_name: Override model name (optional)
            max_tokens: Maximum response length
            temperature: Generation temperature
        
        Returns:
            Dictionary with answer and metadata
        """
        # Use provided model_name or fall back to instance default
        model_to_use = model_name or self.model_name
        
        # Build context
        context = "\n\n".join([f"[{i+1}] {chunk}" for i, chunk in enumerate(context_chunks)])
        
        # Build prompt
        prompt = self._build_rag_prompt(query, context)
        
        # Generate response
        if self.client:
            try:
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful assistant that answers questions based on provided context. Always cite your sources using [1], [2], etc."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    model=model_to_use,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                
                answer = chat_completion.choices[0].message.content
                
                # Extract usage info
                usage = {
                    "prompt_tokens": chat_completion.usage.prompt_tokens,
                    "completion_tokens": chat_completion.usage.completion_tokens,
                    "total_tokens": chat_completion.usage.total_tokens
                }
                
                return {
                    "answer": answer,
                    "model": model_to_use,
                    "usage": usage,
                    "context_used": len(context_chunks)
                }
            
            except Exception as e:
                print(f"Generation error: {e}")
                return self._fallback_answer(query, context_chunks)
        else:
            return self._fallback_answer(query, context_chunks)
    
    def _build_rag_prompt(self, query: str, context: str) -> str:
        """Build RAG prompt template"""
        return f"""You are a helpful assistant that answers questions based on provided context.

CONTEXT:
{context}

QUESTION:
{query}

INSTRUCTIONS:
- Answer the question using ONLY the information provided in the context above
- If the context doesn't contain enough information to answer, say so
- Be concise and accurate
- Cite which context chunks you used (e.g., [1], [2])

ANSWER:"""
    
    def _fallback_answer(self, query: str, context_chunks: List[str]) -> Dict[str, Any]:
        """Generate a simple fallback answer when API is not available"""
        answer = f"[Fallback Mode - No API Key] Based on {len(context_chunks)} retrieved chunks:\n\n"
        answer += "The most relevant information found:\n"
        answer += context_chunks[0][:200] + "..." if context_chunks else "No context available"
        
        return {
            "answer": answer,
            "model": "fallback",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "context_used": len(context_chunks),
            "note": "Fallback mode - set GROQ_API_KEY environment variable for full functionality"
        }
    
    def generate_test_questions(
        self, 
        document_text: str, 
        num_questions: int = 5
    ) -> List[Dict[str, str]]:
        """
        Generate test questions from document
        
        Args:
            document_text: Source document text
            num_questions: Number of questions to generate
        
        Returns:
            List of question-answer pairs
        """
        if not self.client:
            return self._fallback_questions(document_text, num_questions)
        
        prompt = f"""Based on the following document, generate {num_questions} diverse test questions with expected answers.

DOCUMENT:
{document_text[:2000]}...

Generate questions that:
1. Cover different aspects of the document
2. Require understanding of the content
3. Have clear, factual answers

Format your response as:
Q1: [question]
A1: [answer]

Q2: [question]
A2: [answer]

etc.
"""
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that generates test questions from documents."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model_name,
                temperature=0.7,
                max_tokens=1500
            )
            
            text = chat_completion.choices[0].message.content
            
            # Parse questions and answers
            questions = []
            lines = text.split('\n')
            current_q = None
            current_a = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('Q') and ':' in line:
                    if current_q and current_a:
                        questions.append({"question": current_q, "expected_answer": current_a})
                    current_q = line.split(':', 1)[1].strip()
                    current_a = None
                elif line.startswith('A') and ':' in line and current_q:
                    current_a = line.split(':', 1)[1].strip()
            
            # Add last pair
            if current_q and current_a:
                questions.append({"question": current_q, "expected_answer": current_a})
            
            return questions[:num_questions]
        
        except Exception as e:
            print(f"Question generation error: {e}")
            return self._fallback_questions(document_text, num_questions)
    
    def _fallback_questions(self, text: str, num: int) -> List[Dict[str, str]]:
        """Generate simple fallback questions"""
        return [
            {
                "question": f"Sample question {i+1} about the document",
                "expected_answer": "Sample answer - set GROQ_API_KEY for real question generation"
            }
            for i in range(num)
        ]


# Global generator instance
_generator = None

def get_generator(model_name: str = "llama-3.1-8b-instant") -> LLMGenerator:
    """Get or create generator instance"""
    global _generator
    if _generator is None:
        _generator = LLMGenerator(model_name)
    return _generator
