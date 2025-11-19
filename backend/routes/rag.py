# backend/routes/rag.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time

from services.chunker import create_chunks
from services.embedder import get_embedder
from services.retriever import get_retriever
from services.generator import get_generator
from routes.upload import get_docs_store

router = APIRouter()


class RAGRequest(BaseModel):
    query: str
    doc_ids: List[str]
    chunk_size: int = 512
    overlap_percent: int = 10
    top_k: int = 5
    model_name: str = "gemini-2.0-flash-exp"
    temperature: float = 0.7


class RAGExperimentRequest(BaseModel):
    query: str
    doc_ids: List[str]
    chunk_sizes: List[int] = [256, 512, 1024, 2048]
    overlap_percent: int = 10
    top_k: int = 5
    model_name: str = "gemini-2.0-flash-exp"


@router.post("/run-rag")
async def run_rag(request: RAGRequest):
    """
    Run RAG pipeline with specific configuration
    
    This endpoint:
    1. Chunks documents with specified size
    2. Embeds chunks
    3. Retrieves relevant chunks for query
    4. Generates answer using LLM
    """
    start_time = time.time()
    
    # Get documents
    docs_store = get_docs_store()
    
    if not request.doc_ids:
        raise HTTPException(status_code=400, detail="No documents specified")
    
    # Validate documents exist
    for doc_id in request.doc_ids:
        if doc_id not in docs_store:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    
    # Get retriever and generator
    retriever = get_retriever()
    generator = get_generator(request.model_name)
    
    # Clear previous data
    retriever.clear()
    
    # Process each document
    total_chunks = 0
    for doc_id in request.doc_ids:
        doc = docs_store[doc_id]
        text = doc.get("text", "")
        
        if not text:
            continue
        
        # Create chunks
        chunks_dict = create_chunks(
            text,
            [request.chunk_size],
            overlap_percent=request.overlap_percent,
            method="words"
        )
        
        chunks = chunks_dict.get(str(request.chunk_size), [])
        total_chunks += len(chunks)
        
        # Add to retriever
        retriever.add_documents(
            chunks=chunks,
            doc_id=doc_id,
            chunk_size=request.chunk_size
        )
    
    if total_chunks == 0:
        raise HTTPException(status_code=400, detail="No chunks created from documents")
    
    # Search for relevant chunks
    search_results = retriever.search(
        query=request.query,
        top_k=request.top_k
    )
    
    if not search_results:
        return {
            "answer": "No relevant information found in the documents.",
            "query": request.query,
            "retrieved_chunks": [],
            "config": {
                "chunk_size": request.chunk_size,
                "overlap_percent": request.overlap_percent,
                "top_k": request.top_k
            },
            "latency": time.time() - start_time
        }
    
    # Extract chunks for generation
    context_chunks = [r["chunk"] for r in search_results]
    
    # Generate answer with increased token limit for better responses
    generation_result = generator.generate_answer(
        query=request.query,
        context_chunks=context_chunks,
        max_tokens=2048,  # Increased from default 1000 for better responses
        temperature=request.temperature
    )
    
    end_time = time.time()
    
    return {
        "answer": generation_result["answer"],
        "query": request.query,
        "retrieved_chunks": search_results,
        "config": {
            "chunk_size": request.chunk_size,
            "overlap_percent": request.overlap_percent,
            "top_k": request.top_k,
            "model": request.model_name,
            "temperature": request.temperature
        },
        "usage": generation_result.get("usage", {}),
        "latency": end_time - start_time,
        "total_chunks_indexed": total_chunks
    }


@router.post("/run-experiment")
async def run_experiment(request: RAGExperimentRequest):
    """
    Run RAG experiment with multiple chunk sizes
    
    Tests different chunking strategies and compares results
    """
    docs_store = get_docs_store()
    
    if not request.doc_ids:
        raise HTTPException(status_code=400, detail="No documents specified")
    
    # Validate documents
    for doc_id in request.doc_ids:
        if doc_id not in docs_store:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    
    results = []
    
    # Test each chunk size
    for chunk_size in request.chunk_sizes:
        try:
            # Create RAG request
            rag_request = RAGRequest(
                query=request.query,
                doc_ids=request.doc_ids,
                chunk_size=chunk_size,
                overlap_percent=request.overlap_percent,
                top_k=request.top_k,
                model_name=request.model_name
            )
            
            # Run RAG
            result = await run_rag(rag_request)
            
            results.append({
                "chunk_size": chunk_size,
                "result": result
            })
        
        except Exception as e:
            results.append({
                "chunk_size": chunk_size,
                "error": str(e)
            })
    
    return {
        "query": request.query,
        "experiments": results,
        "total_experiments": len(results)
    }


@router.get("/retriever-stats")
def get_retriever_stats():
    """Get current retriever statistics"""
    retriever = get_retriever()
    return retriever.get_stats()


@router.post("/clear-index")
def clear_index():
    """Clear the retriever index"""
    retriever = get_retriever()
    retriever.clear()
    return {"message": "Index cleared successfully"}