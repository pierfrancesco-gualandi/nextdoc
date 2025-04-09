import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface FileSelectorProps {
  onFileSelected: (file: { id: number; filename: string; originalName: string; url: string; mimeType: string; } | null) => void;
  onFolderSelected?: (folderName: string) => void;
  accept?: string;
  acceptedExtensions?: string;
  label?: string;
  buttonText?: string;
  className?: string;
}

const FileSelector: React.FC<FileSelectorProps> = ({ 
  onFileSelected, 
  onFolderSelected,
  accept = '*/*', 
  acceptedExtensions,
  label,
  buttonText = 'Seleziona file',
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      handleUpload(files[0]);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Ottiene la cartella principale dai file selezionati
    const folderPathParts = (files[0] as any).webkitRelativePath.split('/');
    const folderName = folderPathParts[0];
    setFolderName(folderName);
    
    if (onFolderSelected) {
      onFolderSelected(folderName);
    }
    
    // Cerca un file HTML nella cartella
    const htmlFile = Array.from(files).find(file => 
      file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')
    );
    
    // Se abbiamo trovato un file HTML, caricalo
    if (htmlFile) {
      setSelectedFile(htmlFile);
      handleUpload(htmlFile, folderName);
    } else {
      toast({
        variant: "destructive",
        title: "File HTML non trovato",
        description: "Nessun file HTML trovato nella cartella. Seleziona una cartella con un file HTML per il visualizzatore 3D.",
      });
    }
  };

  const handleUpload = async (file: File, folder?: string) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Se abbiamo un nome cartella, lo aggiungiamo
      if (folder) {
        formData.append('folderName', folder);
      }
      
      // Se è un file HTML, potrebbe essere un modello WebGL
      if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
        // Aggiungiamo un flag per indicare che è un potenziale modello WebGL
        formData.append('webglModel', 'true');
        
        // Aggiungiamo un ID specifico per il modello (basato sul nome file senza estensione)
        const modelId = file.name.replace(/\.(html|htm)$/i, '');
        formData.append('modelId', modelId);
        
        console.log('Caricamento modello WebGL:', modelId);
      }
      
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

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSelectFolder = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && <div className="text-sm font-medium">{label}</div>}
      
      <div className="flex items-center space-x-2">
        <Input
          type="file"
          accept={accept}
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        
        <Input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderChange}
          className="hidden"
          // @ts-ignore - webkitdirectory non è definito nel tipo standard
          webkitdirectory="true"
          directory="true"
          multiple
          disabled={isUploading}
        />
        
        <Button
          variant="outline"
          type="button"
          disabled={isUploading}
          onClick={handleSelectFile}
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
        
        {onFolderSelected && (
          <Button
            variant="outline"
            type="button"
            disabled={isUploading}
            onClick={handleSelectFolder}
            className="flex items-center gap-2"
          >
            <span className="material-icons text-sm">folder_open</span> Seleziona cartella
          </Button>
        )}
      </div>
      
      {selectedFile && (
        <div className="text-sm text-muted-foreground">
          File selezionato: <span className="font-medium">{selectedFile.name}</span>
          {folderName && <> (cartella: <span className="font-medium">{folderName}</span>)</>}
        </div>
      )}
      
      {acceptedExtensions && (
        <div className="text-xs text-muted-foreground">
          Formati supportati: {acceptedExtensions}
        </div>
      )}
    </div>
  );
};

export default FileSelector;