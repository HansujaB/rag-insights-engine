import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Loader2, FileText, Settings, 
  MessageSquare, BarChart3, Sparkles, XCircle, Copy, Check
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { uploadApi, ragApi, evaluationApi, Document, RAGResponse, EvaluationResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const Query = () => {
  const [query, setQuery] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [chunkSize, setChunkSize] = useState(512);
  const [topK, setTopK] = useState(5);
  const [overlapPercent, setOverlapPercent] = useState(10);
  const [modelName, setModelName] = useState("gemini-2.0-flash-exp");
  const [temperature, setTemperature] = useState(0.7);
  const [ragResult, setRagResult] = useState<RAGResponse | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: uploadApi.listDocuments,
  });

  const handleDocToggle = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleRunRAG = async () => {
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a query",
        variant: "destructive",
      });
      return;
    }

    if (selectedDocs.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setRagResult(null);
    setEvaluationResult(null);
    setError(null); 

    try {
      const result = await ragApi.runRAG({
        query: query.trim(),
        doc_ids: selectedDocs,
        chunk_size: chunkSize,
        overlap_percent: overlapPercent,
        top_k: topK,
        model_name: modelName,
        temperature: temperature,
      });

      setRagResult(result);
      setError(null);
      toast({
        title: "Query completed",
        description: `Retrieved ${result.retrieved_chunks.length} chunks in ${result.latency.toFixed(2)}s`,
      });
      
      // Auto-scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to run RAG query";
      setError(errorMessage);
      setRagResult(null);
      toast({
        title: "Query failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };


  const handleEvaluate = async () => {
    if (!ragResult) {
      toast({
        title: "No result to evaluate",
        description: "Please run a query first",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);

    try {
      const contextChunks = ragResult.retrieved_chunks.map(chunk => chunk.chunk);
      const result = await evaluationApi.evaluate({
        query: ragResult.query,
        generated_answer: ragResult.answer,
        context_chunks: contextChunks,
        evaluator_model: modelName,
      });

      setEvaluationResult(result);
      toast({
        title: "Evaluation completed",
        description: `Overall score: ${(result.scores.overall * 100).toFixed(1)}%`,
      });
    } catch (error: any) {
      toast({
        title: "Evaluation failed",
        description: error.message || "Failed to evaluate response",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCopyAnswer = async () => {
    if (!ragResult) return;
    try {
      await navigator.clipboard.writeText(ragResult.answer);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Answer copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              RAG Query
            </h1>
            <p className="text-xl text-muted-foreground">
              Ask questions about your uploaded documents
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Configuration */}
            <div className="lg:col-span-1 space-y-6">
              {/* Document Selection */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Documents</h2>
                </div>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents available. Upload documents first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {documents.map((doc: Document) => (
                      <div key={doc.doc_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={doc.doc_id}
                          checked={selectedDocs.includes(doc.doc_id)}
                          onCheckedChange={() => handleDocToggle(doc.doc_id)}
                        />
                        <label
                          htmlFor={doc.doc_id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <span>{doc.filename}</span>
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {doc.word_count.toLocaleString()} words
                          </p>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Configuration */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Configuration</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chunk-size">Chunk Size</Label>
                    <Input
                      id="chunk-size"
                      type="number"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(parseInt(e.target.value) || 512)}
                      min={128}
                      max={4096}
                      step={128}
                    />
                  </div>
                  <div>
                    <Label htmlFor="overlap">Overlap %</Label>
                    <Input
                      id="overlap"
                      type="number"
                      value={overlapPercent}
                      onChange={(e) => setOverlapPercent(parseInt(e.target.value) || 10)}
                      min={0}
                      max={50}
                    />
                  </div>
                  <div>
                    <Label htmlFor="top-k">Top K</Label>
                    <Input
                      id="top-k"
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Query and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Query Input */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Query</h2>
                </div>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter your question about the documents..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleRunRAG}
                    disabled={isRunning || selectedDocs.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Run Query
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Error Display */}
              {error && !isRunning && (
                <Card className="p-6 border-red-500 bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle className="w-5 h-5" />
                    <div>
                      <h3 className="font-semibold">Error</h3>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Loading State */}
              {isRunning && (
                <Card className="p-6">
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Processing your query...</span>
                  </div>
                </Card>
              )}

              {/* Results */}
              <div ref={resultsRef}>
                {ragResult && !isRunning && (
                <Tabs defaultValue="answer" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="answer">Answer</TabsTrigger>
                    <TabsTrigger value="chunks">Retrieved Chunks</TabsTrigger>
                    <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="answer" className="space-y-4">
                    <Card className="p-6 border-2 border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">Answer</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>Latency: {ragResult.latency.toFixed(2)}s</span>
                            {ragResult.usage && (
                              <span>• Tokens: {ragResult.usage.total_tokens}</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyAnswer}
                            className="h-8 w-8 p-0"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-base leading-relaxed whitespace-pre-wrap bg-secondary/30 p-4 rounded-lg">
                          {ragResult.answer}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">Chunk Size: {ragResult.config.chunk_size}</Badge>
                          <Badge variant="outline">Top K: {ragResult.config.top_k}</Badge>
                          <Badge variant="outline">Model: {ragResult.config.model}</Badge>
                          <Badge variant="outline">Chunks Indexed: {ragResult.total_chunks_indexed}</Badge>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="chunks" className="space-y-4">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Retrieved Chunks ({ragResult.retrieved_chunks.length})
                      </h3>
                      <div className="space-y-4">
                        {ragResult.retrieved_chunks.map((chunk, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg bg-secondary/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">Rank #{index + 1}</Badge>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span>Score: {chunk.score.toFixed(4)}</span>
                                <span>• Doc: {chunk.doc_id.slice(0, 8)}...</span>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed">{chunk.chunk}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="evaluation" className="space-y-4">
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Evaluation</h3>
                        {!evaluationResult && (
                          <Button
                            onClick={handleEvaluate}
                            disabled={isEvaluating}
                            size="sm"
                          >
                            {isEvaluating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Evaluating...
                              </>
                            ) : (
                              <>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Evaluate Response
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {evaluationResult ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(evaluationResult.scores).map(([key, value]) => (
                              <div key={key} className="p-4 border rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1 capitalize">
                                  {key}
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary transition-all"
                                      style={{ width: `${value * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold">
                                    {(value * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 p-4 bg-secondary rounded-lg">
                            <p className="text-sm font-semibold mb-2">Feedback</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {evaluationResult.feedback}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Click "Evaluate Response" to analyze the answer quality
                        </p>
                      )}
                    </Card>
                  </TabsContent>
                </Tabs>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Query;

