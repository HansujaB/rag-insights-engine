# RAG Insights Engine

A comprehensive RAG (Retrieval-Augmented Generation) testing and optimization platform that allows you to upload documents, run queries, experiment with different configurations, and evaluate results.

## 🚀 Features

### Document Management
- **Upload Documents**: Support for PDF, DOCX, and TXT files
- **Document List**: View all uploaded documents with metadata (word count, character count, status)
- **Document Deletion**: Remove documents from the system
- **Real-time Updates**: Auto-refresh document lists and status

### RAG Query Interface
- **Interactive Querying**: Ask questions about your uploaded documents
- **Document Selection**: Choose which documents to query
- **Configurable Parameters**:
  - Chunk size (128-4096 tokens)
  - Overlap percentage (0-50%)
  - Top K retrieval (1-20 chunks)
  - Model selection
  - Temperature control
- **Results Display**:
  - Generated answers
  - Retrieved chunks with relevance scores
  - Response evaluation metrics

### Experimentation
- **Multi-Configuration Testing**: Test multiple chunk sizes simultaneously
- **Comparative Analysis**: Compare results across different configurations
- **Experiment History**: Track and review past experiments
- **Best Configuration Identification**: Automatically identify optimal settings

### Analytics Dashboard
- **Real-time Metrics**: 
  - Total documents and words
  - Indexed chunks count
  - Embedding dimensions
- **Document Statistics**: Overview by file type and status
- **Retriever Stats**: Vector index information and chunk distribution
- **Top Documents**: Largest documents by word count

### Evaluation System
- **Multi-dimensional Scoring**:
  - Relevance
  - Accuracy
  - Completeness
  - Coherence
  - Faithfulness
  - Overall score
- **Detailed Feedback**: AI-generated evaluation feedback
- **Batch Evaluation**: Evaluate multiple query-answer pairs

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **TanStack Query** for data fetching
- **shadcn/ui** components
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **FastAPI** for REST API
- **Google Gemini AI** for LLM and embeddings
- **FAISS** for vector search
- **pdfplumber** for PDF text extraction
- **python-docx** for DOCX processing

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rag-insights-engine
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file in the backend directory
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. Frontend Setup

```bash
# From the root directory
npm install

# Create .env file for frontend (optional)
echo "VITE_API_URL=http://localhost:8000" > .env
```

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### Start Frontend Development Server

```bash
# From root directory
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📖 Usage Guide

### 1. Upload Documents

1. Navigate to the **Upload** page
2. Drag and drop files or click to browse
3. Supported formats: PDF, DOCX, TXT
4. View uploaded documents in the list below

### 2. Query Documents

1. Go to the **Query** page
2. Select one or more documents
3. Enter your question
4. Configure parameters (optional)
5. Click "Run Query"
6. View results in tabs:
   - **Answer**: Generated response
   - **Retrieved Chunks**: Source chunks with scores
   - **Evaluation**: Quality metrics

### 3. Run Experiments

1. Navigate to **Experiments** page
2. Click "New Experiment"
3. Enter query and select documents
4. Choose chunk sizes to test
5. Configure other parameters
6. Run experiment and compare results

### 4. View Analytics

1. Go to **Dashboard** page
2. View real-time metrics
3. Check document statistics
4. Monitor retriever performance

## 🔌 API Endpoints

### Document Management
- `POST /api/upload-docs` - Upload a document
- `GET /api/docs` - List all documents
- `GET /api/docs/{doc_id}` - Get document details
- `DELETE /api/docs/{doc_id}` - Delete a document

### RAG Operations
- `POST /api/run-rag` - Run RAG pipeline with query
- `POST /api/run-experiment` - Run multi-configuration experiment
- `GET /api/retriever-stats` - Get retriever statistics
- `POST /api/clear-index` - Clear vector index

### Evaluation
- `POST /api/evaluate` - Evaluate a response
- `POST /api/compare-pipelines` - Compare multiple results
- `POST /api/generate-questions` - Generate test questions from document
- `POST /api/batch-evaluate` - Batch evaluation

### Health
- `GET /health` - Health check
- `GET /` - API information

## 📁 Project Structure

```
rag-insights-engine/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   ├── upload.py           # Document upload endpoints
│   │   ├── rag.py              # RAG pipeline endpoints
│   │   └── evaluate.py         # Evaluation endpoints
│   └── services/
│       ├── chunker.py          # Text chunking service
│       ├── embedder.py         # Embedding generation
│       ├── retriever.py        # Vector search
│       ├── generator.py        # LLM answer generation
│       └── evaluator.py        # Response evaluation
├── src/
│   ├── pages/
│   │   ├── Index.tsx          # Landing page
│   │   ├── Upload.tsx          # Document upload page
│   │   ├── Query.tsx           # RAG query interface
│   │   ├── Experiments.tsx     # Experiment management
│   │   └── Dashboard.tsx       # Analytics dashboard
│   ├── components/
│   │   ├── Navigation.tsx     # Main navigation
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       └── api.ts             # API client functions
├── package.json               # Frontend dependencies
└── README.md                 # This file
```

## 🔐 Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_google_gemini_api_key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## 🧪 Development

### Backend Development
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend Development
```bash
npm run dev
```

### Build for Production
```bash
# Frontend
npm run build

# Backend
# Use a production ASGI server like gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🐛 Troubleshooting

### Backend Issues
- **Import errors**: Ensure virtual environment is activated
- **API key errors**: Check `.env` file has correct `GEMINI_API_KEY`
- **Port already in use**: Change port in uvicorn command

### Frontend Issues
- **API connection errors**: Verify `VITE_API_URL` matches backend URL
- **CORS errors**: Check backend CORS configuration in `main.py`
- **Build errors**: Clear `node_modules` and reinstall

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using FastAPI, React, and Google Gemini AI**
