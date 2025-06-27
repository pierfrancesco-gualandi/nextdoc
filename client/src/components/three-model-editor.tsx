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

const ThreeModelEditor: React.FC<ThreeModelEditorProps> = ({
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

  useEffect(() => {
    // Quando cambia il valore di src, imposta previewUrl
    if (currentValues.src) {
      setPreviewUrl(currentValues.src);
    }
  }, [currentValues.src]);

  // Gestisce il cambio del file selezionato
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Per i modelli WebGL, accetta solo file ZIP
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Estrai il nome del modello dal nome del file ZIP
        const modelPattern = /^([A-Z]\d[A-Z]\d+)\.zip$/i;
        const match = file.name.match(modelPattern);
        
        if (match) {
          const modelName = match[1];
          console.log(`Rilevato modello WebGL ZIP: ${modelName}`);
          
          // Imposta automaticamente i campi per modello WebGL
          setValue('folderPath', modelName);
          setValue('format', 'html');
          
          toast({
            title: "Modello WebGL ZIP rilevato",
            description: `Rilevato modello ${modelName}. Il sistema estrarrà automaticamente tutti i file necessari.`
          });
        } else {
          toast({
            title: "Nome file ZIP non valido",
            description: "Il file ZIP deve avere un nome nel formato A4B12345.zip",
            variant: "destructive",
          });
        }
      } else {
        // Verifica se è un formato supportato per modelli non-WebGL
        const validExtensions = ['.glb', '.gltf'];
        const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (isValid) {
          // Imposta il formato in base all'estensione del file
          let format: 'glb' | 'gltf' = 'glb';
          
          if (file.name.endsWith('.glb')) {
            format = 'glb';
          } else if (file.name.endsWith('.gltf')) {
            format = 'gltf';
          }
          
          setValue('format', format);
          
          toast({
            title: "Modello 3D rilevato",
            description: `File ${format.toUpperCase()} caricato correttamente`
          });
        } else {
          toast({
            title: "Formato file non supportato",
            description: "Per modelli WebGL usa file ZIP (A4B12345.zip). Per altri modelli usa .glb o .gltf",
            variant: "destructive",
          });
        }
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
        if (file.webkitRelativePath) {
          hasDirStructure = true;
          break;
        }
      }
      
      if (hasDirStructure) {
        toast({
          title: "Struttura cartelle rilevata",
          description: `Rilevati ${filesList.length} file in una struttura di cartelle`
        });
      } else {
        toast({
          title: "File aggiuntivi selezionati",
          description: `Selezionati ${filesList.length} file di supporto`
        });
      }
    }
  };
  
  // Gestisce il caricamento dei file
  const uploadFile = async () => {
    if (!selectedFile) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona un file da caricare",
        variant: "destructive",
      });
      return null;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Se c'è un formato specificato, includilo
      if (currentValues.format) {
        formData.append('format', currentValues.format);
      }
      
      // Se è un modello 3D WebGL, includi le informazioni sulla cartella
      const is3DModel = selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm');
      const modelName = currentValues.folderPath || selectedFile.name.split('.')[0];
      
      if (is3DModel) {
        // Includi info sulla cartella
        formData.append('folderPath', modelName);
        formData.append('sourceModelName', currentValues.sourceModelName || '');
      }
      
      // Includi eventuali file di supporto
      if (selectedFolderFiles) {
        for (let i = 0; i < selectedFolderFiles.length; i++) {
          formData.append('supportFiles', selectedFolderFiles[i]);
        }
      }
      
      // Effettua l'upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento del file');
      }
      
      const data = await response.json();
      
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
  const handleCreateFolder = async (folderName: string, sourceFolderName?: string): Promise<boolean> => {
    const nameToUse = folderName || newFolderName;
    if (!nameToUse) {
      toast({
        title: "Nome cartella richiesto",
        description: "Inserisci un nome per la cartella",
        variant: "destructive",
      });
      return false;
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
          folderName: nameToUse,
          sourceModelName: sourceFolderName || currentValues.sourceModelName || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore durante la creazione della cartella');
      }
      
      const data = await response.json();
      
      // Imposta i campi del form con i valori corretti tornati dal server
      setValue('src', data.fileUrl);
      setValue('folderPath', nameToUse);
      setValue('format', 'html');
      
      // Aggiorna l'anteprima
      setPreviewUrl(data.fileUrl);
      
      toast({
        title: "Cartella modello creata",
        description: `La cartella ${nameToUse} è stata creata con successo`,
      });
      
      // Chiudi il dialogo
      setIsCreateFolderDialogOpen(false);
      return true;
    } catch (error) {
      console.error('Errore creazione cartella:', error);
      toast({
        title: "Errore creazione cartella",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
      return false;
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
    <>
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
                              accept=".glb,.gltf,.zip"
                              onChange={handleFileChange}
                            />
                            <p className="text-sm text-gray-500">
                              Formati supportati: .glb, .gltf, .zip (per modelli WebGL)
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
                            
                            {selectedFile && selectedFile.name.endsWith('.zip') ? (
                              <div className="space-y-4">
                                <div className="p-3 bg-green-50 rounded-md border border-green-100">
                                  <p className="text-sm text-green-800 font-medium">
                                    File ZIP per modello WebGL rilevato
                                  </p>
                                  <p className="text-sm text-green-600 mt-1">
                                    Il sistema estrarrà automaticamente tutti i file necessari per il modello 3D
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
                                      <div className="text-sm text-green-700">
                                        {selectedFolderFiles.length} file selezionati
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2 border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center">
                                    <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                      <FolderOpen className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium">
                                        Seleziona altri file di supporto
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Seleziona tutti i file JavaScript, CSS e risorse richieste dal modello 3D
                                      </p>
                                    </div>
                                    <Input
                                      id="folder-files"
                                      type="file"
                                      multiple
                                      className="hidden"
                                      onChange={handleFolderFilesChange}
                                    />
                                    <label htmlFor="folder-files">
                                      <div className="mt-3 inline-flex items-center rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 cursor-pointer hover:bg-blue-100">
                                        Seleziona file
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">
                                Nessuna configurazione aggiuntiva necessaria per questo tipo di file
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsUploadDialogOpen(false)}
                        >
                          Annulla
                        </Button>
                        <Button 
                          type="button" 
                          onClick={uploadFile}
                          disabled={!selectedFile || isUploading}
                        >
                          {isUploading ? 'Caricamento...' : 'Carica'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                    </Dialog>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateFolderDialogOpen(true)}
                      title="Crea nuova cartella modello"
                    >
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Crea
                    </Button>
                  </div>
                </div>
                {errors.src && (
                  <p className="text-red-500 text-sm mt-1">L'URL del modello è obbligatorio</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="folderPath">Cartella del modello WebGL</Label>
                <Controller
                  name="folderPath"
                  control={control}
                  render={({ field }) => (
                    <Input 
                      id="folderPath" 
                      placeholder="Nome della cartella contenente i file del modello (per WebGL)" 
                      {...field} 
                    />
                  )}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Necessario solo per i modelli in formato HTML/WebGL
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="options" className="space-y-4">
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-medium">Controlli del visualizzatore</h3>
                
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
                  <Label htmlFor="rotate">Attiva rotazione</Label>
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
                  <Label htmlFor="zoom">Attiva zoom</Label>
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
                  <Label htmlFor="pan">Attiva panning</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-4">Anteprima del modello 3D</h3>
                
                {previewUrl ? (
                  <div className="rounded-md overflow-hidden border bg-gray-50">
                    <ThreeModelViewer
                      modelData={{
                        src: previewUrl,
                        format: currentValues.format || 'html',
                        folderPath: currentValues.folderPath
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-8 border rounded-md text-center bg-gray-50">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <FileEdit className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500">
                      Nessun modello selezionato. Carica o seleziona un modello per visualizzare l'anteprima.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 pt-2">
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
      onCreateFolder={(folderName, sourceFolderName) => {
        return handleCreateFolder(folderName, sourceFolderName);
      }}
      initialPath="/uploads"
      allowSelectFile={true}
      allowCreateFolder={true}
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
            onClick={() => handleCreateFolder(newFolderName, currentValues.sourceModelName)}
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