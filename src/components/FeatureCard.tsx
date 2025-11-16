import { Card } from "@/components/ui/card";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-smooth border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-md">
          <img 
            src={icon} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
};
