import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Settings } from "lucide-react";

const Experiments = () => {
  const experiments = [
    {
      id: 1,
      name: "Financial Reports Analysis",
      status: "running",
      pipelines: 4,
      progress: 75,
      created: "2 hours ago",
    },
    {
      id: 2,
      name: "Healthcare Documents Test",
      status: "completed",
      pipelines: 6,
      progress: 100,
      created: "1 day ago",
    },
    {
      id: 3,
      name: "Legal Contracts Comparison",
      status: "pending",
      pipelines: 3,
      progress: 0,
      created: "3 days ago",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-primary text-primary-foreground";
      case "completed":
        return "bg-success text-success-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Experiments
              </h1>
              <p className="text-xl text-muted-foreground">
                Manage and monitor your RAG pipeline tests
              </p>
            </div>
            <Button variant="hero" size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Experiment
            </Button>
          </div>

          {/* Experiments List */}
          <div className="space-y-4">
            {experiments.map((experiment) => (
              <Card key={experiment.id} className="p-6 hover:shadow-lg transition-smooth">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{experiment.name}</h3>
                      <Badge className={getStatusColor(experiment.status)}>
                        {experiment.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {experiment.pipelines} pipeline variants • Created {experiment.created}
                    </p>
                    {experiment.status === "running" && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{experiment.progress}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-primary transition-all duration-500"
                            style={{ width: `${experiment.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {experiment.status === "completed" && (
                      <Button variant="default">View Results</Button>
                    )}
                    {experiment.status === "pending" && (
                      <Button variant="hero" className="gap-2">
                        <Play className="w-4 h-4" />
                        Start
                      </Button>
                    )}
                    <Button variant="outline" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Configuration Options */}
          <Card className="p-8 mt-12">
            <h2 className="text-2xl font-semibold mb-6">
              Experiment Configuration
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Chunk Sizes</h3>
                <div className="flex flex-wrap gap-2">
                  {["256", "512", "1024", "2048"].map((size) => (
                    <Badge key={size} variant="outline" className="px-3 py-1">
                      {size} tokens
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Embedding Models</h3>
                <div className="flex flex-wrap gap-2">
                  {["Gemini", "OpenAI", "Cohere", "Voyage"].map((model) => (
                    <Badge key={model} variant="outline" className="px-3 py-1">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Retrieval Methods</h3>
                <div className="flex flex-wrap gap-2">
                  {["Semantic", "Hybrid", "Reranking"].map((method) => (
                    <Badge key={method} variant="outline" className="px-3 py-1">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Evaluation Models</h3>
                <div className="flex flex-wrap gap-2">
                  {["Gemini 2.0 Flash", "Gemini 1.5 Pro"].map((model) => (
                    <Badge key={model} variant="outline" className="px-3 py-1">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Experiments;
