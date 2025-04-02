import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";

interface ContentModuleProps {
  module: any;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
  documentId: string;
}

export default function ContentModule({ 
  module, 
  onDelete, 
  onUpdate,
  documentId
}: ContentModuleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(module.content);
  
  const updateModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', `/api/modules/${module.id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      onUpdate(module.id, data);
      setIsEditing(false);
      toast({
        title: "Successo",
        description: "Modulo aggiornato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  const saveChanges = () => {
    updateModuleMutation.mutate({
      content
    });
  };
  
  const handleDeleteModule = () => {
    onDelete(module.id);
  };
  
  // Helper to get icon for module type
  const getModuleIcon = (type: string) => {
    switch (type) {
      case "text": return "text_fields";
      case "image": return "image";
      case "video": return "smart_display";
      case "table": return "table_chart";
      case "checklist": return "checklist";
      case "warning": return "warning";
      case "link": return "link";
      case "pdf": return "picture_as_pdf";
      case "component": return "category";
      default: return "edit_note";
    }
  };
  
  // Helper to get label for module type
  const getModuleLabel = (type: string) => {
    switch (type) {
      case "text": return "Testo";
      case "image": return "Immagine";
      case "video": return "Video";
      case "table": return "Tabella";
      case "checklist": return "Checklist";
      case "warning": return "Avviso";
      case "link": return "Link";
      case "pdf": return "PDF";
      case "component": return "Componenti";
      default: return type;
    }
  };
  
  const renderModuleContent = () => {
    if (isEditing) {
      return renderModuleEditor();
    }
    
    switch (module.type) {
      case "text":
        return <div dangerouslySetInnerHTML={{ __html: content.text }} />;
        
      case "image":
        return (
          <div className="flex flex-col items-center">
            <img src={content.src} alt={content.alt} className="max-w-full h-auto rounded-md max-h-80" />
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "warning":
        return (
          <div className="p-4 bg-warning bg-opacity-5 border-l-4 border-warning">
            <div className="flex">
              <span className="material-icons text-warning mr-2">warning</span>
              <div>
                <p className="text-neutral-darkest font-medium mb-1">{content.title}</p>
                <p className="text-neutral-dark">{content.message}</p>
              </div>
            </div>
          </div>
        );
        
      case "component":
        return <ComponentListContent documentId={documentId} />;
        
      case "checklist":
        return (
          <div>
            {content.items && content.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center mb-2">
                <Checkbox id={`item-${index}`} checked={item.checked} disabled />
                <label htmlFor={`item-${index}`} className="ml-2">{item.text}</label>
              </div>
            ))}
          </div>
        );
        
      case "link":
        return (
          <div>
            <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {content.text || content.url}
            </a>
            {content.description && <p className="text-sm text-neutral-dark mt-1">{content.description}</p>}
          </div>
        );
        
      case "pdf":
        return (
          <div className="flex flex-col items-center">
            <iframe src={content.src} title={content.title} className="w-full h-96 border border-neutral-light rounded"></iframe>
            {content.title && <div className="mt-2 text-sm text-neutral-dark">{content.title}</div>}
          </div>
        );
        
      default:
        return <div>Tipo di modulo non supportato: {module.type}</div>;
    }
  };
  
  const renderModuleEditor = () => {
    switch (module.type) {
      case "text":
        return (
          <div className="mb-4">
            <TiptapEditor 
              content={content.text} 
              onChange={(text) => setContent({ ...content, text })} 
            />
          </div>
        );
        
      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-src">URL dell'immagine</Label>
              <Input 
                id="image-src" 
                value={content.src || ""} 
                onChange={(e) => setContent({ ...content, src: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Testo alternativo</Label>
              <Input 
                id="image-alt" 
                value={content.alt || ""} 
                onChange={(e) => setContent({ ...content, alt: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="image-caption">Didascalia</Label>
              <Input 
                id="image-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
              />
            </div>
          </div>
        );
        
      case "warning":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="warning-title">Titolo</Label>
              <Input 
                id="warning-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="warning-message">Messaggio</Label>
              <Textarea 
                id="warning-message" 
                value={content.message || ""} 
                onChange={(e) => setContent({ ...content, message: e.target.value })} 
                rows={3}
              />
            </div>
          </div>
        );
        
      case "checklist":
        return (
          <div className="space-y-4">
            {content.items && content.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox 
                  id={`edit-item-${index}`}
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    const newItems = [...content.items];
                    newItems[index].checked = checked === true;
                    setContent({ ...content, items: newItems });
                  }}
                />
                <Input 
                  value={item.text} 
                  onChange={(e) => {
                    const newItems = [...content.items];
                    newItems[index].text = e.target.value;
                    setContent({ ...content, items: newItems });
                  }} 
                  className="flex-1"
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const newItems = content.items.filter((_: any, i: number) => i !== index);
                    setContent({ ...content, items: newItems });
                  }}
                >
                  <span className="material-icons text-sm">delete</span>
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const newItems = [...(content.items || []), { text: "", checked: false }];
                setContent({ ...content, items: newItems });
              }}
            >
              <span className="material-icons text-sm mr-1">add</span>
              Aggiungi elemento
            </Button>
          </div>
        );
        
      case "link":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input 
                id="link-url" 
                value={content.url || ""} 
                onChange={(e) => setContent({ ...content, url: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="link-text">Testo</Label>
              <Input 
                id="link-text" 
                value={content.text || ""} 
                onChange={(e) => setContent({ ...content, text: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="link-description">Descrizione</Label>
              <Textarea 
                id="link-description" 
                value={content.description || ""} 
                onChange={(e) => setContent({ ...content, description: e.target.value })} 
                rows={2}
              />
            </div>
          </div>
        );
        
      case "pdf":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pdf-src">URL del PDF</Label>
              <Input 
                id="pdf-src" 
                value={content.src || ""} 
                onChange={(e) => setContent({ ...content, src: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="pdf-title">Titolo</Label>
              <Input 
                id="pdf-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
          </div>
        );
        
      default:
        return <div>Editor non disponibile per questo tipo di modulo</div>;
    }
  };

  return (
    <div className="border border-neutral-light rounded-md hover:shadow-sm transition mb-4">
      <div className="bg-neutral-lightest px-3 py-2 border-b border-neutral-light flex justify-between items-center">
        <div className="flex items-center">
          <span className="material-icons text-neutral-medium mr-1">{getModuleIcon(module.type)}</span>
          <span className="text-sm font-medium text-neutral-dark">{getModuleLabel(module.type)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-1 text-neutral-medium hover:text-neutral-dark rounded cursor-grab">
            <span className="material-icons text-sm">drag_indicator</span>
          </button>
          <button 
            className="p-1 text-neutral-medium hover:text-neutral-dark rounded"
            onClick={() => setIsEditing(!isEditing)}
          >
            <span className="material-icons text-sm">{isEditing ? 'visibility' : 'edit'}</span>
          </button>
          <button 
            className="p-1 text-neutral-medium hover:text-neutral-dark rounded"
            onClick={handleDeleteModule}
          >
            <span className="material-icons text-sm">delete</span>
          </button>
        </div>
      </div>
      <div className="p-4">
        {renderModuleContent()}
        
        {isEditing && (
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-2"
              onClick={() => setIsEditing(false)}
            >
              Annulla
            </Button>
            <Button size="sm" onClick={saveChanges}>
              Salva
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ComponentListContent({ documentId }: { documentId: string }) {
  const { data: components } = useQuery({
    queryKey: ['/api/components'],
    staleTime: 30000,
  });

  if (!components) {
    return <div>Caricamento componenti...</div>;
  }

  return (
    <table className="min-w-full border-collapse">
      <thead>
        <tr className="bg-neutral-lightest border-b border-neutral-light">
          <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Codice</th>
          <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Descrizione</th>
          <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Quantità</th>
          <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Azioni</th>
        </tr>
      </thead>
      <tbody>
        {components.slice(0, 5).map((component: any) => (
          <tr key={component.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
            <td className="py-2 px-3 text-sm">{component.code}</td>
            <td className="py-2 px-3 text-sm">{component.description}</td>
            <td className="py-2 px-3 text-sm">1</td>
            <td className="py-2 px-3 text-sm">
              <button className="text-primary hover:text-primary-dark">
                <span className="material-icons text-sm">info</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
