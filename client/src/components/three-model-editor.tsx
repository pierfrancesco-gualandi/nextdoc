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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
      
      toast({
        title: "File aggiuntivi selezionati",
        description: `${e.target.files.length} file selezionati per il modello WebGL`,
      });
    }
  };

  // Funzione per caricare i file della cartella selezionata (solo per HTML/WebGL)
  const uploadFolder = async (folderFiles: FileList) => {
    if (!folderFiles.length) return null;
    
    setIsUploading(true);
    
    try {
      // Crea un FormData con tutti i file
      const formData = new FormData();
      
      // Usa il nome della cartella basata sul nome del file principale
      const folderName = selectedFile?.name.split('.')[0] || `folder_${Date.now()}`;
      formData.append('folderName', folderName);
      
      // Aggiungi tutti i file al formData
      Array.from(folderFiles).forEach((file) => {
        formData.append('files', file);
      });
      
      // Carica i file come cartella
      const response = await fetch('/api/upload-folder', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento della cartella');
      }
      
      const data = await response.json();
      
      // Imposta i campi del form
      setValue('src', `/uploads/${data.filename}`);
      setValue('folderPath', data.folderName);
      
      toast({
        title: "Cartella caricata con successo",
        description: `${data.totalFiles} file caricati correttamente`,
      });
      
      return {
        src: `/uploads/${data.filename}`,
        folderPath: data.folderName
      };
    } catch (error) {
      console.error('Errore di upload cartella:', error);
      toast({
        title: "Errore di caricamento",
        description: "Errore durante il caricamento della cartella",
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
        
        console.log('Aggiungendo parametri per modello 3D:', { webglModel: true, folderName: modelName });
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
                  <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="secondary">Carica</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Carica modello 3D</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                          <Label htmlFor="model-file">File 3D</Label>
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
                          <div className="text-sm">
                            <p>File selezionato: {selectedFile.name}</p>
                            <p>Dimensione: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        )}
                        
                        {selectedFile && (selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) && (
                          <div className="mt-4 space-y-4">
                            <div>
                              <Label htmlFor="dialog-folder-path">Percorso cartella (opzionale)</Label>
                              <Input 
                                id="dialog-folder-path" 
                                placeholder="Percorso alla cartella contenente i file necessari"
                                value={currentValues.folderPath || ''}
                                onChange={(e) => setValue('folderPath', e.target.value)}
                              />
                              <p className="text-sm text-gray-500 mt-1">
                                Specifica solo se il modello WebGL richiede file aggiuntivi in una cartella
                              </p>
                            </div>
                            
                            <div>
                              <Label htmlFor="folder-files">File aggiuntivi per il modello</Label>
                              <Input
                                id="folder-files"
                                type="file"
                                multiple
                                onChange={handleFolderFilesChange}
                              />
                              <p className="text-sm text-gray-500 mt-1">
                                Seleziona tutti i file aggiuntivi necessari al modello HTML
                              </p>
                              
                              {selectedFolderFiles && (
                                <p className="text-sm text-blue-500 mt-2">
                                  {selectedFolderFiles.length} file aggiuntivi selezionati
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
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
              
              {(currentValues.format === 'html' || currentValues.format === 'webgl') && (
                <div className="pt-2">
                  <Label htmlFor="folderPath">Percorso cartella (opzionale)</Label>
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
  );
};

export default ThreeModelEditor;