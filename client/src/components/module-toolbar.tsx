import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ModuleToolbarProps {
  sectionId: number;
  onModuleAdded: (module: any) => void;
}

export default function ModuleToolbar({ sectionId, onModuleAdded }: ModuleToolbarProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  
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

  const handleAddModule = (type: string) => {
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

  return (
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
  );
}
