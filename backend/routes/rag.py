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


# ------------------------------
# RAG Request Models
# ------------------------------

class RAGRequest(BaseModel):
    query: str
    doc_ids: List[str]
    chunk_size: int = 512
    overlap_percent: int = 10
    top_k: int = 5
    model_name: str = "llama-3.1-8b-instant"  # Updated to Groq model
    temperature: float = 0.7


class RAGExperimentRequest(BaseModel):
    query: str
    doc_ids: List[str]
    chunk_sizes: List[int] = [256, 512, 1024, 2048]
    overlap_percent: int = 10
    top_k: int = 5
    model_name: str = "llama-3.1-8b-instant"  # Updated to Groq model


# ------------------------------
# Run RAG Pipeline
# ------------------------------

@router.post("/run-rag")
async def run_rag(request: RAGRequest):
    start_time = time.time()
    
    docs_store = get_docs_store()

    if not request.doc_ids:
        raise HTTPException(status_code=400, detail="No documents specified")

    # Validate docs
    for doc_id in request.doc_ids:
        if doc_id not in docs_store:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    retriever = get_retriever()
    generator = get_generator()

    retriever.clear()

    total_chunks = 0

    # Process each doc
    for doc_id in request.doc_ids:
        doc = docs_store[doc_id]
        text = doc.get("text", "")

        if not text:
            continue

        chunks_dict = create_chunks(
            text,
            [request.chunk_size],
            overlap_percent=request.overlap_percent,
            method="words"
        )
        chunks = chunks_dict.get(str(request.chunk_size), [])
        total_chunks += len(chunks)

        retriever.add_documents(
            chunks=chunks,
            doc_id=doc_id,
            chunk_size=request.chunk_size
        )

    if total_chunks == 0:
        raise HTTPException(status_code=400, detail="No chunks created from documents")

    # Retrieve chunks
    search_results = retriever.search(
        query=request.query,
        top_k=request.top_k
    )

    if not search_results:
        return {
            "answer": "No relevant information found.",
            "query": request.query,
            "retrieved_chunks": [],
            "config": {
                "chunk_size": request.chunk_size,
                "overlap_percent": request.overlap_percent,
                "top_k": request.top_k,
                "model": request.model_name
            },
            "latency": time.time() - start_time
        }

    context_chunks = [r["chunk"] for r in search_results]

    # Generate answer using Groq with specified model
    generation_result = generator.generate_answer(
        query=request.query,
        context_chunks=context_chunks,
        model_name=request.model_name,  # Pass model_name to generator
        max_tokens=2048,
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


# ------------------------------
# Run RAG Experiments
# ------------------------------

@router.post("/run-experiment")
async def run_experiment(request: RAGExperimentRequest):
    docs_store = get_docs_store()

    if not request.doc_ids:
        raise HTTPException(status_code=400, detail="No documents specified")

    for doc_id in request.doc_ids:
        if doc_id not in docs_store:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    results = []

    for chunk_size in request.chunk_sizes:
        try:
            rag_request = RAGRequest(
                query=request.query,
                doc_ids=request.doc_ids,
                chunk_size=chunk_size,
                overlap_percent=request.overlap_percent,
                top_k=request.top_k,
                model_name=request.model_name  # Use the model from experiment request
            )

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


# ------------------------------
# Retriever Utilities
# ------------------------------

@router.get("/retriever-stats")
def get_retriever_stats():
    retriever = get_retriever()
    return retriever.get_stats()


@router.post("/clear-index")
def clear_index():
    retriever = get_retriever()
    retriever.clear()
    return {"message": "Index cleared successfully"}
