import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Zap, Target } from "lucide-react";

const Dashboard = () => {
  const metrics = [
    {
      icon: Target,
      label: "Accuracy Score",
      value: "94.2%",
      change: "+2.3%",
      positive: true,
    },
    {
      icon: DollarSign,
      label: "Cost Efficiency",
      value: "$0.024",
      change: "-18%",
      positive: true,
    },
    {
      icon: Zap,
      label: "Avg Response Time",
      value: "1.2s",
      change: "-0.3s",
      positive: true,
    },
    {
      icon: TrendingUp,
      label: "Active Experiments",
      value: "12",
      change: "+4",
      positive: true,
    },
  ];

  const topPipelines = [
    { name: "Gemini-1024-Hybrid", accuracy: 94.2, cost: 0.024, latency: 1.2 },
    { name: "OpenAI-512-Semantic", accuracy: 91.8, cost: 0.032, latency: 0.9 },
    { name: "Cohere-2048-Rerank", accuracy: 93.5, cost: 0.041, latency: 1.5 },
  ];

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
                    <Badge 
                      variant={metric.positive ? "default" : "destructive"}
                      className={metric.positive ? "bg-success" : ""}
                    >
                      {metric.change}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold">{metric.value}</p>
                </Card>
              );
            })}
          </div>

          {/* Charts Placeholder */}
          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Cost vs. Accuracy Analysis
              </h3>
              <div className="h-64 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Scatter plot visualization</p>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Response Time Distribution
              </h3>
              <div className="h-64 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Histogram visualization</p>
              </div>
            </Card>
          </div>

          {/* Top Pipelines */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">
              Top Performing Pipelines
            </h2>
            <div className="space-y-4">
              {topPipelines.map((pipeline, index) => (
                <div 
                  key={index}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gradient-secondary rounded-lg hover:shadow-md transition-smooth"
                >
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{pipeline.name}</h4>
                      <p className="text-sm text-muted-foreground">Recommended for production</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                      <p className="font-semibold text-success">{pipeline.accuracy}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cost/Query</p>
                      <p className="font-semibold">${pipeline.cost}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Latency</p>
                      <p className="font-semibold">{pipeline.latency}s</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
