import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Zap, Target, FileText, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { uploadApi, ragApi, Document } from "@/lib/api";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  // Fetch documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: uploadApi.listDocuments,
  });

  // Fetch retriever stats
  const { data: retrieverStats, isLoading: statsLoading } = useQuery({
    queryKey: ['retriever-stats'],
    queryFn: ragApi.getRetrieverStats,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Calculate metrics
  const totalDocuments = documents.length;
  const totalWords = documents.reduce((sum: number, doc: Document) => sum + (doc.word_count || 0), 0);
  const totalChars = documents.reduce((sum: number, doc: Document) => sum + (doc.text_length || 0), 0);
  const processedDocs = documents.filter((doc: Document) => doc.status === 'processed').length;
  
  const metrics = [
    {
      icon: FileText,
      label: "Total Documents",
      value: totalDocuments.toString(),
      change: `${processedDocs} processed`,
      positive: true,
    },
    {
      icon: Database,
      label: "Total Words",
      value: totalWords.toLocaleString(),
      change: `${totalChars.toLocaleString()} chars`,
      positive: true,
    },
    {
      icon: Target,
      label: "Indexed Chunks",
      value: retrieverStats?.total_chunks?.toString() || "0",
      change: retrieverStats?.total_documents 
        ? `${retrieverStats.total_documents} docs indexed`
        : "No index",
      positive: true,
    },
    {
      icon: Zap,
      label: "Embedding Dimension",
      value: retrieverStats?.embedding_dimension?.toString() || "N/A",
      change: "Vector size",
      positive: true,
    },
  ];

  const topDocuments = documents
    .filter((doc: Document) => doc.status === 'processed')
    .sort((a: Document, b: Document) => (b.word_count || 0) - (a.word_count || 0))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Analytics Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Real-time insights and performance metrics
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-smooth">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    {statsLoading && index >= 2 && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{metric.change}</p>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            {/* Documents Overview */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Documents Overview
              </h3>
              {docsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total</p>
                      <p className="text-2xl font-bold">{totalDocuments}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Processed</p>
                      <p className="text-2xl font-bold text-green-500">{processedDocs}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">By File Type</p>
                    <div className="space-y-1">
                      {['.pdf', '.docx', '.doc', '.txt'].map((type) => {
                        const count = documents.filter((doc: Document) => 
                          doc.file_type === type || doc.file_type === type.replace('.', '')
                        ).length;
                        if (count === 0) return null;
                        return (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{type.toUpperCase()}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Retriever Stats */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Retriever Statistics
              </h3>
              {statsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !retrieverStats || !retrieverStats.total_chunks ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data indexed yet</p>
                  <p className="text-sm mt-2">Run a query to index documents</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total Chunks</p>
                      <p className="text-2xl font-bold">{retrieverStats.total_chunks}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Documents</p>
                      <p className="text-2xl font-bold">{retrieverStats.total_documents || 0}</p>
                    </div>
                  </div>
                  {retrieverStats.embedding_dimension && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Embedding Dimension</p>
                      <p className="text-2xl font-bold">{retrieverStats.embedding_dimension}</p>
                    </div>
                  )}
                  {retrieverStats.chunk_sizes && Object.keys(retrieverStats.chunk_sizes).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Chunks by Size</p>
                      <div className="space-y-1">
                        {Object.entries(retrieverStats.chunk_sizes).map(([size, count]: [string, any]) => (
                          <div key={size} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{size} tokens</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Top Documents */}
          {topDocuments.length > 0 && (
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6">
                Largest Documents
              </h2>
              <div className="space-y-4">
                {topDocuments.map((doc: Document, index: number) => (
                  <div 
                    key={doc.doc_id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gradient-secondary rounded-lg hover:shadow-md transition-smooth"
                  >
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{doc.filename}</h4>
                        <p className="text-sm text-muted-foreground">
                          <Badge variant="outline" className="mr-2">{doc.file_type}</Badge>
                          {doc.text_length.toLocaleString()} characters
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Words</p>
                        <p className="font-semibold">{doc.word_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge 
                          variant={doc.status === 'processed' ? 'default' : 'secondary'}
                          className={doc.status === 'processed' ? 'bg-green-500' : ''}
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
