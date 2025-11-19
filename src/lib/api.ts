// API service for backend integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Document {
  doc_id: string;
  filename: string;
  file_type: string;
  text_length: number;
  word_count: number;
  status: string;
}

export interface RAGRequest {
  query: string;
  doc_ids: string[];
  chunk_size?: number;
  overlap_percent?: number;
  top_k?: number;
  model_name?: string;
  temperature?: number;
}

export interface RAGResponse {
  answer: string;
  query: string;
  retrieved_chunks: Array<{
    chunk: string;
    doc_id: string;
    score: number;
  }>;
  config: {
    chunk_size: number;
    overlap_percent: number;
    top_k: number;
    model: string;
    temperature: number;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  latency: number;
  total_chunks_indexed: number;
}

export interface ExperimentRequest {
  query: string;
  doc_ids: string[];
  chunk_sizes?: number[];
  overlap_percent?: number;
  top_k?: number;
  model_name?: string;
}

export interface ExperimentResponse {
  query: string;
  experiments: Array<{
    chunk_size: number;
    result?: RAGResponse;
    error?: string;
  }>;
  total_experiments: number;
}

export interface EvaluationRequest {
  query: string;
  generated_answer: string;
  expected_answer?: string;
  context_chunks?: string[];
  evaluator_model?: string;
}

export interface EvaluationResponse {
  scores: {
    relevance: number;
    accuracy: number;
    completeness: number;
    coherence: number;
    faithfulness: number;
    overall: number;
  };
  feedback: string;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        // If JSON parsing fails, use status text
      }
      throw new Error(errorDetail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error: Failed to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

// Upload endpoints
export const uploadApi = {
  uploadDocument: async (file: File): Promise<{ doc_id: string; filename: string; status: string; text_length?: number; word_count?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/upload-docs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  listDocuments: async (): Promise<Document[]> => {
    return apiCall<Document[]>('/api/docs');
  },

  getDocument: async (doc_id: string): Promise<Document & { text_preview?: string }> => {
    return apiCall<Document & { text_preview?: string }>(`/api/docs/${doc_id}`);
  },

  deleteDocument: async (doc_id: string): Promise<{ message: string; doc_id: string }> => {
    return apiCall<{ message: string; doc_id: string }>(`/api/docs/${doc_id}`, {
      method: 'DELETE',
    });
  },
};

// RAG endpoints
export const ragApi = {
  runRAG: async (request: RAGRequest): Promise<RAGResponse> => {
    return apiCall<RAGResponse>('/api/run-rag', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  runExperiment: async (request: ExperimentRequest): Promise<ExperimentResponse> => {
    return apiCall<ExperimentResponse>('/api/run-experiment', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getRetrieverStats: async (): Promise<any> => {
    return apiCall('/api/retriever-stats');
  },

  clearIndex: async (): Promise<{ message: string }> => {
    return apiCall<{ message: string }>('/api/clear-index', {
      method: 'POST',
    });
  },
};

// Evaluation endpoints
export const evaluationApi = {
  evaluate: async (request: EvaluationRequest): Promise<EvaluationResponse> => {
    return apiCall<EvaluationResponse>('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  comparePipelines: async (query: string, results: any[]): Promise<any> => {
    return apiCall('/api/compare-pipelines', {
      method: 'POST',
      body: JSON.stringify({ query, results }),
    });
  },

  generateQuestions: async (doc_id: string, num_questions: number = 5, model_name: string = 'gemini-2.0-flash-exp'): Promise<{ doc_id: string; filename: string; questions: string[]; count: number }> => {
    return apiCall('/api/generate-questions', {
      method: 'POST',
      body: JSON.stringify({ doc_id, num_questions, model_name }),
    });
  },

  batchEvaluate: async (queries: Array<{ query: string; generated_answer: string; expected_answer?: string; context_chunks?: string[] }>): Promise<any> => {
    return apiCall('/api/batch-evaluate', {
      method: 'POST',
      body: JSON.stringify(queries),
    });
  },
};

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
  return apiCall<{ status: string }>('/health');
};


