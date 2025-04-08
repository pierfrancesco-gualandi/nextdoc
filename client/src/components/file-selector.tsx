import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface FileSelectorProps {
  onFileSelected: (file: { id: number; filename: string; originalName: string; url: string; mimeType: string; } | null) => void;
  accept?: string;
  buttonText?: string;
  className?: string;
}

const FileSelector: React.FC<FileSelectorProps> = ({ 
  onFileSelected, 
  accept = '*/*', 
  buttonText = 'Seleziona file',
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      handleUpload(files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante il caricamento: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      onFileSelected({
        id: result.id,
        filename: result.filename,
        originalName: result.originalName,
        url: result.url,
        mimeType: result.mimeType
      });
      
      toast({
        title: "File caricato",
        description: `${file.name} è stato caricato con successo.`,
      });
    } catch (error) {
      console.error('Errore nel caricamento del file:', error);
      toast({
        variant: "destructive",
        title: "Errore di caricamento",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il caricamento del file.",
      });
      onFileSelected(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={isUploading}
      />
      <Button
        variant="outline"
        type="button"
        disabled={isUploading}
        onClick={() => document.getElementById('file-upload')?.click()}
        className="flex items-center gap-2"
      >
        {isUploading ? (
          <>
            <span className="animate-spin">⌛</span> Caricamento...
          </>
        ) : (
          <>
            <span className="material-icons text-sm">upload_file</span> {buttonText}
          </>
        )}
      </Button>
      {selectedFile && (
        <div className="ml-2 text-sm text-neutral-medium truncate max-w-[300px]">
          {selectedFile.name}
        </div>
      )}
    </div>
  );
};

export default FileSelector;