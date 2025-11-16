import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload as UploadIcon, FileText, Image, FileSpreadsheet, FileCode, Globe } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    toast({
      title: "Files uploaded",
      description: `${files.length} file(s) ready for processing`,
    });
  };

  const supportedFormats = [
    { icon: FileText, name: "Documents", formats: "PDF, DOCX, TXT" },
    { icon: Image, name: "Images", formats: "PNG, JPG, WEBP" },
    { icon: FileSpreadsheet, name: "Spreadsheets", formats: "XLSX, CSV" },
    { icon: FileCode, name: "Code", formats: "JS, PY, TS, etc." },
    { icon: Globe, name: "Web", formats: "URLs, HTML" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Upload Your Documents
            </h1>
            <p className="text-xl text-muted-foreground">
              Support for multiple document types with multimodal processing
            </p>
          </div>

          {/* Upload Area */}
          <Card 
            className={`p-12 mb-8 border-2 border-dashed transition-all ${
              isDragging 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center">
                <UploadIcon className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">
                  Drag & Drop Files Here
                </h3>
                <p className="text-muted-foreground mb-4">
                  or click to browse your files
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="hero" size="lg" asChild>
                    <span className="cursor-pointer">Choose Files</span>
                  </Button>
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Maximum file size: 20MB per file
              </p>
            </div>
          </Card>

          {/* Supported Formats */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Supported File Types
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {supportedFormats.map((format, index) => {
                const Icon = format.icon;
                return (
                  <Card key={index} className="p-4 text-center hover:shadow-md transition-smooth">
                    <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-semibold mb-1">{format.name}</h4>
                    <p className="text-xs text-muted-foreground">{format.formats}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* URL Input */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">
              Or Import from URL
            </h3>
            <div className="flex gap-3">
              <input
                type="url"
                placeholder="https://example.com/document.pdf"
                className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <Button variant="default">Import</Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;
