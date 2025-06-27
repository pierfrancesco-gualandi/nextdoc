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
  const { currentUserRole } = useUser();
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadType, setUploadType] = useState<"image" | "video" | "pdf" | "3d-model">("image");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const moduleTypes = [
    { id: "text", icon: "text_fields", label: "Testo" },
    { id: "testp", icon: "description", label: "Test File" },
    { id: "image", icon: "image", label: "Immagine" },
    { id: "video", icon: "smart_display", label: "Video" },
    { id: "table", icon: "table_chart", label: "Tabella" },
    { id: "checklist", icon: "checklist", label: "Checklist" },
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

  const getModuleOrderAtEnd = async () => {
    try {
      const res = await apiRequest('GET', `/api/sections/${sectionId}/modules`);
      const modules = await res.json();
      
      let newOrder = 0;
      if (modules && modules.length > 0) {
        const lastModule = [...modules].sort((a, b) => a.order - b.order).pop();
        newOrder = lastModule ? lastModule.order + 1 : 0;
      }
      return newOrder;
    } catch (error) {
      console.error("Errore nel calcolo dell'ordine:", error);
      return 999;
    }
  };

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiUploadRequest('POST', '/api/upload', formData);
      return await res.json();
    },
    onSuccess: async (data) => {
      let moduleContent = {};
      
      if (uploadType === "image") {
        moduleContent = {
          src: `/uploads/${data.filename}`,
          caption: fileDescription || data.originalName,
          alt: fileDescription || `Immagine: ${data.originalName}`
        };
      } else if (uploadType === "video") {
        moduleContent = {
          src: `/uploads/${data.filename}`,
          caption: fileDescription || data.originalName,
          controls: true,
          autoplay: false
        };
      } else if (uploadType === "pdf") {
        moduleContent = {
          src: `/uploads/${data.filename}`,
          title: fileDescription || data.originalName,
          originalName: data.originalName
        };
      } else if (uploadType === "3d-model") {
        // Per i modelli 3D, i file ZIP vengono estratti e contengono modelli WebGL HTML
        // quindi impostiamo sempre il formato su 'html' per mostrare il pulsante di navigazione
        moduleContent = {
          src: `/uploads/${data.filename}`,
          title: fileDescription || data.originalName,
          format: 'html', // Tutti i modelli 3D caricati sono HTML WebGL
          controls: {
            pan: true,
            zoom: true,
            rotate: true
          }
        };
      }

      const newOrder = await getModuleOrderAtEnd();
      
      await createModuleMutation.mutateAsync({
        sectionId,
        type: uploadType,
        content: moduleContent,
        order: newOrder
      });
      
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

  const getAcceptedFileTypes = () => {
    switch (uploadType) {
      case "image":
        return ".jpg,.jpeg,.png,.gif,.svg,.webp";
      case "video":
        return ".mp4,.webm,.mov,.avi";
      case "pdf":
        return ".pdf";
      case "3d-model":
        return ".zip";
      default:
        return "*";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = () => {
    if (!selectedFile) {
      toast({
        title: "Errore",
        description: "Seleziona un file prima di procedere con il caricamento.",
        variant: "destructive"
      });
      return;
    }
    
    setUploadingFile(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', '1');
    
    uploadFileMutation.mutate(formData);
  };

  const renderFilePreview = () => {
    if (selectedFile) {
      return (
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">{selectedFile.name}</div>
            <div className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(2)} KB • Fare clic per modificare
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">Fare clic per selezionare o trascinare un file</div>
          <div className="text-xs text-muted-foreground">
            {uploadType === "image" ? "Immagini (.jpg, .png, .gif, .svg)" :
             uploadType === "video" ? "Video (.mp4, .webm)" :
             uploadType === "3d-model" ? "Modelli 3D (solo .zip)" :
             "Documenti PDF (.pdf)"}
          </div>
        </div>
      );
    }
  };

  const handleModuleClick = async (moduleType: string) => {
    if (disabled) return;
    
    if (["image", "video", "pdf", "3d-model"].includes(moduleType)) {
      setUploadType(moduleType as "image" | "video" | "pdf" | "3d-model");
      setShowFileUpload(true);
      return;
    }

    try {
      const newOrder = await getModuleOrderAtEnd();
      
      let content = {};
      
      switch (moduleType) {
        case "text":
          content = { 
            text: "<p>Inserisci il tuo testo qui...</p>",
            formatting: { bold: false, italic: false, underline: false }
          };
          break;
        case "table":
          content = {
            headers: ["Colonna 1", "Colonna 2"],
            rows: [["Riga 1, Cella 1", "Riga 1, Cella 2"]]
          };
          break;
        case "checklist":
          content = {
            title: "Lista di controllo",
            items: [
              { text: "Elemento 1", checked: false },
              { text: "Elemento 2", checked: false }
            ]
          };
          break;
        case "danger":
        case "warning-alert":
        case "caution":
        case "note":
          const titles = {
            "danger": "PERICOLO",
            "warning-alert": "AVVERTENZA",
            "caution": "ATTENZIONE",
            "note": "NOTA"
          };
          content = {
            title: titles[moduleType as keyof typeof titles],
            message: "Inserisci qui il messaggio..."
          };
          break;
        case "safety-instructions":
          content = {
            title: "Istruzioni di sicurezza",
            instructions: ["Istruzione 1", "Istruzione 2"]
          };
          break;
        case "link":
          content = {
            url: "https://esempio.com",
            text: "Link di esempio",
            description: "Descrizione del link"
          };
          break;
        case "component":
          content = {
            componentId: null,
            description: "Seleziona un componente"
          };
          break;
        case "bom":
          content = {
            bomId: null,
            title: "Elenco Componenti",
            showQuantities: true
          };
          break;
        default:
          content = { text: "Contenuto modulo" };
      }

      createModuleMutation.mutate({
        sectionId,
        type: moduleType,
        content,
        order: newOrder
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: `Errore durante la creazione del modulo: ${error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 p-4 bg-muted/50 rounded-lg">
        {moduleTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleModuleClick(type.id)}
            disabled={disabled}
            className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={type.label}
          >
            <span className="material-icons text-xl">{type.icon}</span>
            <span className="text-xs font-medium">{type.label}</span>
          </button>
        ))}
      </div>

      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent>
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