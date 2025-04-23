import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThreeDModelModuleContent } from '@shared/schema';
import ThreeModelViewer from './three-model-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileExplorer } from './file-explorer';
import { Folder, FolderOpen, FolderPlus, FileEdit } from 'lucide-react';

interface ThreeModelEditorProps {
  initialValue?: ThreeDModelModuleContent;
  onSave: (content: ThreeDModelModuleContent) => void;
  onCancel?: () => void;
}

const defaultModelContent: ThreeDModelModuleContent = {
  src: '',
  title: '',
  format: 'glb',
  folderPath: '',
  controls: {
    rotate: true,
    zoom: true,
    pan: true,
  },
};

export const ThreeModelEditor: React.FC<ThreeModelEditorProps> = ({
  initialValue = defaultModelContent,
  onSave,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<ThreeDModelModuleContent>({
    defaultValues: initialValue,
  });

  const currentValues = watch();

  // Aggiorna l'anteprima quando cambia il file o l'URL
  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      
      // Cleanup dell'URL creato per evitare memory leak
      return () => URL.revokeObjectURL(objectUrl);
    } else if (initialValue.src) {
      setPreviewUrl(initialValue.src);
    }
    
    return undefined;
  }, [selectedFile, initialValue.src]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Verifica che il file sia di tipo supportato
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf') || 
          file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        setSelectedFile(file);
        
        // Imposta il formato in base all'estensione del file
        let format: 'glb' | 'gltf' | 'html' | 'webgl' = 'glb';
        
        if (file.name.endsWith('.glb')) {
          format = 'glb';
        } else if (file.name.endsWith('.gltf')) {
          format = 'gltf';
        } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          format = 'html';
          
          // Estrai il nome del modello 3D dal nome del file per i file HTML/HTM
          const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
          const match = file.name.match(modelPattern);
          
          if (match) {
            const modelName = match[1];
            console.log(`Rilevato modello 3D WebGL: ${modelName}`);
            
            // Imposta automaticamente il campo folderPath
            setValue('folderPath', modelName);
            
            toast({
              title: "Modello 3D rilevato",
              description: `Rilevato modello con codice ${modelName}. Il sistema gestirà automaticamente la creazione delle cartelle necessarie.`
            });
          }
        }
        
        setValue('format', format);
      } else {
        toast({
          title: "Formato file non supportato",
          description: "Per favore seleziona un file .glb, .gltf o .html",
          variant: "destructive",
        });
      }
    }
  };
  
  // Gestisce la selezione dei file della cartella (per modelli HTML/WebGL)
  const handleFolderFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFolderFiles(e.target.files);
      
      // Analizza i file selezionati per informazioni utili
      const filesList = Array.from(e.target.files);
      let hasDirStructure = false;
      
      // Controlla se c'è struttura di cartelle (webkitRelativePath)
      for (const file of filesList) {
        // @ts-ignore - webkitRelativePath è proprietà specifica per input directory
        if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
          hasDirStructure = true;
          break;
        }
      }
      
      // Controlla se ci sono file HTML che potrebbero essere il file principale
      const htmlFiles = filesList.filter(file => 
        file.name.toLowerCase().endsWith('.htm') || 
        file.name.toLowerCase().endsWith('.html')
      );
      
      // Messaggio diverso in base ai risultati
      if (hasDirStructure) {
        toast({
          title: "Cartella selezionata",
          description: `${e.target.files.length} file da caricare con la struttura di cartelle originale`,
        });
      } else if (htmlFiles.length > 0) {
        toast({
          title: "File HTML e supporto selezionati",
          description: `Trovati ${htmlFiles.length} file HTML tra i ${e.target.files.length} file selezionati`,
        });
        
        // Se non c'è un file principale selezionato, usa il primo HTML come file principale
        if (!selectedFile && htmlFiles.length > 0) {
          setSelectedFile(htmlFiles[0]);
          
          // Estrai il nome del modello 3D dal nome del file per i file HTML/HTM
          const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
          const match = htmlFiles[0].name.match(modelPattern);
          
          if (match) {
            const modelName = match[1];
            console.log(`Impostato file principale automaticamente: ${htmlFiles[0].name} (${modelName})`);
            setValue('format', 'html');
            setValue('folderPath', modelName);
          }
        }
      } else {
        toast({
          title: "File aggiuntivi selezionati",
          description: `${e.target.files.length} file selezionati per il modello WebGL`,
        });
      }
    }
  };

  // Funzione per caricare i file della cartella selezionata (solo per HTML/WebGL)
  const uploadFolder = async (folderFiles: FileList) => {
    if (!folderFiles.length) return null;
    
    setIsUploading(true);
    
    try {
      // Crea un FormData con tutti i file
      const formData = new FormData();
      
      // Ottieni il nome modello dal file HTML principale (se possibile)
      let folderName = '';
      
      // Verifica se il file selezionato è un modello 3D standard (A4B10789.htm)
      if (selectedFile) {
        const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
        const match = selectedFile.name.match(modelPattern);
        
        if (match) {
          // Usa il nome del modello estratto (es. A4B10789)
          folderName = match[1];
          console.log(`Rilevato modello 3D standard: ${folderName}`);
        } else {
          // Fallback al nome del file senza estensione
          folderName = selectedFile.name.split('.')[0];
        }
      } else {
        // Se non c'è un file principale, usa un timestamp
        folderName = `folder_${Date.now()}`;
      }
      
      // Aggiungi il nome della cartella al FormData
      formData.append('folderName', folderName);
      
      // Aggiungi il file principale
      if (selectedFile) {
        formData.append('mainFile', selectedFile);
      }
      
      // Aggiungi tutti i file di supporto al formData
      Array.from(folderFiles).forEach((file) => {
        // Evita di caricare duplicati se il file principale è già nel formData
        if (selectedFile && file.name === selectedFile.name) {
          return;
        }
        formData.append('supportFiles', file);
      });
      
      console.log(`Caricamento modello 3D ${folderName} con ${folderFiles.length} file di supporto...`);
      
      // Usa l'endpoint dedicato per il caricamento dei modelli 3D
      const response = await fetch('/api/upload-3d-model', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento del modello 3D');
      }
      
      const data = await response.json();
      
      console.log('Risposta server:', data);
      
      // Imposta i campi del form con i valori corretti tornati dal server
      setValue('src', data.url);
      setValue('folderPath', data.folderName);
      
      toast({
        title: "Modello 3D caricato con successo",
        description: `${data.filesCount || 0} file caricati correttamente`,
      });
      
      return {
        src: data.url,
        folderPath: data.folderName
      };
    } catch (error) {
      console.error('Errore di upload modello 3D:', error);
      toast({
        title: "Errore di caricamento",
        description: "Si è verificato un errore durante il caricamento del modello 3D",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    
    setIsUploading(true);
    
    try {
      // Se è un file HTML e abbiamo i file di supporto, carica come cartella
      if ((selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) && 
          selectedFolderFiles && selectedFolderFiles.length > 0) {
        const result = await uploadFolder(selectedFolderFiles);
        setIsUploadDialogOpen(false);
        return result;
      }
      
      // Verifica se è un modello 3D standard (A4B10789.htm)
      const modelPattern = /^([A-Z]\d[A-Z]\d+)\.(?:htm|html)$/i;
      const match = selectedFile.name.match(modelPattern);
      let is3DModel = false;
      let modelName = '';
      
      if (match && (selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm'))) {
        is3DModel = true;
        modelName = match[1];
        console.log(`Caricamento modello 3D WebGL: ${modelName}`);
      }
      
      // Caricamento normale di un singolo file
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Se è un modello 3D, imposta il flag
      if (is3DModel) {
        formData.append('webglModel', 'true');
        formData.append('folderName', modelName);
        
        // Aggiungi la cartella di origine per i file di supporto se specificata
        if (currentValues.sourceModelName) {
          formData.append('sourceModelName', currentValues.sourceModelName);
          console.log('Aggiungendo cartella di origine per i file di supporto:', currentValues.sourceModelName);
        }
        
        console.log('Aggiungendo parametri per modello 3D:', { 
          webglModel: true, 
          folderName: modelName,
          sourceModelName: currentValues.sourceModelName || 'non specificato'
        });
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento del file');
      }
      
      const data = await response.json();
      
      // Imposta l'URL del file caricato
      setValue('src', `/uploads/${data.filename}`);
      
      // Se è un file HTML, imposta il folderPath
      if (selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) {
        let folderName;
        
        if (is3DModel) {
          folderName = modelName;
          // Per un modello 3D standard, usa il percorso corretto
          setValue('src', `/uploads/${modelName}/${modelName}.htm`);
        } else {
          folderName = selectedFile.name.split('.')[0];
        }
        
        setValue('folderPath', folderName);
        
        toast({
          title: "File HTML caricato con successo",
          description: is3DModel 
            ? `Il modello WebGL ${modelName} è stato caricato correttamente con la struttura di cartelle necessaria`
            : "Il modello WebGL è stato caricato correttamente",
        });
        
        setIsUploadDialogOpen(false);
        return {
          src: is3DModel ? `/uploads/${modelName}/${modelName}.htm` : `/uploads/${data.filename}`,
          folderPath: folderName
        };
      }
      
      toast({
        title: "File caricato con successo",
        description: "Il modello 3D è stato caricato correttamente",
      });
      
      setIsUploadDialogOpen(false);
      return `/uploads/${data.filename}`;
    } catch (error) {
      console.error('Errore di upload:', error);
      toast({
        title: "Errore di caricamento",
        description: "Si è verificato un problema durante il caricamento del file",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Gestisce la selezione di un file dall'esplora file
  const handleSelectFile = (filePath: string) => {
    console.log('File selezionato:', filePath);
    
    // Controllo se è un percorso valido
    if (!filePath || !filePath.startsWith('/uploads/')) {
      toast({
        title: "Percorso file non valido",
        description: "Il file deve essere nella cartella uploads",
        variant: "destructive",
      });
      return;
    }
    
    // Imposta l'URL del file nel form
    setValue('src', filePath);
    
    // Chiudi il dialogo dell'esplora file
    setIsFileExplorerOpen(false);
    
    // Se è un file WebGL/HTML, estrai il nome della cartella
    if (filePath.endsWith('.htm') || filePath.endsWith('.html')) {
      // Estrai il nome del modello dal percorso
      const parts = filePath.split('/');
      if (parts.length >= 3) {
        const folderName = parts[parts.length - 2];
        setValue('folderPath', folderName);
        setValue('format', 'html');
        
        toast({
          title: "Modello WebGL selezionato",
          description: `Cartella modello: ${folderName}`,
        });
      }
    } else if (filePath.endsWith('.glb')) {
      setValue('format', 'glb');
    } else if (filePath.endsWith('.gltf')) {
      setValue('format', 'gltf');
    }
    
    // Aggiorna l'anteprima
    setPreviewUrl(filePath);
  };
  
  // Gestisce la creazione di una nuova cartella per il modello
  const handleCreateFolder = async () => {
    if (!newFolderName) {
      toast({
        title: "Nome cartella richiesto",
        description: "Inserisci un nome per la cartella",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Chiamata API per creare la cartella del modello
      const response = await fetch('/api/files/create-model-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName: newFolderName,
          sourceModelName: currentValues.sourceModelName || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore durante la creazione della cartella');
      }
      
      const data = await response.json();
      
      // Imposta i campi del form con i valori corretti tornati dal server
      setValue('src', data.fileUrl);
      setValue('folderPath', newFolderName);
      setValue('format', 'html');
      
      // Aggiorna l'anteprima
      setPreviewUrl(data.fileUrl);
      
      toast({
        title: "Cartella modello creata",
        description: `La cartella ${newFolderName} è stata creata con successo`,
      });
      
      // Chiudi il dialogo
      setIsCreateFolderDialogOpen(false);
    } catch (error) {
      console.error('Errore creazione cartella:', error);
      toast({
        title: "Errore creazione cartella",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const onSubmit = async (data: ThreeDModelModuleContent) => {
    // Se c'è un file selezionato ma non ancora caricato, caricalo
    if (selectedFile && !data.src) {
      const result = await uploadFile();
      if (result) {
        // Se il risultato è un oggetto (dal caricamento cartella)
        if (typeof result === 'object') {
          data.src = result.src;
          data.folderPath = result.folderPath;
        } else {
          // Altrimenti è una stringa URL
          data.src = result;
        }
      } else {
        return; // Interrompi se l'upload non è riuscito
      }
    }
    
    onSave(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Editor Modello 3D</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="basic">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Informazioni Base</TabsTrigger>
              <TabsTrigger value="options">Opzioni Visualizzazione</TabsTrigger>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="title">Titolo del modello</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="title" 
                      placeholder="Inserisci un titolo per il modello" 
                      {...field} 
                    />
                  )}
                />
              </div>
              
              <div>
                <Label htmlFor="format">Formato del file</Label>
                <Controller
                  name="format"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select 
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="glb">GLB</SelectItem>
                        <SelectItem value="gltf">GLTF</SelectItem>
                        <SelectItem value="html">HTML (WebGL)</SelectItem>
                        <SelectItem value="webgl">WebGL</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.format && (
                  <p className="text-red-500 text-sm mt-1">Il formato è obbligatorio</p>
                )}
              </div>
              
              <div className="pt-2">
                <Label>File 3D</Label>
                <div className="flex items-start mt-2">
                  <Controller
                    name="src"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Input 
                        id="src" 
                        placeholder="URL del modello 3D" 
                        {...field} 
                        className="mr-2"
                      />
                    )}
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsFileExplorerOpen(true)}
                      title="Sfoglia file esistenti"
                    >
                      <Folder className="w-4 h-4 mr-2" />
                      Sfoglia
                    </Button>
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="secondary">Carica</Button>
                      </DialogTrigger>
                      <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Carica modello 3D</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-5">
                          <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="model-file">File modello 3D principale</Label>
                            <Input
                              id="model-file"
                              type="file"
                              accept=".glb,.gltf,.html,.htm"
                              onChange={handleFileChange}
                            />
                            <p className="text-sm text-gray-500">
                              Formati supportati: .glb, .gltf, .html (WebGL)
                            </p>
                          </div>
                          
                          {selectedFile && (
                            <div className="text-sm mt-2 p-3 border rounded-md bg-gray-50">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium">{selectedFile.name}</p>
                                  <p className="text-gray-500">Dimensione: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="border-t pt-4 mt-4">
                            <div className="font-medium mb-2">Modalità di caricamento</div>
                            
                            {selectedFile && (selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) ? (
                              <div className="space-y-4">
                                <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
                                  <p className="text-sm text-blue-800 font-medium">
                                    Rilevato file HTML/WebGL che potrebbe richiedere file aggiuntivi
                                  </p>
                                  <p className="text-sm text-blue-600 mt-1">
                                    Per i modelli 3D WebGL, è necessario caricare tutti i file di supporto necessari
                                  </p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="dialog-folder-path">Nome della cartella</Label>
                                  <Input 
                                    id="dialog-folder-path" 
                                    placeholder="Nome della cartella per i file del modello"
                                    value={currentValues.folderPath || ''}
                                    onChange={(e) => setValue('folderPath', e.target.value)}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {currentValues.folderPath ? 
                                      `I file verranno organizzati nella cartella '${currentValues.folderPath}'` : 
                                      "Il sistema creerà automaticamente una cartella basata sul nome del file"}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="source-model-name">Cartella di origine per i file di supporto</Label>
                                  <Select 
                                    onValueChange={(value) => setValue('sourceModelName', value)}
                                    defaultValue={currentValues.sourceModelName || ''}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Seleziona la cartella di origine per i file di supporto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Nessuna cartella di origine (segnaposto)</SelectItem>
                                      <SelectItem value="A4B09778">A4B09778</SelectItem>
                                      <SelectItem value="A4B09179">A4B09179</SelectItem>
                                      <SelectItem value="A4B10823">A4B10823</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Specifica la cartella da cui copiare i file di supporto (come iv3d.js e altri)
                                  </p>
                                </div>
                                
                                <div>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="folder-files">File aggiuntivi per il modello</Label>
                                    {selectedFolderFiles && (
                                      <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                        {selectedFolderFiles.length} file
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 border-2 border-dashed rounded-md p-6 text-center hover:bg-gray-50 transition-colors">
                                    <Input
                                      id="folder-files"
                                      type="file"
                                      multiple
                                      className="hidden"
                                      onChange={handleFolderFilesChange}
                                    />
                                    <label htmlFor="folder-files" className="cursor-pointer block">
                                      <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="17 8 12 3 7 8"></polyline>
                                          <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                      </div>
                                      <div className="text-sm font-medium">Fare clic per selezionare i file</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        O trascinare i file qui
                                      </div>
                                    </label>
                                  </div>
                                  
                                  {selectedFolderFiles && selectedFolderFiles.length > 0 && (
                                    <div className="mt-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50">
                                      <p className="text-xs font-medium text-gray-700 mb-1">File selezionati:</p>
                                      {Array.from(selectedFolderFiles).slice(0, 10).map((file, index) => (
                                        <div key={index} className="text-xs text-gray-600 truncate">
                                          {index + 1}. {file.name}
                                        </div>
                                      ))}
                                      {selectedFolderFiles.length > 10 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          ...e altri {selectedFolderFiles.length - 10} file
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-800">
                                  Caricamento file singolo (formato {selectedFile?.name.split('.').pop() || 'non selezionato'})
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  I modelli in formato GLB/GLTF vengono caricati direttamente come file singolo
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsUploadDialogOpen(false)}
                          >
                            Annulla
                          </Button>
                          <Button
                            type="button"
                            disabled={!selectedFile || isUploading}
                            onClick={uploadFile}
                          >
                            {isUploading ? 'Caricamento...' : 'Carica Modello'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {errors.src && (
                  <p className="text-red-500 text-sm mt-1">L'URL del modello è obbligatorio</p>
                )}
                </div>
              </div>
              
              {(currentValues.format === 'html' || currentValues.format === 'webgl') && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="folderPath">Percorso cartella (opzionale)</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsCreateFolderDialogOpen(true)}
                      className="h-8 px-2 text-xs"
                    >
                      <FolderPlus className="w-4 h-4 mr-1" />
                      Crea cartella modello
                    </Button>
                  </div>
                  <Controller
                    name="folderPath"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        id="folderPath" 
                        placeholder="Percorso alla cartella contenente i file necessari" 
                        {...field} 
                      />
                    )}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Specifica solo se il modello WebGL richiede file aggiuntivi in una cartella
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="options" className="space-y-4">
              <div className="mt-4 space-y-3">
                <h3 className="text-lg font-medium">Controlli Interattivi</h3>
                
                <div className="flex items-center space-x-2">
                  <Controller
                    name="controls.rotate"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="rotate"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="rotate">Abilita rotazione</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Controller
                    name="controls.zoom"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="zoom"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="zoom">Abilita zoom</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Controller
                    name="controls.pan"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="pan"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="pan">Abilita panning</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="rounded-lg overflow-hidden border">
                {previewUrl ? (
                  <ThreeModelViewer
                    modelData={{ ...currentValues, src: previewUrl }}
                    width="100%"
                    height="400px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[400px] bg-gray-100 text-gray-500">
                    Nessun modello 3D da visualizzare
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Annulla
              </Button>
            )}
            <Button type="submit">Salva</Button>
          </div>
        </form>
      </CardContent>
    </Card>

    {/* File Explorer Dialog */}
    <FileExplorer
      isOpen={isFileExplorerOpen}
      onClose={() => setIsFileExplorerOpen(false)}
      onSelectFile={handleSelectFile}
      initialPath="/uploads"
      allowSelectFile={true}
      title="Seleziona modello 3D"
    />

    {/* Create Folder Dialog */}
    <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crea nuova cartella modello</DialogTitle>
          <DialogDescription>
            Inserisci il nome della cartella per il modello 3D. Verranno creati tutti i file necessari.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="new-folder-name">Nome cartella:</Label>
            <Input
              id="new-folder-name"
              placeholder="es. A4B12345"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Verrà creato il file {newFolderName || 'NOMECARTELLA'}.htm e tutti i file di supporto necessari.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="source-model">Cartella di origine (opzionale):</Label>
            <Select 
              onValueChange={(value) => setValue('sourceModelName', value)}
              defaultValue={currentValues.sourceModelName || ''}
            >
              <SelectTrigger id="source-model">
                <SelectValue placeholder="Copia file da modello esistente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nessuna cartella di origine</SelectItem>
                <SelectItem value="A4B09778">A4B09778</SelectItem>
                <SelectItem value="A4B09179">A4B09179</SelectItem>
                <SelectItem value="A4B10823">A4B10823</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Selezionando un modello esistente, i file di supporto saranno copiati da esso.
            </p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateFolderDialogOpen(false)}
          >
            Annulla
          </Button>
          <Button 
            type="button" 
            onClick={handleCreateFolder}
            disabled={isUploading || !newFolderName}
          >
            {isUploading ? 'Creazione...' : 'Crea cartella'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThreeModelEditor;