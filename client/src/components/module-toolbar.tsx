import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, apiUploadRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Upload } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface ModuleToolbarProps {
  sectionId: number;
  onModuleAdded: (module: any) => void;
  disabled?: boolean;
}

export default function ModuleToolbar({ sectionId, onModuleAdded, disabled = false }: ModuleToolbarProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  // Ottieni il ruolo dell'utente corrente dal contesto
  const { currentUserRole } = useUser();
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
    { id: "testp", icon: "description", label: "Test File" },
    { id: "image", icon: "image", label: "Immagine" },
    { id: "video", icon: "smart_display", label: "Video" },
    { id: "table", icon: "table_chart", label: "Tabella" },
    { id: "checklist", icon: "checklist", label: "Checklist" },
    { id: "warning", icon: "warning", label: "Avviso" },
    { id: "danger", icon: "error", label: "PERICOLO" },
    { id: "warning-alert", icon: "warning_amber", label: "AVVERTENZA" },
    { id: "caution", icon: "report_problem", label: "ATTENZIONE" },
    { id: "note", icon: "info", label: "NOTA" },
    { id: "safety-instructions", icon: "shield", label: "Istruzioni di sicurezza" },
    { id: "link", icon: "link", label: "Link" },
    { id: "pdf", icon: "picture_as_pdf", label: "PDF" },
    { id: "component", icon: "category", label: "Componente" },
    { id: "3d-model", icon: "view_in_ar", label: "Modello 3D" },
    { id: "bom", icon: "inventory_2", label: "Elenco Componenti" }
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

  // Funzione helper per calcolare l'ordine corretto
  const getModuleOrderAtEnd = async () => {
    try {
      const res = await apiRequest('GET', `/api/sections/${sectionId}/modules`);
      const modules = await res.json();
      
      let newOrder = 0;
      if (modules && modules.length > 0) {
        // Se ci sono moduli esistenti, posiziona questo modulo dopo l'ultimo
        const lastModule = [...modules].sort((a, b) => a.order - b.order).pop();
        newOrder = lastModule ? lastModule.order + 1 : 0;
      }
      return newOrder;
    } catch (error) {
      console.error("Errore nel calcolo dell'ordine:", error);
      return 999; // Fallback in caso di errore
    }
  };

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiUploadRequest('POST', '/api/upload', formData);
      return await res.json();
    },
    onSuccess: async (data) => {
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
          // Determina il formato del video dal nome del file 
          let videoFormat = "mp4";
          if (selectedFile) {
            const fileName = selectedFile.name.toLowerCase();
            if (fileName.endsWith('.webm')) videoFormat = "webm";
            else if (fileName.endsWith('.mov')) videoFormat = "mov";
            else if (fileName.endsWith('.avi')) videoFormat = "avi";
            else if (fileName.endsWith('.mkv')) videoFormat = "mkv";
          }
          
          moduleContent = { 
            src: data.url, 
            title: fileDescription || data.originalName,
            caption: fileDescription,
            format: videoFormat,
            controls: true,
            autoplay: false,
            loop: false,
            muted: false
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
      
      // Calcola l'ordine per aggiungere alla fine
      const newOrder = await getModuleOrderAtEnd();
      
      // Crea il modulo con l'ordine calcolato
      createModuleMutation.mutate({
        sectionId,
        type: uploadType,
        content: moduleContent,
        order: newOrder // Aggiungi alla fine della sezione
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
    onSuccess: async (data) => {
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
      
      // Calcola l'ordine per aggiungere alla fine
      const newOrder = await getModuleOrderAtEnd();
      
      createModuleMutation.mutate({
        sectionId,
        type: uploadType,
        content: moduleContent,
        order: newOrder // Aggiungi alla fine della sezione
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

  const handleAddModule = async (type: string) => {
    // Se è disabilitato o l'utente non ha permesso di modifica, non fare nulla
    if (disabled || (currentUserRole !== 'admin' && currentUserRole !== 'editor')) {
      toast({
        title: "Permesso negato",
        description: "Non hai i permessi necessari per aggiungere moduli",
        variant: "destructive"
      });
      return;
    }
    
    // Per i tipi che supportano l'upload, mostra il dialog di upload
    if (type === "image" || type === "video" || type === "pdf" || type === "3d-model") {
      setUploadType(type as "image" | "video" | "pdf" | "3d-model");
      setShowFileUpload(true);
      
      // Per i modelli 3D, mostra sempre l'opzione per caricare la cartella
      if (type === "3d-model") {
        setShowFolderUpload(true);
      }
      
      return;
    }
    
    let defaultContent = {};
    
    // Set default content based on module type
    switch (type) {
      case "text":
        defaultContent = { text: "" };
        break;
      case "testp":
        defaultContent = { 
          title: "File di testo", 
          description: "Descrizione del file", 
          textContent: "",
          savedTextContent: "",
          textFileUrl: ""
        };
        break;
      case "image":
        defaultContent = { src: "", alt: "", caption: "" };
        break;
      case "video":
        defaultContent = { 
          src: "", 
          title: "",
          caption: "",
          poster: "",
          format: "mp4",
          controls: true,
          autoplay: false,
          loop: false,
          muted: false
        };
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
      case "danger":
        defaultContent = { title: "PERICOLO", description: "" };
        break;
      case "warning-alert":
        defaultContent = { title: "AVVERTENZA", description: "" };
        break;
      case "caution":
        defaultContent = { title: "ATTENZIONE", description: "" };
        break;
      case "note":
        defaultContent = { title: "NOTA", description: "" };
        break;
      case "safety-instructions":
        defaultContent = { title: "Istruzioni di sicurezza", description: "" };
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
      case "bom":
        defaultContent = { bomId: null, filter: "" };
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
    
    // Calcola l'ordine per aggiungere alla fine
    const newOrder = await getModuleOrderAtEnd();
    
    createModuleMutation.mutate({
      sectionId,
      type,
      content: defaultContent,
      order: newOrder // Aggiungi alla fine della sezione
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
    
    // Verifica se è un file HTML/HTM e siamo in modalità caricamento 3D
    const isHtmlFile = selectedFile.name.toLowerCase().endsWith('.html') || selectedFile.name.toLowerCase().endsWith('.htm');
    if (isHtmlFile && uploadType === "3d-model" && (!selectedFolderFiles || selectedFolderFiles.length === 0)) {
      toast({
        title: "Attenzione: File HTML senza cartella di supporto",
        description: "Per un corretto funzionamento del modello 3D HTML, è necessario caricare anche i file associati. Seleziona la cartella contenente tutti i file.",
        duration: 8000
      });
      // Non blocchiamo il caricamento, ma evidenziamo la necessità di caricare la cartella
      setShowFolderUpload(true);
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
      <div className={`border border-neutral-light rounded-md overflow-hidden mb-6 ${disabled ? 'opacity-70' : ''}`}>
        <div className="bg-neutral-lightest px-3 py-2 border-b border-neutral-light">
          <span className="text-sm font-medium text-neutral-dark flex items-center justify-between">
            Moduli
            {disabled && (
              <span className="text-xs text-neutral-medium italic">Non hai permessi per aggiungere moduli</span>
            )}
          </span>
        </div>
        <div className="p-2 flex flex-wrap gap-1">
          {moduleTypes.map(module => (
            <button 
              key={module.id}
              className={`border rounded p-1.5 flex items-center text-sm ${
                disabled 
                  ? 'bg-neutral-lightest border-neutral-light text-neutral-medium cursor-not-allowed' 
                  : 'bg-white hover:bg-neutral-lightest border-neutral-light'
              }`}
              draggable={!disabled}
              onDragStart={!disabled ? (e) => handleDragStart(e, module.id) : undefined}
              onDragEnd={!disabled ? handleDragEnd : undefined}
              onClick={!disabled ? () => handleAddModule(module.id) : undefined}
              disabled={disabled}
              title={disabled ? "Non hai permessi per aggiungere moduli" : ""}
            >
              <span className="material-icons text-sm mr-1">{module.icon}</span>
              {module.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Dialog per upload file */}
      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadType === "image" ? "Carica immagine" :
               uploadType === "video" ? "Carica video" :
               uploadType === "pdf" ? "Carica PDF" :
               "Carica modello 3D"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={triggerFileInput}
            >
              {renderFilePreview()}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={getAcceptedFileTypes()}
                onChange={handleFileChange}
              />
            </div>
            
            {uploadType === "3d-model" && selectedFile && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="folder-files">File aggiuntivi (cartella)</Label>
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={() => setShowFolderUpload(!showFolderUpload)}
                  >
                    {showFolderUpload ? "Nascondi" : "Mostra"} opzioni avanzate
                  </button>
                </div>
                
                {showFolderUpload && (
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-medium mb-1">
                      Per modelli 3D HTML che richiedono file aggiuntivi, seleziona anche i file della cartella.
                    </div>
                    <input
                      ref={folderFilesInputRef}
                      type="file"
                      className="w-full text-xs"
                      multiple
                      // @ts-ignore - webkitdirectory è una proprietà non standard
                      webkitdirectory=""
                      directory=""
                      onChange={handleFolderFilesChange}
                    />
                    <div className="text-xs text-neutral-medium">
                      {selectedFolderFiles ? `${selectedFolderFiles.length} file selezionati` : 'Seleziona una cartella'}
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={uploadFolder}
                      disabled={uploadingFile || !selectedFolderFiles}
                    >
                      {uploadingFile ? "Caricamento in corso..." : "Carica cartella"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione (opzionale)</Label>
              <Input
                id="description"
                placeholder="Descrizione del file..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setShowFileUpload(false)}>
              Annulla
            </Button>
            <Button 
              type="button" 
              onClick={uploadFile}
              disabled={uploadingFile || !selectedFile}
            >
              {uploadingFile ? "Caricamento in corso..." : "Carica file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}