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
import ThreeModelViewer from "./three-model-viewer";
import ThreeModelEditor from "./three-model-editor";
import VideoPlayer from "./video-player";

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
      case "3d-model": return "view_in_ar";
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
      case "3d-model": return "Modello 3D";
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
      
      case "3d-model":
        return (
          <div className="flex flex-col items-center">
            <ThreeModelViewer 
              modelData={content} 
              width="100%" 
              height="400px" 
            />
            {content.title && <div className="mt-2 text-sm text-neutral-dark">{content.title}</div>}
          </div>
        );

      case "video":
        return (
          <div className="flex flex-col items-center">
            <VideoPlayer 
              src={content.src}
              title={content.title}
              caption={content.caption}
              poster={content.poster}
              format={content.format}
              width="100%" 
              height="400px"
              autoplay={content.autoplay}
              controls={content.controls !== false}
              loop={content.loop}
              muted={content.muted}
              className="rounded-md overflow-hidden"
            />
          </div>
        );
        
      case "table":
        return (
          <div className="flex flex-col items-center">
            <div className="w-full overflow-x-auto">
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="bg-neutral-lightest">
                    {content.headers && content.headers.map((header: string, index: number) => (
                      <TableHead key={index} className="text-neutral-dark font-medium p-2 border border-neutral-light text-left">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.rows && content.rows.map((row: string[], rowIndex: number) => (
                    <TableRow key={rowIndex} className="hover:bg-neutral-lightest">
                      {row.map((cell: string, cellIndex: number) => (
                        <TableCell key={cellIndex} className="p-2 border border-neutral-light">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
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
              sectionId={module.sectionId}
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
      
      case "3d-model":
        return (
          <div className="space-y-4">
            <ThreeModelEditor
              initialValue={content}
              onSave={(updatedContent) => setContent(updatedContent)}
            />
          </div>
        );
        
      case "video":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-src">URL del video</Label>
              <Input 
                id="video-src" 
                value={content.src || ""} 
                onChange={(e) => setContent({ ...content, src: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="video-title">Titolo</Label>
              <Input 
                id="video-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="video-caption">Didascalia</Label>
              <Input 
                id="video-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="video-poster">URL immagine anteprima (poster)</Label>
              <Input 
                id="video-poster" 
                value={content.poster || ""} 
                onChange={(e) => setContent({ ...content, poster: e.target.value })} 
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-controls" 
                  checked={content.controls !== false}
                  onCheckedChange={(checked) => setContent({ ...content, controls: checked === true })}
                />
                <Label htmlFor="video-controls">Controlli visibili</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-autoplay" 
                  checked={content.autoplay === true}
                  onCheckedChange={(checked) => setContent({ ...content, autoplay: checked === true })}
                />
                <Label htmlFor="video-autoplay">Autoplay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-loop" 
                  checked={content.loop === true}
                  onCheckedChange={(checked) => setContent({ ...content, loop: checked === true })}
                />
                <Label htmlFor="video-loop">Loop</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-muted" 
                  checked={content.muted === true}
                  onCheckedChange={(checked) => setContent({ ...content, muted: checked === true })}
                />
                <Label htmlFor="video-muted">Muto</Label>
              </div>
            </div>
          </div>
        );
        
      case "table":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-caption">Didascalia della tabella</Label>
              <Input
                id="table-caption"
                value={content.caption || ""}
                onChange={(e) => setContent({ ...content, caption: e.target.value })}
              />
            </div>
            
            {/* Headers editor */}
            <div>
              <Label>Intestazioni delle colonne</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {content.headers && content.headers.map((header: string, index: number) => (
                  <div key={index} className="flex items-center">
                    <Input
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...content.headers];
                        newHeaders[index] = e.target.value;
                        setContent({ ...content, headers: newHeaders });
                      }}
                      className="min-w-[150px]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Rimuovi l'intestazione e la colonna corrispondente da tutte le righe
                        const newHeaders = content.headers.filter((_: string, i: number) => i !== index);
                        const newRows = content.rows.map((row: string[]) => row.filter((_: string, i: number) => i !== index));
                        setContent({ ...content, headers: newHeaders, rows: newRows });
                      }}
                    >
                      <span className="material-icons text-sm">close</span>
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newHeaders = [...(content.headers || []), ""];
                    // Aggiungi una cella vuota a ogni riga, assicurandosi che esistano righe
                    const newRows = Array.isArray(content.rows) && content.rows.length > 0 
                      ? content.rows.map((row: string[]) => [...row, ""]) 
                      : [Array(newHeaders.length).fill("")];
                    setContent({ ...content, headers: newHeaders, rows: newRows });
                  }}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Aggiungi colonna
                </Button>
              </div>
            </div>
            
            {/* Rows editor */}
            <div>
              <Label>Righe e celle</Label>
              <div className="space-y-2 mt-2 border border-neutral-light rounded-md p-2">
                {content.rows && content.rows.map((row: string[], rowIndex: number) => (
                  <div key={rowIndex} className="flex flex-wrap items-start gap-2 py-2 border-b border-neutral-light">
                    {row.map((cell: string, cellIndex: number) => (
                      <div key={cellIndex} className="flex-1 min-w-[150px]">
                        <Input
                          value={cell}
                          onChange={(e) => {
                            const newRows = [...content.rows];
                            newRows[rowIndex][cellIndex] = e.target.value;
                            setContent({ ...content, rows: newRows });
                          }}
                        />
                        {cellIndex === 0 && (
                          <div className="mt-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newRows = content.rows.filter((_: string[], i: number) => i !== rowIndex);
                                setContent({ ...content, rows: newRows });
                              }}
                            >
                              <span className="material-icons text-xs">delete_row</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Crea una nuova riga con celle vuote in base al numero di colonne
                    const newRow = Array(content.headers.length).fill("");
                    const newRows = [...(content.rows || []), newRow];
                    setContent({ ...content, rows: newRows });
                  }}
                >
                  <span className="material-icons text-sm mr-1">add</span>
                  Aggiungi riga
                </Button>
              </div>
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

  if (!components || !Array.isArray(components) || components.length === 0) {
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
