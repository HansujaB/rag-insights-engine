import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Play, Settings, Loader2, FileText, 
  BarChart3, TrendingUp, Zap, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { uploadApi, ragApi, evaluationApi, Document, ExperimentResponse, RAGResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface ExperimentResult {
  id: string;
  query: string;
  docIds: string[];
  chunkSizes: number[];
  status: 'running' | 'completed' | 'error';
  results?: ExperimentResponse;
  createdAt: Date;
}

const Experiments = () => {
  const [experiments, setExperiments] = useState<ExperimentResult[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [chunkSizes, setChunkSizes] = useState<number[]>([256, 512, 1024, 2048]);
  const [topK, setTopK] = useState(5);
  const [overlapPercent, setOverlapPercent] = useState(10);
  const [modelName, setModelName] = useState("gemini-2.0-flash-exp");
  const [isRunning, setIsRunning] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
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

  const handleChunkSizeToggle = (size: number) => {
    setChunkSizes(prev => 
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size].sort((a, b) => a - b)
    );
  };

  const handleRunExperiment = async () => {
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

    if (chunkSizes.length === 0) {
      toast({
        title: "No chunk sizes selected",
        description: "Please select at least one chunk size",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    const experimentId = Date.now().toString();
    
    const newExperiment: ExperimentResult = {
      id: experimentId,
      query: query.trim(),
      docIds: selectedDocs,
      chunkSizes: chunkSizes,
      status: 'running',
      createdAt: new Date(),
    };

    setExperiments(prev => [newExperiment, ...prev]);
    setIsDialogOpen(false);

    try {
      const result = await ragApi.runExperiment({
        query: query.trim(),
        doc_ids: selectedDocs,
        chunk_sizes: chunkSizes,
        overlap_percent: overlapPercent,
        top_k: topK,
        model_name: modelName,
      });

      setExperiments(prev => prev.map(exp => 
        exp.id === experimentId 
          ? { ...exp, status: 'completed', results: result }
          : exp
      ));

      toast({
        title: "Experiment completed",
        description: `Tested ${result.total_experiments} configurations`,
      });
    } catch (error: any) {
      setExperiments(prev => prev.map(exp => 
        exp.id === experimentId 
          ? { ...exp, status: 'error' }
          : exp
      ));
      toast({
        title: "Experiment failed",
        description: error.message || "Failed to run experiment",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-primary text-primary-foreground";
      case "completed":
        return "bg-green-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getBestResult = (experiment: ExperimentResult) => {
    if (!experiment.results || experiment.results.experiments.length === 0) return null;
    
    // Find result with most chunks retrieved (simple heuristic)
    return experiment.results.experiments
      .filter(e => e.result)
      .sort((a, b) => 
        (b.result?.retrieved_chunks.length || 0) - (a.result?.retrieved_chunks.length || 0)
      )[0];
  };

  const toggleAnswer = (experimentId: string, index: number) => {
    const key = `${experimentId}-${index}`;
    setExpandedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Experiments
              </h1>
              <p className="text-xl text-muted-foreground">
                Test multiple RAG configurations and compare results
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  New Experiment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Experiment</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div>
                    <Label htmlFor="exp-query">Query</Label>
                    <Textarea
                      id="exp-query"
                      placeholder="Enter your question..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Select Documents</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                      {docsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : documents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No documents available
                        </p>
                      ) : (
                        documents.map((doc: Document) => (
                          <div key={doc.doc_id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`exp-doc-${doc.doc_id}`}
                              checked={selectedDocs.includes(doc.doc_id)}
                              onCheckedChange={() => handleDocToggle(doc.doc_id)}
                            />
                            <label
                              htmlFor={`exp-doc-${doc.doc_id}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {doc.filename}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Chunk Sizes to Test</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[256, 512, 1024, 2048].map((size) => (
                        <Button
                          key={size}
                          variant={chunkSizes.includes(size) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleChunkSizeToggle(size)}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="exp-topk">Top K</Label>
                      <Input
                        id="exp-topk"
                        type="number"
                        value={topK}
                        onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                        min={1}
                        max={20}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="exp-overlap">Overlap %</Label>
                      <Input
                        id="exp-overlap"
                        type="number"
                        value={overlapPercent}
                        onChange={(e) => setOverlapPercent(parseInt(e.target.value) || 10)}
                        min={0}
                        max={50}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="exp-model">Model</Label>
                    <Input
                      id="exp-model"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <Button
                    onClick={handleRunExperiment}
                    disabled={isRunning}
                    className="w-full"
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Experiment...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Experiment
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Experiments List */}
          {experiments.length === 0 ? (
            <Card className="p-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No experiments yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first experiment to compare different RAG configurations
              </p>
              <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Experiment
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {experiments.map((experiment) => (
                <Card key={experiment.id} className="p-6 hover:shadow-lg transition-smooth">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{experiment.query}</h3>
                        <Badge className={getStatusColor(experiment.status)}>
                          {experiment.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {experiment.createdAt.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{experiment.docIds.length} document(s)</span>
                      <span>•</span>
                      <span>{experiment.chunkSizes.length} chunk size(s)</span>
                      {experiment.results && (
                        <>
                          <span>•</span>
                          <span>{experiment.results.total_experiments} configurations tested</span>
                        </>
                      )}
                    </div>

                    {experiment.status === 'running' && (
                      <div className="flex items-center gap-2 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Running experiment...</span>
                      </div>
                    )}

                    {experiment.status === 'completed' && experiment.results && (
                      <Tabs defaultValue="results" className="w-full">
                        <TabsList>
                          <TabsTrigger value="results">Results</TabsTrigger>
                          <TabsTrigger value="answers">Full Answers</TabsTrigger>
                          <TabsTrigger value="comparison">Comparison</TabsTrigger>
                        </TabsList>

                        <TabsContent value="results" className="space-y-4 mt-4">
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {experiment.results.experiments.map((exp, index) => {
                              if (exp.error) {
                                return (
                                  <Card key={index} className="p-4 border-red-200 bg-red-50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="destructive">Error</Badge>
                                      <span className="font-semibold">Chunk Size: {exp.chunk_size}</span>
                                    </div>
                                    <p className="text-sm text-red-600">{exp.error}</p>
                                  </Card>
                                );
                              }

                              const result = exp.result;
                              if (!result) return null;

                              return (
                                <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
                                  <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className="text-base px-3 py-1">
                                      Chunk: {exp.chunk_size}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {result.retrieved_chunks?.length || 0} chunks
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 text-sm mb-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">Latency</span>
                                      <span className="font-semibold text-lg">{result.latency?.toFixed(2) || 'N/A'}s</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Total Chunks</span>
                                      <span className="font-semibold">{result.total_chunks_indexed || 0}</span>
                                    </div>
                                    {result.usage && result.usage.total_tokens && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tokens</span>
                                        <span className="font-semibold">{result.usage.total_tokens}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Answer Preview:</p>
                                    {result.answer ? (
                                      <p className="text-sm leading-relaxed line-clamp-4">
                                        {result.answer}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">No answer available</p>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </TabsContent>

                        <TabsContent value="answers" className="mt-4 space-y-4">
                          {experiment.results.experiments.length === 0 ? (
                            <Card className="p-6">
                              <p className="text-sm text-muted-foreground text-center">No results available</p>
                            </Card>
                          ) : (
                            experiment.results.experiments.map((exp, index) => {
                              if (exp.error) {
                                return (
                                  <Card key={index} className="p-6 border-red-200 bg-red-50 dark:bg-red-950">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="destructive">Error</Badge>
                                      <span className="font-semibold">Chunk Size: {exp.chunk_size}</span>
                                    </div>
                                    <p className="text-sm text-red-600 dark:text-red-400">{exp.error}</p>
                                  </Card>
                                );
                              }
                              
                              if (!exp.result || !exp.result.answer) {
                                return (
                                  <Card key={index} className="p-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline">Chunk Size: {exp.chunk_size}</Badge>
                                    </div>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">No answer returned for this configuration</p>
                                  </Card>
                                );
                              }
                              
                              const key = `${experiment.id}-${index}`;
                              const isExpanded = expandedAnswers.has(key);
                              
                              return (
                                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <Badge variant="outline" className="text-base px-3 py-1">
                                        Chunk Size: {exp.chunk_size}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {exp.result.retrieved_chunks?.length || 0} chunks • {exp.result.latency?.toFixed(2) || 'N/A'}s
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleAnswer(experiment.id, index)}
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-4 h-4 mr-2" />
                                          Collapse
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-4 h-4 mr-2" />
                                          Show Full Answer
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="bg-secondary/50 rounded-lg p-4">
                                    {exp.result.answer ? (
                                      <div className="space-y-2">
                                        <p className={`text-base leading-relaxed whitespace-pre-wrap ${
                                          !isExpanded && exp.result.answer.length > 2000 ? 'line-clamp-20' : ''
                                        }`}>
                                          {exp.result.answer}
                                        </p>
                                        {!isExpanded && exp.result.answer.length > 2000 && (
                                          <p className="text-xs text-muted-foreground italic pt-2">
                                            Answer truncated (showing first ~2000 characters). Click "Show Full Answer" to see complete response ({exp.result.answer.length} characters total).
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No answer available</p>
                                    )}
                                  </div>
                                </Card>
                              );
                            })
                          )}
                        </TabsContent>

                        <TabsContent value="comparison" className="mt-4">
                          <Card className="p-6">
                            <h4 className="font-semibold mb-4 text-lg">Best Configuration</h4>
                            {getBestResult(experiment) ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Chunk Size</p>
                                    <p className="text-2xl font-bold">{getBestResult(experiment)?.chunk_size}</p>
                                  </div>
                                  <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Retrieved Chunks</p>
                                    <p className="text-2xl font-bold">{getBestResult(experiment)?.result?.retrieved_chunks.length}</p>
                                  </div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                  <p className="text-sm text-muted-foreground mb-1">Latency</p>
                                  <p className="text-2xl font-bold">{getBestResult(experiment)?.result?.latency.toFixed(2)}s</p>
                                </div>
                                {getBestResult(experiment)?.result?.answer && (
                                  <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                                    <p className="text-sm font-semibold mb-2">Best Answer:</p>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{getBestResult(experiment)?.result?.answer}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No results available</p>
                            )}
                          </Card>
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Experiments;
