import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg"></div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              RAG Optimizer
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink 
              to="/upload" 
              className="text-foreground/80 hover:text-foreground transition-smooth"
            >
              Upload
            </NavLink>
            <NavLink 
              to="/experiments" 
              className="text-foreground/80 hover:text-foreground transition-smooth"
            >
              Experiments
            </NavLink>
            <NavLink 
              to="/dashboard" 
              className="text-foreground/80 hover:text-foreground transition-smooth"
            >
              Dashboard
            </NavLink>
            <Button variant="hero" size="default">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <NavLink 
              to="/upload" 
              className="block text-foreground/80 hover:text-foreground transition-smooth"
              onClick={() => setIsOpen(false)}
            >
              Upload
            </NavLink>
            <NavLink 
              to="/experiments" 
              className="block text-foreground/80 hover:text-foreground transition-smooth"
              onClick={() => setIsOpen(false)}
            >
              Experiments
            </NavLink>
            <NavLink 
              to="/dashboard" 
              className="block text-foreground/80 hover:text-foreground transition-smooth"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </NavLink>
            <Button variant="hero" size="default" className="w-full">
              Get Started
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
