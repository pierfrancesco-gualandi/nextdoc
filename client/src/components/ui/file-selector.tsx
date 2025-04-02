import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FolderOpen, File, Upload, X, Check, ExternalLink, FileText } from 'lucide-react';
import { UploadedFile } from '@shared/schema';

export type AcceptedFileType = 
  | 'image/*' 
  | 'video/*' 
  | 'audio/*' 
  | 'application/pdf' 
  | '.pdf'
  | 'text/plain' 
  | '.txt'
  | 'text/csv'
  | '.csv'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | '.doc,.docx'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | '.xls,.xlsx'
  | 'model/gltf-binary'
  | 'model/gltf+json'
  | '.glb,.gltf'
  | 'model/stl'
  | '.stl'
  | 'model/obj'
  | '.obj'
  | 'model/fbx'
  | '.fbx';

interface FileSelectorProps {
  onFileSelected: (file: UploadedFile) => void;
  acceptedTypes?: AcceptedFileType[];
  maxSize?: number; // in MB
  title?: string;
  multipleFiles?: boolean;
  initialSelectedFile?: UploadedFile;
  userId?: number;
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  onFileSelected,
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf'],
  maxSize = 50,
  title = "Seleziona file",
  multipleFiles = false,
  initialSelectedFile,
  userId = 1
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(initialSelectedFile || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recentFiles, setRecentFiles] = useState<UploadedFile[]>([]);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carica i file recenti all'avvio
  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        const response = await apiRequest<UploadedFile[]>({
          url: '/api/files/recent',
          method: 'GET'
        });
        
        if (response) {
          setRecentFiles(response);
        }
      } catch (error) {
        console.error("Errore nel caricamento dei file recenti:", error);
      }
    };

    fetchRecentFiles();
  }, []);

  // Gestione del drag & drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  // Validazione del file
  const validateAndSetFile = (file: File) => {
    // Verifica la dimensione (convertire da MB a byte)
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: `La dimensione massima consentita è ${maxSize}MB`,
        variant: "destructive"
      });
      return;
    }

    // Verifica il tipo (se specificato)
    if (acceptedTypes.length > 0) {
      const fileType = file.type;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      const isTypeAccepted = acceptedTypes.some(type => {
        // Verifica per mime type
        if (type.includes('*')) {
          const mainType = type.split('/')[0];
          return fileType.startsWith(mainType);
        }
        
        // Verifica per estensione
        if (type.startsWith('.')) {
          const extensions = type.split(',').map(ext => ext.trim());
          return fileExtension && extensions.includes(`.${fileExtension}`);
        }
        
        // Verifica esatta
        return type === fileType;
      });

      if (!isTypeAccepted) {
        toast({
          title: "Tipo di file non supportato",
          description: `I tipi di file accettati sono: ${acceptedTypes.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
    }

    setSelectedFile(file);
  };

  // Selezione file tramite clic
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  // Upload del file
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', userId.toString());

      // Simulazione del progresso (in una implementazione reale, userai XMLHttpRequest o axios per tracciare il progresso)
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(uploadInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      const response = await apiRequest<UploadedFile>({
        url: '/api/files',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(uploadInterval);
      setUploadProgress(100);
      setIsUploading(false);
      
      if (response) {
        setUploadedFile(response);
        setSelectedFile(null);
        onFileSelected(response);
        
        // Aggiungi il file alla lista dei recenti
        setRecentFiles(prev => [response, ...prev.slice(0, 9)]);
        
        toast({
          title: "Upload completato",
          description: `Il file "${response.originalName}" è stato caricato con successo`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Errore durante l'upload:", error);
      setIsUploading(false);
      setUploadProgress(0);
      
      toast({
        title: "Errore durante l'upload",
        description: "Si è verificato un errore durante il caricamento del file. Riprova.",
        variant: "destructive"
      });
    }
  };

  // Cancella la selezione
  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Selezione da file recenti
  const handleSelectRecentFile = (file: UploadedFile) => {
    setUploadedFile(file);
    onFileSelected(file);
    setShowFileExplorer(false);
  };

  // Visualizza l'estensione del file
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase();
  };

  // Funzione per visualizzare l'icona appropriata in base al tipo di file
  const getFileIcon = (file: UploadedFile) => {
    const mimetype = file.mimetype;
    const extension = getFileExtension(file.originalName);
    
    if (mimetype.startsWith('image/')) {
      return <img src={`/uploads/${file.filename}`} alt={file.originalName} className="w-6 h-6 object-cover" />;
    } else if (mimetype.startsWith('video/')) {
      return <File className="w-6 h-6 text-blue-500" />;
    } else if (mimetype.startsWith('audio/')) {
      return <File className="w-6 h-6 text-purple-500" />;
    } else if (mimetype === 'application/pdf' || extension === 'pdf') {
      return <FileText className="w-6 h-6 text-red-500" />;
    } else if (mimetype.includes('word') || ['doc', 'docx'].includes(extension || '')) {
      return <FileText className="w-6 h-6 text-blue-700" />;
    } else if (mimetype.includes('excel') || ['xls', 'xlsx'].includes(extension || '')) {
      return <FileText className="w-6 h-6 text-green-700" />;
    } else if (mimetype.includes('model/') || ['glb', 'gltf', 'obj', 'stl', 'fbx'].includes(extension || '')) {
      return <File className="w-6 h-6 text-amber-500" />;
    } else {
      return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes.join(',')}
        className="hidden"
        multiple={multipleFiles}
      />
      
      {!uploadedFile ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedFile ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px] ${
                  isDragging ? 'border-primary bg-secondary/20' : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleSelectFile}
              >
                <FolderOpen className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-center text-muted-foreground">
                  Trascina un file qui o <span className="text-primary font-medium">clicca per sfogliare</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Tipi accettati: {acceptedTypes.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dimensione massima: {maxSize}MB
                </p>

                <div className="flex items-center mt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFileExplorer(!showFileExplorer);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    File Recenti
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <File className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={handleClear}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {isUploading && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Caricamento in corso...</Label>
                      <span className="text-xs">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          
          {selectedFile && (
            <CardFooter className="pt-0">
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>Caricamento in corso...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Carica file
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">File selezionato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFileIcon(uploadedFile)}
                  <div>
                    <p className="font-medium truncate max-w-[200px]">{uploadedFile.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => window.open(`/uploads/${uploadedFile.filename}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => {
                      setUploadedFile(null);
                      setShowFileExplorer(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* File Explorer per file recenti */}
      {showFileExplorer && (
        <Card className="mt-2">
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">File Recenti</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {recentFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nessun file recente
              </p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {recentFiles.map(file => (
                  <div 
                    key={file.id}
                    className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer"
                    onClick={() => handleSelectRecentFile(file)}
                  >
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file)}
                      <div className="truncate max-w-[200px]">
                        <p className="text-sm font-medium">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost">
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileSelector;