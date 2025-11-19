# backend/services/retriever.py
from typing import List, Dict, Any
import numpy as np
import faiss
from services.embedder import get_embedder


class FAISSRetriever:
    """FAISS-based retriever for fast vector search"""
    
    def __init__(self):
        self.embedder = get_embedder()
        self.index = None
        self.chunks: List[str] = []
        self.metadata: List[Dict[str, Any]] = []
        self.dimension = None
    
    def add_documents(
        self, 
        chunks: List[str], 
        doc_id: str = None,
        chunk_size: int = None
    ) -> None:
        """
        Add document chunks to FAISS index
        
        Args:
            chunks: List of text chunks
            doc_id: Document identifier
            chunk_size: Size of chunks used
        """
        print(f"Adding {len(chunks)} chunks to FAISS index...")
        
        # Generate embeddings
        embeddings = self.embedder.embed_batch(chunks)
        
        # Initialize index on first add
        if self.index is None:
            self.dimension = len(embeddings[0])
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner product (for normalized vectors)
        
        # Convert to numpy array and normalize
        embeddings_np = np.array(embeddings, dtype=np.float32)
        faiss.normalize_L2(embeddings_np)
        
        # Add to index
        self.index.add(embeddings_np)
        
        # Store chunks and metadata
        for i, chunk in enumerate(chunks):
            self.chunks.append(chunk)
            self.metadata.append({
                "doc_id": doc_id,
                "chunk_id": i,
                "chunk_size": chunk_size,
                "text": chunk
            })
        
        print(f"Total chunks in FAISS index: {len(self.chunks)}")
    
    def search(
        self, 
        query: str, 
        top_k: int = 5,
        min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Search for most relevant chunks using FAISS
        
        Args:
            query: Search query
            top_k: Number of results to return
            min_score: Minimum similarity score
        
        Returns:
            List of results with chunks and scores
        """
        if self.index is None or len(self.chunks) == 0:
            return []
        
        # Get query embedding
        query_embedding = self.embedder.embed_query(query)
        query_np = np.array([query_embedding], dtype=np.float32)
        faiss.normalize_L2(query_np)
        
        # Search
        k = min(top_k, len(self.chunks))
        scores, indices = self.index.search(query_np, k)
        
        # Format results
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if score >= min_score:
                results.append({
                    "chunk": self.chunks[idx],
                    "score": float(score),
                    "metadata": self.metadata[idx]
                })
        
        return results
    
    def clear(self) -> None:
        """Clear the FAISS index"""
        self.index = None
        self.chunks = []
        self.metadata = []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get retriever statistics"""
        return {
            "total_chunks": len(self.chunks),
            "embedding_dim": self.dimension,
            "has_data": self.index is not None and len(self.chunks) > 0,
            "index_type": "FAISS IndexFlatIP"
        }


# Global retriever instance
_retriever: FAISSRetriever | None = None


def get_retriever() -> FAISSRetriever:
    """Get or create retriever instance"""
    global _retriever
    if _retriever is None:
        _retriever = FAISSRetriever()
    return _retriever
