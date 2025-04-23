import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Folder, 
  File, 
  ArrowRight, 
  RefreshCw, 
  Home, 
  ChevronRight,
  Copy, 
  FolderPlus, 
  FilePlus,
  Trash2, 
  Save
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (filePath: string) => void;
  onCreateFolder?: (folderName: string, sourceFolderName?: string) => Promise<boolean>;
  initialPath?: string;
  allowCreateFolder?: boolean;
  allowSelectFile?: boolean;
  title?: string;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  modified?: string;
}

export function FileExplorer({
  isOpen,
  onClose,
  onSelectFile,
  onCreateFolder,
  initialPath = '/uploads',
  allowCreateFolder = true,
  allowSelectFile = true,
  title = "Esplora File"
}: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [selectedSourceFolder, setSelectedSourceFolder] = useState<string | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      loadFiles(currentPath);
    }
  }, [isOpen, currentPath]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchTerm]);

  useEffect(() => {
    // Aggiorna le breadcrumbs
    const pathParts = currentPath.split('/').filter(Boolean);
    const crumbs = pathParts.map((part, index) => {
      const path = '/' + pathParts.slice(0, index + 1).join('/');
      return { name: part, path };
    });
    
    // Aggiungi la root
    if (pathParts[0] !== 'uploads') {
      crumbs.unshift({ name: 'uploads', path: '/uploads' });
    }
    
    setBreadcrumbs(crumbs);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error('Errore nel caricamento dei file');
      
      const data = await response.json();
      const sortedFiles = data.sort((a: FileItem, b: FileItem) => {
        // Prima le cartelle, poi i file
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        // In ordine alfabetico
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sortedFiles);
      setFilteredFiles(sortedFiles);
      setSelectedFile(null);
      setSelectedFiles({});
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      navigateTo(file.path);
    } else {
      setSelectedFile(file);
      
      // Se è un file .htm o .html, estrai il nome base per il campo personalizzato
      if (file.name.endsWith('.htm') || file.name.endsWith('.html')) {
        const baseName = file.name.split('.').slice(0, -1).join('.');
        setCustomFileName(baseName);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un nome per la cartella",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Crea la struttura per il modello 3D
      const success = await onCreateFolder?.(newFolderName, selectedSourceFolder || undefined);
      
      if (success) {
        toast({
          title: "Cartella creata",
          description: `La cartella ${newFolderName} è stata creata con successo`,
        });
        
        setIsCreatingFolder(false);
        setNewFolderName('');
        setSelectedSourceFolder(null);
        
        // Ricarica i file
        loadFiles(currentPath);
      } else {
        throw new Error('Impossibile creare la cartella');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la cartella",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = () => {
    if (!selectedFile) {
      toast({
        title: "Errore",
        description: "Seleziona un file",
        variant: "destructive",
      });
      return;
    }
    
    // Gestisci file .htm e .html
    if (selectedFile.name.endsWith('.htm') || selectedFile.name.endsWith('.html')) {
      // Se è stato specificato un nome personalizzato
      if (customFileName && customFileName !== selectedFile.name.split('.').slice(0, -1).join('.')) {
        // Usa il nome personalizzato ma mantieni l'estensione originale
        const ext = selectedFile.name.split('.').pop();
        const pathParts = selectedFile.path.split('/');
        pathParts.pop(); // Rimuovi il nome file
        
        // Costruisci il nuovo percorso con il nome personalizzato
        const folderName = pathParts[pathParts.length - 1];
        const newPath = `/uploads/${folderName}/${customFileName}.${ext}`;
        
        // Emetti il percorso personalizzato
        onSelectFile?.(newPath);
      } else {
        // Usa il percorso originale
        onSelectFile?.(selectedFile.path);
      }
    } else {
      onSelectFile?.(selectedFile.path);
    }
    
    onClose();
  };

  const handleGoToParent = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 1) {
      const parentPath = '/' + parts.slice(0, parts.length - 1).join('/');
      navigateTo(parentPath);
    } else if (parts.length === 1) {
      navigateTo('/');
    }
  };

  const handleCheckboxChange = (file: FileItem) => {
    setSelectedFiles(prev => ({
      ...prev,
      [file.path]: !prev[file.path]
    }));
  };

  const getAvailableFolders = () => {
    return files.filter(file => file.isDirectory);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Gestisci i file e le cartelle per i modelli 3D
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateTo('/uploads')}
            title="Vai alla cartella uploads"
          >
            <Home className="h-4 w-4 mr-1" />
            Root
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGoToParent}
            title="Vai alla cartella superiore"
          >
            <ArrowRight className="h-4 w-4 mr-1 rotate-180" />
            Su
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadFiles(currentPath)}
            title="Aggiorna"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Aggiorna
          </Button>
          
          {allowCreateFolder && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCreatingFolder(true)}
              title="Crea nuova cartella modello 3D"
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              Nuovo Modello 3D
            </Button>
          )}
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-gray-500 overflow-x-auto whitespace-nowrap mb-2">
          <span className="px-1">Percorso:</span>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
              <button
                onClick={() => navigateTo(crumb.path)}
                className="text-blue-500 hover:text-blue-700 hover:underline px-1"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {/* Search bar */}
        <div className="mb-4">
          <Input
            placeholder="Cerca file e cartelle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        {/* File list */}
        <ScrollArea className="flex-grow border rounded-md">
          <div className="p-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-full py-8">
                <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
              </div>
            ) : filteredFiles.length > 0 ? (
              <div className="space-y-1">
                {filteredFiles.map((file) => (
                  <div
                    key={file.path}
                    className={`flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer ${
                      selectedFile?.path === file.path ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => handleFileClick(file)}
                  >
                    {allowSelectFile && !file.isDirectory && (
                      <Checkbox
                        checked={selectedFiles[file.path] || false}
                        onCheckedChange={() => handleCheckboxChange(file)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                      />
                    )}
                    
                    {file.isDirectory ? (
                      <Folder className="h-5 w-5 mr-2 text-blue-500" />
                    ) : (
                      <File className="h-5 w-5 mr-2 text-gray-500" />
                    )}
                    
                    <div className="flex-grow">
                      <div className="font-medium">{file.name}</div>
                      {file.size !== undefined && (
                        <div className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-40 text-gray-500">
                Nessun file trovato
              </div>
            )}
          </div>
        </ScrollArea>
        
        {selectedFile && !selectedFile.isDirectory && (
          <div className="mt-4 p-3 border rounded-md bg-gray-50">
            <h4 className="font-medium mb-2">File selezionato</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="selected-file">Percorso completo:</Label>
                <Input 
                  id="selected-file" 
                  value={selectedFile.path} 
                  readOnly 
                  className="bg-white"
                />
              </div>
              
              {(selectedFile.name.endsWith('.htm') || selectedFile.name.endsWith('.html')) && (
                <div>
                  <Label htmlFor="custom-filename">Nome file personalizzato:</Label>
                  <div className="flex items-center">
                    <Input 
                      id="custom-filename" 
                      value={customFileName} 
                      onChange={(e) => setCustomFileName(e.target.value)}
                      className="bg-white flex-grow"
                    />
                    <span className="ml-1">.{selectedFile.name.split('.').pop()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Verrà creato l'URL: /uploads/{selectedFile.path.split('/')[2]}/{customFileName}.{selectedFile.name.split('.').pop()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter className="pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Annulla
          </Button>
          
          {allowSelectFile && (
            <Button 
              onClick={handleFileSelect}
              disabled={!selectedFile || selectedFile.isDirectory}
            >
              <Save className="h-4 w-4 mr-2" />
              Seleziona
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      
      {/* Dialog for folder creation */}
      <Dialog open={isCreatingFolder} onOpenChange={(open) => !open && setIsCreatingFolder(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Modello 3D</DialogTitle>
            <DialogDescription>
              Inserisci il nome della cartella del modello. Verrà creata una struttura con tutti i file necessari.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome cartella modello:</Label>
              <Input
                id="folder-name"
                placeholder="es. A4B12345"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                La cartella conterrà un file '{newFolderName || 'NOME'}.htm' e tutti i file di supporto necessari.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source-folder">Copia file da cartella esistente (opzionale):</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {getAvailableFolders().length > 0 ? (
                  getAvailableFolders().map((folder) => (
                    <div key={folder.path} className="flex items-center p-1 hover:bg-gray-100">
                      <Checkbox
                        id={`folder-${folder.name}`}
                        checked={selectedSourceFolder === folder.name}
                        onCheckedChange={() => setSelectedSourceFolder(
                          selectedSourceFolder === folder.name ? null : folder.name
                        )}
                        className="mr-2"
                      />
                      <Label 
                        htmlFor={`folder-${folder.name}`}
                        className="flex items-center cursor-pointer flex-grow"
                      >
                        <Folder className="h-4 w-4 mr-1 text-blue-500" />
                        {folder.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    Nessuna cartella disponibile
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Se selezionata, tutti i file di supporto verranno copiati dalla cartella scelta.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreatingFolder(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4 mr-2" />
              )}
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}