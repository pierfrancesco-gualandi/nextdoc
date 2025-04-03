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
  const [uploadType, setUploadType] = useState<"image" | "video" | "pdf">("image");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const moduleTypes = [
    { id: "text", icon: "text_fields", label: "Testo" },
    { id: "image", icon: "image", label: "Immagine" },
    { id: "video", icon: "smart_display", label: "Video" },
    { id: "table", icon: "table_chart", label: "Tabella" },
    { id: "checklist", icon: "checklist", label: "Checklist" },
    { id: "warning", icon: "warning", label: "Avviso" },
    { id: "link", icon: "link", label: "Link" },
    { id: "pdf", icon: "picture_as_pdf", label: "PDF" },
    { id: "component", icon: "category", label: "Componente" }
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
      }
      
      createModuleMutation.mutate({
        sectionId,
        type: uploadType,
        content: moduleContent,
        order: 999 // Will be reordered after creation
      });
      
      // Reset state
      setSelectedFile(null);
      setFileDescription('');
      setShowFileUpload(false);
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

  const handleAddModule = (type: string) => {
    // Per i tipi che supportano l'upload, mostra il dialog di upload
    if (type === "image" || type === "video" || type === "pdf") {
      setUploadType(type as "image" | "video" | "pdf");
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
      default:
        return "*/*";
    }
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
                       uploadType === "video" ? "video" : "PDF"}
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
                 uploadType === "video" ? "Descrizione video" : "Titolo documento"}
              </Label>
              <Input
                id="description"
                placeholder={uploadType === "image" ? "Inserisci una didascalia per l'immagine" : 
                             uploadType === "video" ? "Inserisci una descrizione per il video" : 
                             "Inserisci un titolo per il documento"}
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
              />
            </div>
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
