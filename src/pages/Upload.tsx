import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, FileText, Trash2, Loader2, CheckCircle2, XCircle, Image, FileSpreadsheet, FileCode, Globe } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { uploadApi, Document } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents list
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: uploadApi.listDocuments,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

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

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      // Validate file type
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not supported. Allowed: ${allowedTypes.join(', ')}`,
          variant: "destructive",
        });
        continue;
      }

      setUploading(prev => [...prev, file.name]);
      
      try {
        const result = await uploadApi.uploadDocument(file);
        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded and processed`,
        });
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message || `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      } finally {
        setUploading(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    try {
      await uploadApi.deleteDocument(docId);
      toast({
        title: "Document deleted",
        description: `${filename} has been deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
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

          {/* Uploaded Documents List */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">
                Uploaded Documents ({documents.length})
              </h2>
              {documents.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
                >
                  Refresh
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm mt-2">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: Document) => (
                  <div
                    key={doc.doc_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{doc.filename}</h4>
                          <Badge variant="outline" className="text-xs">
                            {doc.file_type}
                          </Badge>
                          {doc.status === 'processed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : doc.status === 'extraction_failed' ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : null}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{doc.word_count.toLocaleString()} words</span>
                          <span>{doc.text_length.toLocaleString()} chars</span>
                          <Badge variant="secondary" className="text-xs">
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.doc_id, doc.filename)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Uploading indicator */}
            {uploading.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Uploading...</p>
                {uploading.map((filename) => (
                  <div key={filename} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{filename}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;
