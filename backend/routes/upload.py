# backend/routes/upload.py
import os
import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import asyncio
from concurrent.futures import ThreadPoolExecutor
import pdfplumber
from docx import Document as DocxDocument
import mimetypes

router = APIRouter()

# Storage
UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory document store
docs: Dict[str, Dict[str, Any]] = {}

# Thread pool for blocking operations
thread_pool = ThreadPoolExecutor(max_workers=4)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using pdfplumber"""
    texts = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                texts.append(page_text)
        return "\n".join(texts)
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX"""
    try:
        doc = DocxDocument(file_path)
        texts = [paragraph.text for paragraph in doc.paragraphs]
        return "\n".join(texts)
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return ""


def extract_text_from_txt(file_path: str) -> str:
    """Extract text from TXT file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"TXT extraction error: {e}")
        return ""


def extract_text(file_path: str, file_type: str) -> str:
    """Route to appropriate extractor based on file type"""
    if file_type == "application/pdf" or file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"] or file_path.endswith(('.docx', '.doc')):
        return extract_text_from_docx(file_path)
    elif file_type == "text/plain" or file_path.endswith('.txt'):
        return extract_text_from_txt(file_path)
    else:
        return ""


@router.post("/upload-docs")
async def upload_docs(file: UploadFile = File(...)):
    """
    Upload and process documents (PDF, DOCX, TXT)
    """
    # Validate file type
    allowed_types = ['.pdf', '.docx', '.doc', '.txt']
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(allowed_types)}"
        )
    
    # Generate unique ID
    doc_id = str(uuid.uuid4())
    dest_path = os.path.join(UPLOAD_DIR, f"{doc_id}{file_ext}")
    
    # Save file
    try:
        contents = await file.read()
        with open(dest_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract text (run in thread pool to avoid blocking)
    loop = asyncio.get_event_loop()
    try:
        text = await loop.run_in_executor(
            thread_pool, 
            extract_text, 
            dest_path, 
            file.content_type or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")
    
    # Check if extraction was successful
    if not text.strip():
        docs[doc_id] = {
            "filename": file.filename,
            "path": dest_path,
            "text": "",
            "file_type": file_ext,
            "status": "extraction_failed",
            "note": "Text extraction returned empty. File may be image-based or corrupted."
        }
        return JSONResponse(
            status_code=200,
            content={
                "doc_id": doc_id,
                "filename": file.filename,
                "status": "extraction_failed",
                "warning": "Text extraction failed or returned empty content"
            }
        )
    
    # Store document
    docs[doc_id] = {
        "filename": file.filename,
        "path": dest_path,
        "text": text,
        "file_type": file_ext,
        "text_length": len(text),
        "word_count": len(text.split()),
        "status": "processed"
    }
    
    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "text_length": len(text),
        "word_count": len(text.split()),
        "status": "processed"
    }


@router.get("/docs")
def list_docs():
    """List all uploaded documents"""
    return [
        {
            "doc_id": k,
            "filename": v["filename"],
            "file_type": v.get("file_type", "unknown"),
            "text_length": v.get("text_length", 0),
            "word_count": v.get("word_count", 0),
            "status": v.get("status", "unknown")
        }
        for k, v in docs.items()
    ]


@router.get("/docs/{doc_id}")
def get_doc(doc_id: str):
    """Get specific document details"""
    if doc_id not in docs:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = docs[doc_id]
    return {
        "doc_id": doc_id,
        "filename": doc["filename"],
        "file_type": doc.get("file_type"),
        "text_preview": doc["text"][:500] + "..." if len(doc["text"]) > 500 else doc["text"],
        "text_length": doc.get("text_length", 0),
        "word_count": doc.get("word_count", 0),
        "status": doc.get("status")
    }


@router.delete("/docs/{doc_id}")
def delete_doc(doc_id: str):
    """Delete a document"""
    if doc_id not in docs:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = docs[doc_id]
    
    # Delete file from disk
    if os.path.exists(doc["path"]):
        os.remove(doc["path"])
    
    # Remove from memory
    del docs[doc_id]
    
    return {"message": "Document deleted", "doc_id": doc_id}


# Export docs for other modules
def get_docs_store():
    """Get the documents store for other modules"""
    return docs