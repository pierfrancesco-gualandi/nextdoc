import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import JSZip from 'jszip';

interface FileExplorerUploadProps {
  onUploadComplete: (fileId: number, fileUrl: string, folderName: string) => void;
  title?: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  required3dAssets?: boolean;
}

/**
 * Componente per il caricamento e l'esplorazione dei file 3D
 * Consente di caricare singoli file o cartelle intere, mantenendo la struttura
 */
const FileExplorerUpload: React.FC<FileExplorerUploadProps> = ({
  onUploadComplete,
  title = 'Carica file',
  description,
  accept = '*',
  multiple = true,
  required3dAssets = false,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [folderName, setFolderName] = useState('');
  const [fileStructure, setFileStructure] = useState<Record<string, string>>({});

  // Funzione per ottenere tutti i file da una cartella e sottocartelle
  const processDirectory = async (entry: any, path = '') => {
    const result: { file: File; path: string }[] = [];
    const reader = entry.createReader();
    
    // Legge tutte le voci nella directory
    const entries = await new Promise<any[]>((resolve) => {
      reader.readEntries((entries: any[]) => resolve(entries));
    });
    
    for (const entry of entries) {
      if (entry.isDirectory) {
        // Se è una directory, elabora ricorsivamente
        const subEntries = await processDirectory(entry, `${path}${entry.name}/`);
        result.push(...subEntries);
      } else {
        // Se è un file, ottiene il file e il percorso relativo
        const file = await new Promise<File>((resolve) => {
          entry.file((file: File) => resolve(file));
        });
        result.push({ file, path: `${path}${file.name}` });
      }
    }
    
    return result;
  };

  // Carica una cartella
  const handleFolderSelect = async () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Gestisce il cambiamento dell'input della cartella
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Ottiene la cartella principale dai file selezionati
    const folderName = (files[0] as any).webkitRelativePath.split('/')[0];
    setFolderName(folderName);
    
    // Prepara un oggetto per memorizzare i percorsi relativi dei file
    const fileStructure: Record<string, string> = {};
    
    Array.from(files).forEach(file => {
      const relativePath = (file as any).webkitRelativePath.substring(folderName.length + 1);
      fileStructure[file.name] = relativePath;
    });
    
    setFileStructure(fileStructure);
    setFiles(files);
    
    // Scansiona i file caricati per determinare il tipo di modello 3D
    const has3DModel = Array.from(files).some(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'htm' || ext === 'html' || ext === 'iv3d' || 
             ext === 'glb' || ext === 'gltf' || ext === 'obj';
    });
    
    const hasRequiredAssets = required3dAssets ? 
      Array.from(files).some(file => file.name === 'iv3d.js') && 
      Array.from(files).some(file => file.name === 'scene.iv3d') &&
      Array.from(files).some(file => file.name === 'ivstyles.css')
      : true;
    
    if (required3dAssets && !hasRequiredAssets) {
      toast({
        title: "File richiesti mancanti",
        description: "La cartella deve contenere i file iv3d.js, scene.iv3d e ivstyles.css",
        variant: "destructive"
      });
      return;
    }
    
    if (required3dAssets && !has3DModel) {
      toast({
        title: "Nessun modello 3D trovato",
        description: "La cartella deve contenere almeno un file HTML o un modello 3D",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: `Cartella ${folderName} selezionata`,
      description: `${files.length} file pronti per il caricamento`,
    });
  };

  // Carica file
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Gestisce il cambiamento dell'input del file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setFiles(files);
    
    toast({
      title: `${files.length} file selezionati`,
      description: "I file sono pronti per essere caricati",
    });
  };

  // Mutazione per caricare i file
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          // Abilitare questo per monitorare il progresso del caricamento
          // onUploadProgress: progressEvent => {
          //   const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          //   setProgress(percentCompleted);
          // }
        });
        
        if (!response.ok) {
          throw new Error('Errore nel caricamento del file');
        }
        
        const data = await response.json();
        return data;
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Caricamento completato",
        description: `${data.originalName} caricato con successo`,
      });
      
      // Passa il risultato tramite callback
      onUploadComplete(data.id, data.url, folderName || '');
      
      // Resetta lo stato
      setFiles(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    },
    onError: (error) => {
      toast({
        title: "Errore nel caricamento",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive"
      });
    }
  });

  // Esegue il caricamento dei file
  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona almeno un file da caricare",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    
    // Aggiunge tutti i file al FormData
    Array.from(files).forEach(file => {
      formData.append("file", file);
    });
    
    // Aggiunge note e struttura dei file se disponibili
    if (notes) formData.append("notes", notes);
    if (folderName) formData.append("folderName", folderName);
    
    // Se abbiamo una struttura di file, la inviamo come JSON
    if (Object.keys(fileStructure).length > 0) {
      formData.append("fileStructure", JSON.stringify(fileStructure));
    }
    
    // Avvia il caricamento
    uploadMutation.mutate(formData);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex flex-col gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleFileSelect}
                disabled={isUploading}
              >
                Seleziona file
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleFolderSelect}
                disabled={isUploading}
              >
                Seleziona cartella
              </Button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                multiple={multiple}
                accept={accept}
              />
              
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderChange}
                style={{ display: 'none' }}
                // @ts-ignore - webkitdirectory non è definito nel tipo standard
                webkitdirectory="true"
                directory="true"
                multiple
              />
            </div>
            
            {files && files.length > 0 && (
              <div className="text-sm">
                <p>
                  {files.length} file selezionati
                  {folderName && ` dalla cartella "${folderName}"`}
                </p>
                {files.length <= 5 && (
                  <ul className="mt-2 list-disc pl-5">
                    {Array.from(files).slice(0, 5).map((file, index) => (
                      <li key={index} className="text-xs">{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Note (opzionale)</Label>
              <Textarea
                id="notes"
                placeholder="Aggiungi note su questo caricamento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isUploading}
              />
            </div>
            
            {isUploading && <Progress value={progress} className="h-2" />}
            
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!files || files.length === 0 || isUploading}
            >
              {isUploading ? "Caricamento in corso..." : "Carica"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileExplorerUpload;