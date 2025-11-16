import { Navigation } from "@/components/Navigation";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-bg.jpg";
import uploadIcon from "@/assets/feature-upload.png";
import experimentIcon from "@/assets/feature-experiment.png";
import evaluationIcon from "@/assets/feature-evaluation.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Optimize Your{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                RAG Pipeline
              </span>
              {" "}with Data
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Stop guessing. Make data-driven decisions about chunk sizes, embedding models, and retrieval strategies with comprehensive testing and AI-powered evaluation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                variant="hero" 
                size="xl"
                onClick={() => navigate("/upload")}
                className="group"
              >
                Start Testing
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                onClick={() => navigate("/dashboard")}
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-secondary">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Complete RAG Testing Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build, test, and optimize your RAG systems
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={uploadIcon}
              title="Multimodal Documents"
              description="Upload PDFs, Word docs, images, spreadsheets, and more. Smart parsing handles complex document structures."
            />
            <FeatureCard
              icon={experimentIcon}
              title="Unlimited Experiments"
              description="Test unlimited pipeline variants with different chunk sizes, embedding models, and retrieval strategies in parallel."
            />
            <FeatureCard
              icon={evaluationIcon}
              title="AI-Powered Evaluation"
              description="Gemini 2.0 evaluates accuracy, relevance, and quality. Get detailed insights and pattern identification."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">
                Why RAG Optimizer?
              </h2>
              <p className="text-xl text-muted-foreground">
                Companies waste thousands on suboptimal RAG architectures. We help you make informed decisions backed by real data.
              </p>
              <div className="space-y-4">
                {[
                  "Test multiple configurations simultaneously",
                  "AI-powered evaluation with detailed reasoning",
                  "Cost vs. Accuracy analysis for budget optimization",
                  "Pattern detection and actionable insights",
                  "Comprehensive reporting and export capabilities",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold mb-6">Key Metrics</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Accuracy Score</span>
                    <span className="font-semibold">94.2%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary w-[94%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Cost Efficiency</span>
                    <span className="font-semibold">87.5%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary w-[87%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-semibold">1.2s avg</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary w-[75%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Optimize Your RAG System?
            </h2>
            <p className="text-xl text-muted-foreground">
              Start testing your pipelines today. No credit card required for freemium tier.
            </p>
            <Button 
              variant="hero" 
              size="xl"
              onClick={() => navigate("/upload")}
              className="group"
            >
              Get Started Now
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 RAG Optimizer. Built for AI Engineers, by AI Engineers.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
