# backend/services/chunker.py
from typing import List, Dict
import re


def chunk_by_words(text: str, chunk_size: int, overlap: int = 0) -> List[str]:
    """
    Chunk text by word count with optional overlap
    
    Args:
        text: Input text to chunk
        chunk_size: Number of words per chunk
        overlap: Number of overlapping words between chunks
    
    Returns:
        List of text chunks
    """
    words = text.split()
    chunks = []
    
    if not words:
        return []
    
    step = chunk_size - overlap
    if step <= 0:
        step = chunk_size  # Fallback if overlap >= chunk_size
    
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        
        # Stop if we've covered all words
        if i + chunk_size >= len(words):
            break
    
    return chunks


def chunk_by_sentences(text: str, chunk_size: int, overlap: int = 0) -> List[str]:
    """
    Chunk text by sentences, aiming for target word count
    
    Args:
        text: Input text to chunk
        chunk_size: Target words per chunk
        overlap: Number of overlapping sentences
    
    Returns:
        List of text chunks
    """
    # Split by sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        sentence_words = len(sentence.split())
        
        if current_word_count + sentence_words > chunk_size and current_chunk:
            # Save current chunk
            chunks.append(" ".join(current_chunk))
            
            # Handle overlap
            if overlap > 0 and len(current_chunk) > overlap:
                current_chunk = current_chunk[-overlap:]
                current_word_count = sum(len(s.split()) for s in current_chunk)
            else:
                current_chunk = []
                current_word_count = 0
        
        current_chunk.append(sentence)
        current_word_count += sentence_words
    
    # Add remaining chunk
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks


def chunk_by_tokens_approximation(text: str, chunk_size: int, overlap: int = 0) -> List[str]:
    """
    Approximate token-based chunking (1 token ≈ 0.75 words for English)
    
    Args:
        text: Input text to chunk
        chunk_size: Target tokens per chunk
        overlap: Number of overlapping tokens
    
    Returns:
        List of text chunks
    """
    # Approximate: 1 token ≈ 0.75 words
    words_per_chunk = int(chunk_size * 0.75)
    overlap_words = int(overlap * 0.75)
    
    return chunk_by_words(text, words_per_chunk, overlap_words)


def create_chunks(
    text: str, 
    chunk_sizes: List[int], 
    overlap_percent: int = 0,
    method: str = "words"
) -> Dict[str, List[str]]:
    """
    Create multiple chunk sets with different sizes
    
    Args:
        text: Input text
        chunk_sizes: List of chunk sizes (e.g., [256, 512, 1024, 2048])
        overlap_percent: Overlap percentage (0-50)
        method: "words", "sentences", or "tokens"
    
    Returns:
        Dictionary mapping chunk size to list of chunks
    """
    result = {}
    
    for size in chunk_sizes:
        overlap = int(size * overlap_percent / 100)
        
        if method == "sentences":
            chunks = chunk_by_sentences(text, size, overlap)
        elif method == "tokens":
            chunks = chunk_by_tokens_approximation(size, overlap)
        else:  # default to words
            chunks = chunk_by_words(text, size, overlap)
        
        result[str(size)] = chunks
    
    return result


# Preset configurations
CHUNK_PRESETS = {
    "small": {"sizes": [256, 512], "overlap": 10},
    "medium": {"sizes": [512, 1024], "overlap": 15},
    "large": {"sizes": [1024, 2048], "overlap": 20},
    "all": {"sizes": [256, 512, 1024, 2048], "overlap": 10}
}


def get_preset_chunks(text: str, preset: str = "all") -> Dict[str, List[str]]:
    """
    Get chunks using preset configuration
    
    Args:
        text: Input text
        preset: Preset name ("small", "medium", "large", "all")
    
    Returns:
        Dictionary of chunks
    """
    config = CHUNK_PRESETS.get(preset, CHUNK_PRESETS["all"])
    return create_chunks(text, config["sizes"], config["overlap"])