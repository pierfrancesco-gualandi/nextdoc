import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, apiUploadRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Upload } from "lucide-react";

interface ModuleToolbarProps {
  sectionId: number;
  onModuleAdded: (module: any) => void;
}

export default function ModuleToolbar({ sectionId, onModuleAdded }: ModuleToolbarProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadType, setUploadType] = useState<"image" | "video" | "pdf" | "3d-model">("image");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [showFolderUpload, setShowFolderUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderFilesInputRef = useRef<HTMLInputElement>(null);
  
  const moduleTypes = [
    { id: "text", icon: "text_fields", label: "Testo" },
    { id: "image", icon: "image", label: "Immagine" },
    { id: "video", icon: "smart_display", label: "Video" },
    { id: "table", icon: "table_chart", label: "Tabella" },
    { id: "checklist", icon: "checklist", label: "Checklist" },
    { id: "warning", icon: "warning", label: "Avviso" },
    { id: "link", icon: "link", label: "Link" },
    { id: "pdf", icon: "picture_as_pdf", label: "PDF" },
    { id: "component", icon: "category", label: "Componente" },
    { id: "3d-model", icon: "view_in_ar", label: "Modello 3D" }
  ];
  
  const createModuleMutation = useMutation({
    mutationFn: async (moduleData: any) => {
      const res = await apiRequest('POST', '/api/modules', moduleData);
      return await res.json();
    },
    onSuccess: (data) => {
      onModuleAdded(data);
      toast({
        title: "Modulo aggiunto",
        description: "Il modulo è stato aggiunto con successo."
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiunta del modulo: ${error}`,
        variant: "destructive"
      });
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiUploadRequest('POST', '/api/upload', formData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Dopo l'upload, crea il modulo con il file caricato
      let moduleContent = {};
      
      switch (uploadType) {
        case "image":
          moduleContent = { 
            src: data.url, 
            alt: fileDescription || data.originalName, 
            caption: fileDescription 
          };
          break;
        case "video":
          moduleContent = { 
            src: data.url, 
            caption: fileDescription 
          };
          break;
        case "pdf":
          moduleContent = { 
            src: data.url, 
            title: fileDescription || data.originalName 
          };
          break;
        case "3d-model":
          // Determina il formato del file dal nome del file
          let format = "glb";
          if (selectedFile) {
            const fileName = selectedFile.name.toLowerCase();
            if (fileName.endsWith('.gltf')) format = "gltf";
            else if (fileName.endsWith('.obj')) format = "obj";
            else if (fileName.endsWith('.stl')) format = "stl";
            else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) format = "html";
            else if (fileName.endsWith('.zip')) format = "html"; // Consideriamo i ZIP come HTML (WebGL)
            else if (fileName.endsWith('.jt')) format = "jt"; // Supporto per JT files
          }
          
          // Crea il modulo con le informazioni di base
          moduleContent = { 
            src: data.url, 
            title: fileDescription || data.originalName,
            format: format,
            controls: { rotate: true, zoom: true, pan: true }
          };
          
          // Se è un file HTML o un file ZIP estratto, aggiungi le informazioni aggiuntive
          if ((format === "html" || data.isZipExtract) && selectedFile) {
            let folderName = selectedFile.name.split('.')[0];
            
            // Se è un file ZIP estratto, usa le informazioni dal server
            if (data.isZipExtract) {
              console.log("File ZIP estratto con successo:", data);
              format = "html"; // Forza il formato HTML per ZIP estratti
              
              // Aggiungi tutte le informazioni della cartella estratta
              moduleContent = {
                ...moduleContent,
                format: format,
                folderName: data.folderName,
                folderPath: data.folderName,
                fileStructure: data.fileStructure || {},
                allFiles: data.allFiles || []
              };
            } else {
              // Per file HTML standard
              moduleContent = {
                ...moduleContent,
                folderPath: folderName
              };
            }
          }
          break;
      }
      
      createModuleMutation.mutate({
        sectionId,
        type: uploadType,
        content: moduleContent,
        order: 999 // Will be reordered after creation
      });
      
      // Reset state
      setSelectedFile(null);
      setSelectedFolderFiles(null);
      setFileDescription('');
      setShowFileUpload(false);
      setShowFolderUpload(false);
      setUploadingFile(false);
    },
    onError: (error) => {
      setUploadingFile(false);
      toast({
        title: "Errore durante il caricamento",
        description: `Errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutazione per il caricamento di una cartella di file (solo per modelli 3D HTML/WebGL)
  const uploadFolderMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiUploadRequest('POST', '/api/upload-folder', formData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Dopo l'upload, crea il modulo con i file caricati
      // Assicuriamoci di avere sempre un folderName/folderPath valido
      let folderName = data.folderName;
      
      // Se non abbiamo un folderName ma abbiamo un fileName, usa il nome del file senza estensione
      if (!folderName && data.originalName) {
        folderName = data.originalName.split('.')[0];
        console.log("Usando il nome del file come nome cartella:", folderName);
      }
      
      // Se ancora non abbiamo un folderName, usa un ID univoco
      if (!folderName) {
        folderName = `folder_${Date.now()}`;
        console.log("Generato nome cartella predefinito:", folderName);
      }
      
      const moduleContent = {
        src: data.url,
        title: fileDescription || data.originalName,
        format: 'html', // Per cartelle intere, assumiamo sempre HTML/WebGL
        folderPath: folderName,
        folderName: folderName,
        fileStructure: data.fileStructure || {},
        allFiles: data.allFiles || [],
        controls: { rotate: true, zoom: true, pan: true }
      };
      
      console.log("Creazione modulo 3D con struttura cartella:", {
        folderName: data.folderName,
        totalFiles: data.totalFiles,
        structureKeys: Object.keys(data.fileStructure || {}).length
      });
      
      createModuleMutation.mutate({
        sectionId,
        type: uploadType,
        content: moduleContent,
        order: 999 // Will be reordered after creation
      });
      
      // Reset state
      setSelectedFile(null);
      setSelectedFolderFiles(null);
      setFileDescription('');
      setShowFileUpload(false);
      setShowFolderUpload(false);
      setUploadingFile(false);
      
      toast({
        title: "Cartella caricata con successo",
        description: `${data.totalFiles} file caricati per il modello WebGL`,
      });
    },
    onError: (error) => {
      setUploadingFile(false);
      toast({
        title: "Errore durante il caricamento della cartella",
        description: `Errore: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleAddModule = (type: string) => {
    // Per i tipi che supportano l'upload, mostra il dialog di upload
    if (type === "image" || type === "video" || type === "pdf" || type === "3d-model") {
      setUploadType(type as "image" | "video" | "pdf" | "3d-model");
      setShowFileUpload(true);
      return;
    }
    
    let defaultContent = {};
    
    // Set default content based on module type
    switch (type) {
      case "text":
        defaultContent = { text: "" };
        break;
      case "image":
        defaultContent = { src: "", alt: "", caption: "" };
        break;
      case "video":
        defaultContent = { src: "", caption: "" };
        break;
      case "table":
        defaultContent = { headers: ["Intestazione 1", "Intestazione 2"], rows: [["", ""]], caption: "" };
        break;
      case "checklist":
        defaultContent = { items: [{ text: "Elemento 1", checked: false }] };
        break;
      case "warning":
        defaultContent = { title: "Attenzione", message: "", level: "warning" };
        break;
      case "link":
        defaultContent = { url: "", text: "", description: "" };
        break;
      case "pdf":
        defaultContent = { src: "", title: "" };
        break;
      case "component":
        defaultContent = { componentId: null, quantity: 1 };
        break;
      case "3d-model":
        defaultContent = { 
          src: "", 
          title: "Modello 3D", 
          format: "glb",
          controls: { rotate: true, zoom: true, pan: true } 
        };
        break;
    }
    
    createModuleMutation.mutate({
      sectionId,
      type,
      content: defaultContent,
      order: 999 // Will be reordered after creation
    });
  };
  
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("moduleType", type);
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const uploadFile = () => {
    if (!selectedFile) {
      toast({
        title: "Errore",
        description: "Seleziona un file da caricare",
        variant: "destructive"
      });
      return;
    }
    
    setUploadingFile(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', '1'); // Default all'admin, si può modificare se necessario
    
    uploadFileMutation.mutate(formData);
  };
  
  // Determina i tipi di file accettati in base al tipo di upload
  const getAcceptedFileTypes = () => {
    switch (uploadType) {
      case "image":
        return "image/*,.jpg,.jpeg,.png,.gif,.svg";
      case "video":
        return "video/*,.mp4,.webm";
      case "pdf":
        return "application/pdf,.pdf";
      case "3d-model":
        return ".glb,.gltf,.obj,.stl,.html,.htm,.zip,.jt";
      default:
        return "*/*";
    }
  };
  
  // Gestisce la selezione di file aggiuntivi per i modelli HTML
  const handleFolderFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFolderFiles(e.target.files);
      
      // Debug per vedere da dove provengono i file (cartella diretta o selezione multipla)
      const files = Array.from(e.target.files);
      
      // Controlla se abbiamo un input webkitdirectory (i file avranno webkitRelativePath)
      // @ts-ignore - webkitRelativePath è una proprietà specifica per gli input di tipo 'directory'
      const isDirectoryUpload = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
      
      if (isDirectoryUpload) {
        // Analizza la struttura della cartella principale
        const rootFolders = new Set<string>();
        const filesByRoot: Record<string, number> = {};
        
        files.forEach(file => {
          // @ts-ignore - webkitRelativePath è una proprietà specifica per input directory
          const relativePath = file.webkitRelativePath || '';
          if (relativePath) {
            const pathParts = relativePath.split('/');
            if (pathParts.length > 1) {
              const rootFolder = pathParts[0];
              rootFolders.add(rootFolder);
              
              // Conta i file per ogni cartella principale
              if (!filesByRoot[rootFolder]) {
                filesByRoot[rootFolder] = 0;
              }
              filesByRoot[rootFolder]++;
            }
          }
        });
        
        // Descrizione più dettagliata con la struttura della cartella
        let folderStructureMessage = '';
        if (rootFolders.size > 0) {
          const foldersList = Array.from(rootFolders).map(folder => 
            `${folder} (${filesByRoot[folder]} file)`
          ).join(', ');
          
          folderStructureMessage = `Struttura: ${foldersList}`;
        }
        
        console.log("Caricamento cartella rilevato:", folderStructureMessage);
        files.forEach(file => {
          // @ts-ignore
          console.log(`File nella cartella: ${file.name}, Percorso: ${file.webkitRelativePath}`);
        });
        
        toast({
          title: "Cartella selezionata",
          description: `${e.target.files.length} file dalla cartella selezionata per il modello WebGL. ${folderStructureMessage}`,
        });
      } else {
        toast({
          title: "File aggiuntivi selezionati",
          description: `${e.target.files.length} file selezionati per il modello WebGL`,
        });
      }
    }
  };
  
  // Gestisce il caricamento di una cartella intera
  const uploadFolder = () => {
    if (!selectedFile || !selectedFolderFiles || selectedFolderFiles.length === 0) {
      toast({
        title: "Errore",
        description: "Seleziona un file HTML principale e i file aggiuntivi",
        variant: "destructive"
      });
      return;
    }
    
    setUploadingFile(true);
    
    const formData = new FormData();
    
    // Detección del tipo de carga y análisis de la estructura de la carpeta
    const files = Array.from(selectedFolderFiles);
    // @ts-ignore - webkitRelativePath è una proprietà specifica per gli input di tipo 'directory'
    const isDirectoryUpload = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
    
    // Determina il nome della cartella
    let folderName = '';
    
    if (isDirectoryUpload) {
      // Se è un caricamento di cartella, trova la cartella principale
      const rootFolders = new Set<string>();
      files.forEach(file => {
        // @ts-ignore
        const relativePath = file.webkitRelativePath || '';
        if (relativePath) {
          const pathParts = relativePath.split('/');
          if (pathParts.length > 0) {
            rootFolders.add(pathParts[0]);
          }
        }
      });
      
      // Usa il nome della prima cartella principale (se c'è)
      if (rootFolders.size > 0) {
        folderName = Array.from(rootFolders)[0];
      } else {
        // Fallback al nome del file HTML senza estensione
        folderName = selectedFile.name.split('.')[0];
      }
    } else {
      // Fallback al nome del file HTML senza estensione
      folderName = selectedFile.name.split('.')[0];
    }
    
    formData.append('folderName', folderName);
    
    // Aggiungi il file principale come primo file
    formData.append('files', selectedFile);
    
    // Elenco dei file da console per debug
    console.log(`Caricamento cartella '${folderName}' con ${selectedFolderFiles.length} file aggiuntivi`);
    
    // Raccolta dei percorsi relativi dai file (per file selezionati da cartella con webkitdirectory)
    const fileStructure: Record<string, string> = {};
    
    console.log("Preparazione caricamento cartella:", folderName);
    
    // Aggiungi tutti i file aggiuntivi e costruisci la struttura
    files.forEach(file => {
      formData.append('files', file);
      
      // Mantieni traccia della struttura delle cartelle (per webkitdirectory)
      // @ts-ignore - webkitRelativePath è una proprietà specifica per gli input di tipo 'directory'
      let relativePath = file.webkitRelativePath || '';
      
      // Per il file principale, crea un percorso relativo se non esiste
      if (file === selectedFile && !relativePath) {
        relativePath = `${folderName}/${file.name}`;
      }
      
      // Per i file selezionati individualmente o in multi-selezione
      if (!relativePath && !isDirectoryUpload) {
        relativePath = `${folderName}/${file.name}`;
      }
      
      console.log(`File ${file.name}: percorso relativo = ${relativePath}`);
      
      // Salva SEMPRE il percorso relativo, anche per file senza sottocartelle
      fileStructure[file.name] = relativePath;
    });
    
    // Se abbiamo informazioni sulla struttura delle cartelle, le passiamo al server
    if (Object.keys(fileStructure).length > 0) {
      formData.append('fileStructure', JSON.stringify(fileStructure));
      console.log("Struttura cartelle inviata:", fileStructure);
    }
    
    formData.append('userId', '1'); // Default all'admin
    
    // Invia al server
    uploadFolderMutation.mutate(formData);
  };
  
  // Renderizza il contenuto del file selezionato
  const renderFilePreview = () => {
    if (selectedFile) {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-sm font-medium">{selectedFile.name}</div>
          <div className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(2)} KB • Fare clic per modificare
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-sm font-medium">Fare clic per selezionare o trascinare un file</div>
          <div className="text-xs text-muted-foreground">
            {uploadType === "image" ? "Immagini (.jpg, .png, .gif, .svg)" :
             uploadType === "video" ? "Video (.mp4, .webm)" :
             uploadType === "3d-model" ? "Modelli 3D (.glb, .gltf, .obj, .stl, .html, .zip, .jt)" :
             "Documenti PDF (.pdf)"}
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <div className="border border-neutral-light rounded-md overflow-hidden mb-6">
        <div className="bg-neutral-lightest px-3 py-2 border-b border-neutral-light">
          <span className="text-sm font-medium text-neutral-dark">Moduli</span>
        </div>
        <div className="p-2 flex flex-wrap gap-1">
          {moduleTypes.map(module => (
            <button 
              key={module.id}
              className="bg-white hover:bg-neutral-lightest border border-neutral-light rounded p-1.5 flex items-center text-sm"
              draggable
              onDragStart={(e) => handleDragStart(e, module.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleAddModule(module.id)}
            >
              <span className="material-icons text-sm mr-1">{module.icon}</span>
              {module.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* File Upload Dialog */}
      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Carica {uploadType === "image" ? "immagine" : 
                       uploadType === "video" ? "video" : 
                       uploadType === "3d-model" ? "modello 3D" : 
                       "PDF"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* File uploader */}
            <div 
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
              onClick={triggerFileInput}
            >
              <input
                type="file"
                id="file-upload"
                ref={fileInputRef}
                className="hidden"
                accept={getAcceptedFileTypes()}
                onChange={handleFileChange}
              />
              {renderFilePreview()}
            </div>
            
            {/* Descrizione/caption */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                {uploadType === "image" ? "Didascalia immagine" : 
                 uploadType === "video" ? "Descrizione video" : 
                 uploadType === "3d-model" ? "Titolo modello 3D" :
                 "Titolo documento"}
              </Label>
              <Input
                id="description"
                placeholder={uploadType === "image" ? "Inserisci una didascalia per l'immagine" : 
                             uploadType === "video" ? "Inserisci una descrizione per il video" : 
                             uploadType === "3d-model" ? "Inserisci un titolo per il modello 3D" :
                             "Inserisci un titolo per il documento"}
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
              />
            </div>
            
            {/* Sezione speciale per i file HTML WebGL o ZIP - consente di caricare file aggiuntivi */}
            {uploadType === "3d-model" && selectedFile && (
              selectedFile.name.toLowerCase().endsWith('.html') || 
              selectedFile.name.toLowerCase().endsWith('.htm') || 
              selectedFile.name.toLowerCase().endsWith('.zip')
            ) && (
              <div className="mt-4 space-y-4 border border-blue-200 bg-blue-50 p-4 rounded-md">
                <div className="font-medium text-blue-600 flex items-center">
                  <span className="material-icons text-sm mr-1">info</span>
                  {selectedFile?.name.toLowerCase().endsWith('.zip') ? 
                    'File ZIP (WebGL) rilevato' : 
                    'File HTML WebGL rilevato'}
                </div>
                
                <div className="text-sm text-gray-700">
                  {selectedFile?.name.toLowerCase().endsWith('.zip') ? 
                    'I file ZIP contengono già tutti i file necessari e verranno estratti automaticamente sul server.' :
                    'Questo modello WebGL potrebbe richiedere file aggiuntivi. È possibile caricare tutti i file necessari insieme.'}
                </div>
                
                {selectedFile?.name.toLowerCase().endsWith('.zip') && (
                  <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded-md text-sm text-green-700">
                    <strong>Consiglio:</strong> Il file ZIP verrà estratto automaticamente e tutti i file al suo interno saranno disponibili per il modello WebGL.
                  </div>
                )}
                
                {!selectedFile?.name.toLowerCase().endsWith('.zip') && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="folder-files" className="font-medium">File aggiuntivi (js, css, texture, ecc.)</Label>
                      <div className="space-y-2">
                        <Input
                          id="folder-files"
                          type="file"
                          multiple
                          ref={folderFilesInputRef}
                          onChange={handleFolderFilesChange}
                        />
                        <p className="text-xs text-gray-500">
                          Seleziona tutti i file di supporto necessari per il modello WebGL
                        </p>
                      </div>
                      
                      {/* Input per selezionare una cartella intera */}
                      <div className="mt-3 border-t pt-3 border-blue-200">
                        <Label htmlFor="directory-input" className="font-medium">OPPURE seleziona una cartella intera</Label>
                        <div className="relative mt-1">
                          <Input
                            id="directory-input"
                            type="file"
                            // @ts-ignore
                            webkitdirectory="true"
                            directory="true"
                            onChange={handleFolderFilesChange}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Seleziona la cartella contenente tutti i file del modello WebGL
                        </p>
                      </div>
                      
                      {selectedFolderFiles && selectedFolderFiles.length > 0 && (
                        <div className="text-sm text-blue-600 mt-2 flex items-center">
                          <span className="material-icons text-sm mr-1">check_circle</span>
                          {selectedFolderFiles.length} file aggiuntivi selezionati
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      type="button"
                      variant="secondary" 
                      className="w-full"
                      onClick={uploadFolder}
                      disabled={!selectedFolderFiles || selectedFolderFiles.length === 0 || uploadingFile}
                    >
                      {uploadingFile ? 'Caricamento in corso...' : 'Carica modello con i file aggiuntivi'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFileUpload(false);
                setSelectedFile(null);
                setFileDescription('');
              }}
              disabled={uploadingFile}
            >
              Annulla
            </Button>
            <Button 
              onClick={uploadFile}
              disabled={!selectedFile || uploadingFile}
            >
              {uploadingFile ? 'Caricamento in corso...' : 'Carica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
