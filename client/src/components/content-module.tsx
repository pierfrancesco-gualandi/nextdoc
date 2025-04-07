import { useState, useRef, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ThreeModelViewer from "./three-model-viewer";
import ThreeModelEditor from "./three-model-editor";
import VideoPlayer from "./video-player";
import BomViewContent, { BomFilterSettings } from "./BomViewContent";

// Component to select a BOM
const BomSelector = ({ bomId, onChange }: { bomId: number, onChange: (bomId: number) => void }) => {
  const { data: boms = [] } = useQuery({
    queryKey: ['/api/boms'],
    staleTime: 30000,
  });

  if (!boms || !Array.isArray(boms) || boms.length === 0) {
    return <div className="text-neutral-medium">Nessun elenco componenti disponibile</div>;
  }

  return (
    <Select
      value={bomId ? bomId.toString() : ""}
      onValueChange={(value) => onChange(parseInt(value))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona un elenco componenti" />
      </SelectTrigger>
      <SelectContent>
        {boms.map((bom: any) => (
          <SelectItem key={bom.id} value={bom.id.toString()}>
            {bom.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ComponentListContent = ({ documentId }: { documentId: string }) => {
  // Implementazione da aggiungere
  return <div>Elenco componenti (da implementare)</div>;
};

interface ContentModuleProps {
  module: any;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
  documentId: string;
  isPreview?: boolean;
  selectedLanguage?: string;
  highlightMissingTranslations?: boolean;
}

// Funzione per estrarre la traduzione dai dati del modulo
const parseTranslation = (module: any, selectedLanguage?: string): any => {
  try {
    // Verifica se il modulo ha una traduzione
    if (module && module.translation && module.translation.content) {
      // Parse del JSON della traduzione
      let translationContent;
      
      if (typeof module.translation.content === 'string') {
        translationContent = JSON.parse(module.translation.content);
      } else {
        translationContent = module.translation.content;
      }
      
      console.log("Traduzione trovata per il modulo:", module.id, translationContent);
      
      return translationContent;
    }
    
    // Se è specificata una lingua, cerca tra le traduzioni disponibili per quella lingua
    if (selectedLanguage && module && module.translations) {
      // Trova la traduzione per la lingua selezionata
      const translation = module.translations.find((t: any) => 
        t.languageId === parseInt(selectedLanguage) || t.languageId === selectedLanguage
      );
      
      if (translation && translation.content) {
        let translationContent;
        if (typeof translation.content === 'string') {
          translationContent = JSON.parse(translation.content);
        } else {
          translationContent = translation.content;
        }
        
        console.log("Traduzione trovata per la lingua:", selectedLanguage, translationContent);
        return translationContent;
      }
    }
  } catch (error) {
    console.error("Errore nel parsing della traduzione:", error);
  }
  return undefined;
};

export default function ContentModule({ 
  module, 
  onDelete, 
  onUpdate,
  documentId,
  isPreview = false,
  selectedLanguage,
  highlightMissingTranslations = true
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
      id: module.id, 
      module: {
        content: JSON.stringify(content),  // Converti l'oggetto in stringa JSON
        type: module.type,
        sectionId: module.sectionId
      }
    });
  };
  
  const handleDeleteModule = () => {
    onDelete(module.id);
  };
  
  const getModuleIcon = (type: string): string => {
    switch (type) {
      case "text": return "text_fields";
      case "image": return "image";
      case "video": return "videocam";
      case "table": return "table_chart";
      case "warning": return "warning";
      case "checklist": return "checklist";
      case "component": return "hub";
      case "bom": return "account_tree";
      case "link": return "link";
      case "pdf": return "picture_as_pdf";
      case "3d-model": return "view_in_ar";
      default: return "article";
    }
  };
  
  const getModuleLabel = (type: string): string => {
    switch (type) {
      case "text": return "Testo";
      case "image": return "Immagine";
      case "video": return "Video";
      case "table": return "Tabella";
      case "warning": return "Avviso";
      case "checklist": return "Lista di controllo";
      case "component": return "Componente";
      case "bom": return "Elenco Componenti";
      case "link": return "Link";
      case "pdf": return "PDF";
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
        return (
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ __html: content?.text || "" }} 
          />
        );
        
      case "image":
        return (
          <div className="flex flex-col items-center my-2">
            {content?.src && (
              <img 
                src={content.src} 
                alt={content.alt || "Immagine"} 
                className="max-w-full h-auto object-contain border border-neutral-lightest rounded-md" 
              />
            )}
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "video":
        return (
          <div className="flex flex-col items-center my-2">
            <VideoPlayer 
              src={content.src}
              title={content.title}
              autoplay={content.autoplay}
              loop={content.loop}
              muted={content.muted}
              controls={content.controls !== false}
            />
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "table":
        if (!content.headers || !content.rows) {
          return <div className="text-neutral-medium italic">Tabella non configurata</div>;
        }
        
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-neutral-lightest">
                  {content.headers.map((header: string, index: number) => (
                    <th 
                      key={index} 
                      className="border border-neutral-light p-2 text-left font-medium text-neutral-dark"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.rows.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex} className="border-b border-neutral-light">
                    {row.map((cell: string, cellIndex: number) => (
                      <td 
                        key={cellIndex} 
                        className="border border-neutral-light p-2"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "warning":
        let bgColorClass = "bg-blue-50";
        let borderColorClass = "border-blue-200";
        let textColorClass = "text-blue-700";
        let iconName = "info";
        
        if (content.level === "warning") {
          bgColorClass = "bg-yellow-50";
          borderColorClass = "border-yellow-200";
          textColorClass = "text-yellow-700";
          iconName = "warning";
        } else if (content.level === "error") {
          bgColorClass = "bg-red-50";
          borderColorClass = "border-red-200";
          textColorClass = "text-red-700";
          iconName = "error";
        }
        
        return (
          <div className={`${bgColorClass} ${borderColorClass} border rounded-md p-4 my-2`}>
            <div className="flex items-start">
              <span className={`material-icons ${textColorClass} mr-2`}>{iconName}</span>
              <div>
                {content.title && <h4 className={`${textColorClass} font-medium mb-1`}>{content.title}</h4>}
                <p className={textColorClass}>{content.message}</p>
              </div>
            </div>
          </div>
        );
        
      case "checklist":
        if (!content.items || !Array.isArray(content.items)) {
          return <div className="text-neutral-medium italic">Lista di controllo non configurata</div>;
        }
        
        return (
          <div className="space-y-2 my-2">
            {content.items.map((item: any, index: number) => (
              <div key={index} className="flex items-start">
                <div className="mr-2 mt-0.5">
                  <Checkbox 
                    id={`checklist-item-${module.id}-${index}`} 
                    checked={item.checked} 
                    disabled={true}
                  />
                </div>
                <Label 
                  htmlFor={`checklist-item-${module.id}-${index}`}
                  className={`text-neutral-dark ${item.checked ? 'line-through text-neutral-medium' : ''}`}
                >
                  {item.text}
                </Label>
              </div>
            ))}
          </div>
        );
        
      case "component":
        return (
          <div className="my-2 border border-neutral-light rounded-md p-4 bg-neutral-lightest">
            <div className="flex items-center">
              <span className="material-icons text-primary mr-2">hub</span>
              <h4 className="text-lg font-medium">Componente: {content.componentName || "Non specificato"}</h4>
            </div>
            <div className="mt-2">
              <p className="text-neutral-medium">Quantità: {content.quantity || 1}</p>
              {content.notes && <p className="mt-1">{content.notes}</p>}
            </div>
          </div>
        );
        
      case "link":
        return (
          <div className="my-2 p-3 border border-neutral-light rounded-md">
            <a 
              href={content.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary flex items-center hover:underline"
            >
              <span className="material-icons mr-2">link</span>
              {content.text || content.url}
            </a>
            {content.description && (
              <p className="mt-1 text-neutral-medium text-sm">{content.description}</p>
            )}
          </div>
        );
        
      case "pdf":
        return (
          <div className="my-2">
            <div className="border border-neutral-light rounded-md p-3 bg-neutral-lightest">
              <div className="flex items-center">
                <span className="material-icons text-red-500 mr-2">picture_as_pdf</span>
                <span className="font-medium">{content.title || "Documento PDF"}</span>
              </div>
              <div className="mt-2">
                <a 
                  href={content.src} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center text-sm"
                >
                  <span className="material-icons text-sm mr-1">open_in_new</span>
                  Apri PDF
                </a>
              </div>
            </div>
          </div>
        );
        
      case "3d-model":
        return (
          <div className="my-2">
            <ThreeModelViewer
              modelData={{
                src: content.url || "",
                format: "gltf",
                title: content.title || "Modello 3D"
              }}
            />
          </div>
        );
        
      case "bom":
        // Mostra la descrizione traducibile se disponibile
        return (
          <div>
            {content.description && !isEditing && (
              <div className="mb-4 text-neutral-medium">
                {content.description}
              </div>
            )}
            <BomViewContent
              bomId={content.bomId}
              filter={content.filter}
              levelFilter={content.levelFilter}
              useFilters={isPreview ? false : content.useFilters}  // In anteprima, non mostrare i controlli di filtro
              filterSettings={content.filterSettings}
              translation={isPreview ? parseTranslation(module, selectedLanguage) : undefined}
              selectedLanguage={selectedLanguage}
              highlightMissingTranslations={isPreview && highlightMissingTranslations}
              onFilterUpdate={(filterSettings: BomFilterSettings) => {
                // Estrai codici componenti filtrati per consentire traduzioni mirate
                const filteredComponentCodes = filterSettings.filteredComponentCodes || [];
                
                // Aggiorna silenziosamente il contenuto del modulo con le impostazioni di filtro correnti
                if (!isEditing && JSON.stringify(filterSettings) !== JSON.stringify(content.filterSettings)) {
                  // Aggiungiamo l'elenco dei codici componenti al contenuto del modulo
                  const updatedContent = { 
                    ...content, 
                    filterSettings,
                    filteredComponentCodes // Aggiorna l'elenco dei componenti visibili
                  };
                  setContent(updatedContent); // Aggiorna lo stato locale
                  
                  try {
                    // Usa setTimeout per evitare il ciclo di render
                    setTimeout(() => {
                      // Assicurati che il modulo da salvare contenga tutti i campi necessari
                      updateModuleMutation.mutate({ 
                        id: module.id, 
                        module: {
                          content: JSON.stringify(updatedContent),  // Converti l'oggetto in stringa JSON
                          type: module.type,
                          sectionId: module.sectionId
                        }
                      });
                    }, 0);
                  } catch (error) {
                    console.error("Errore nell'aggiornamento dei filtri:", error);
                  }
                }
              }}
            />
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
              />
            </div>
            <div>
              <Label htmlFor="warning-level">Livello</Label>
              <Select
                value={content.level || "warning"}
                onValueChange={(value) => setContent({ ...content, level: value })}
              >
                <SelectTrigger id="warning-level">
                  <SelectValue placeholder="Seleziona livello" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informazione</SelectItem>
                  <SelectItem value="warning">Avviso</SelectItem>
                  <SelectItem value="error">Errore</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-autoplay"
                  checked={content.autoplay || false}
                  onCheckedChange={(checked) => setContent({ ...content, autoplay: !!checked })}
                />
                <Label htmlFor="video-autoplay">Autoplay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-loop"
                  checked={content.loop || false}
                  onCheckedChange={(checked) => setContent({ ...content, loop: !!checked })}
                />
                <Label htmlFor="video-loop">Loop</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-muted"
                  checked={content.muted || false}
                  onCheckedChange={(checked) => setContent({ ...content, muted: !!checked })}
                />
                <Label htmlFor="video-muted">Muto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-controls"
                  checked={content.controls !== false}
                  onCheckedChange={(checked) => setContent({ ...content, controls: !!checked })}
                />
                <Label htmlFor="video-controls">Controlli</Label>
              </div>
            </div>
          </div>
        );
      
      case "3d-model":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model-title">Titolo</Label>
              <Input 
                id="model-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            {/* Implementazione di base per l'editor 3D */}
            <div>
              <Label htmlFor="model-url">URL del modello</Label>
              <Input 
                id="model-url" 
                value={content.url || ""} 
                onChange={(e) => setContent({ ...content, url: e.target.value })} 
              />
            </div>
          </div>
        );
        
      case "table":
        return (
          // Implementazione: per ora non è supportata l'edizione delle tabelle in questa vista
          <div className="text-neutral-medium italic">
            L'editor della tabella non è ancora disponibile in questa vista.
          </div>
        );
        
      case "bom":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bom-id">Elenco Componenti</Label>
              <BomSelector
                bomId={content.bomId || 0}
                onChange={(bomId) => setContent({ ...content, bomId })}
              />
            </div>
            <div>
              <Label htmlFor="bom-description">Descrizione (traducibile)</Label>
              <Input
                id="bom-description"
                value={content.description || ""}
                onChange={(e) => setContent({ ...content, description: e.target.value })}
                placeholder="Inserisci una descrizione per questo elenco componenti"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="bom-use-filters"
                checked={content.useFilters || false}
                onCheckedChange={(checked) => {
                  const useFilters = !!checked;
                  // Se abilitiamo i filtri, inizializza anche le impostazioni
                  const filterSettings = useFilters && !content.filterSettings 
                    ? {
                        codeFilter: "",
                        codeFilterType: "contains",
                        descriptionFilter: "",
                        descriptionFilterType: "contains",
                        enableFiltering: false
                      } 
                    : content.filterSettings;
                  
                  setContent({ ...content, useFilters, filterSettings });
                }}
              />
              <Label htmlFor="bom-use-filters">Mostra filtri</Label>
            </div>
            
            {(content.useFilters || false) && (
              <div className="border border-neutral-light rounded-md p-4 mt-2">
                <h4 className="text-sm font-medium mb-2">Impostazioni dei filtri predefiniti</h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code-filter-type">Filtro Codice</Label>
                      <Select
                        value={(content.filterSettings?.codeFilterType || "contains")}
                        onValueChange={(value) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            codeFilterType: value as 'contains' | 'startsWith' | 'equals'
                          };
                          setContent({ ...content, filterSettings });
                        }}
                      >
                        <SelectTrigger id="code-filter-type">
                          <SelectValue placeholder="Tipo di filtro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contiene</SelectItem>
                          <SelectItem value="startsWith">Inizia con</SelectItem>
                          <SelectItem value="equals">Uguale a</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="code-filter-value">Valore</Label>
                      <Input
                        id="code-filter-value"
                        value={content.filterSettings?.codeFilter || ""}
                        onChange={(e) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            codeFilter: e.target.value
                          };
                          setContent({ ...content, filterSettings });
                        }}
                        placeholder="Codice da filtrare"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description-filter-type">Filtro Descrizione</Label>
                      <Select
                        value={(content.filterSettings?.descriptionFilterType || "contains")}
                        onValueChange={(value) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            descriptionFilterType: value as 'contains' | 'startsWith' | 'equals'
                          };
                          setContent({ ...content, filterSettings });
                        }}
                      >
                        <SelectTrigger id="description-filter-type">
                          <SelectValue placeholder="Tipo di filtro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contiene</SelectItem>
                          <SelectItem value="startsWith">Inizia con</SelectItem>
                          <SelectItem value="equals">Uguale a</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description-filter-value">Valore</Label>
                      <Input
                        id="description-filter-value"
                        value={content.filterSettings?.descriptionFilter || ""}
                        onChange={(e) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            descriptionFilter: e.target.value
                          };
                          setContent({ ...content, filterSettings });
                        }}
                        placeholder="Descrizione da filtrare"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="level-filter">Filtro Livello</Label>
                    <Input
                      id="level-filter"
                      type="number"
                      min="0"
                      max="10"
                      value={content.filterSettings?.levelFilter !== undefined ? content.filterSettings.levelFilter : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const filterSettings = {
                          ...(content.filterSettings || {}),
                          levelFilter: value ? parseInt(value) : undefined
                        };
                        setContent({ ...content, filterSettings });
                      }}
                      placeholder="Livello (0-10)"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-enabled"
                      checked={content.filterSettings?.enableFiltering || false}
                      onCheckedChange={(checked) => {
                        const filterSettings = {
                          ...(content.filterSettings || {}),
                          enableFiltering: !!checked
                        };
                        setContent({ ...content, filterSettings });
                      }}
                    />
                    <Label htmlFor="filter-enabled">Abilita filtri predefiniti</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case "checklist":
        if (!content.items || !Array.isArray(content.items)) {
          content.items = [{ text: "", checked: false }];
        }
        
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {content.items.map((item: any, index: number) => (
                <div key={index} className="flex items-start">
                  <div className="mr-2 mt-1">
                    <Checkbox 
                      id={`checklist-item-edit-${module.id}-${index}`} 
                      checked={item.checked} 
                      onCheckedChange={(checked) => {
                        const newItems = [...content.items];
                        newItems[index] = { ...newItems[index], checked: !!checked };
                        setContent({ ...content, items: newItems });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      value={item.text}
                      onChange={(e) => {
                        const newItems = [...content.items];
                        newItems[index] = { ...newItems[index], text: e.target.value };
                        setContent({ ...content, items: newItems });
                      }}
                      placeholder="Elemento della lista"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newItems = [...content.items];
                      newItems.splice(index, 1);
                      if (newItems.length === 0) {
                        newItems.push({ text: "", checked: false });
                      }
                      setContent({ ...content, items: newItems });
                    }}
                    className="ml-2"
                  >
                    <span className="material-icons">delete</span>
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const newItems = [...content.items, { text: "", checked: false }];
                setContent({ ...content, items: newItems });
              }}
              className="w-full"
            >
              <span className="material-icons mr-2">add</span>
              Aggiungi elemento
            </Button>
          </div>
        );
        
      case "component":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="component-id">Componente</Label>
              <Select
                value={content.componentId ? content.componentId.toString() : ""}
                onValueChange={(value) => {
                  const componentId = parseInt(value);
                  // Recupera le informazioni del componente se necessario
                  setContent({ ...content, componentId });
                }}
              >
                <SelectTrigger id="component-id">
                  <SelectValue placeholder="Seleziona un componente" />
                </SelectTrigger>
                <SelectContent>
                  {/* Da implementare: lista dei componenti disponibili */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="component-quantity">Quantità</Label>
              <Input 
                id="component-quantity" 
                type="number" 
                min="1"
                value={content.quantity || 1} 
                onChange={(e) => setContent({ ...content, quantity: parseInt(e.target.value) || 1 })} 
              />
            </div>
            <div>
              <Label htmlFor="component-notes">Note</Label>
              <Textarea 
                id="component-notes" 
                value={content.notes || ""} 
                onChange={(e) => setContent({ ...content, notes: e.target.value })} 
              />
            </div>
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
                placeholder="https://esempio.com"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Testo del link</Label>
              <Input 
                id="link-text" 
                value={content.text || ""} 
                onChange={(e) => setContent({ ...content, text: e.target.value })} 
                placeholder="Clicca qui"
              />
            </div>
            <div>
              <Label htmlFor="link-description">Descrizione (opzionale)</Label>
              <Input 
                id="link-description" 
                value={content.description || ""} 
                onChange={(e) => setContent({ ...content, description: e.target.value })} 
                placeholder="Breve descrizione del link"
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
                placeholder="https://esempio.com/documento.pdf"
              />
            </div>
            <div>
              <Label htmlFor="pdf-title">Titolo del documento</Label>
              <Input 
                id="pdf-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
                placeholder="Manuale di istruzioni"
              />
            </div>
          </div>
        );
        
      default:
        return <div>Editor non disponibile per questo tipo di modulo</div>;
    }
  };
  
  const renderModuleControls = () => {
    return (
      <div className="flex justify-end space-x-2 mt-2">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Annulla
            </Button>
            <Button onClick={saveChanges}>
              Salva
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="ml-2"
            >
              <span className="material-icons">edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteModule}
              className="text-red-500 hover:text-red-700"
            >
              <span className="material-icons">delete</span>
            </Button>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="mb-4">
      <Card className="overflow-hidden">
        <CardHeader className="py-2 px-4 flex flex-row items-center justify-between bg-neutral-lightest">
          <div className="flex items-center">
            <span className="material-icons text-primary-500 mr-2">
              {getModuleIcon(module.type)}
            </span>
            <CardTitle className="text-base font-medium">
              {getModuleLabel(module.type)}
            </CardTitle>
          </div>
          {!isPreview && renderModuleControls()}
        </CardHeader>
        <CardContent className="p-4">
          {renderModuleContent()}
        </CardContent>
      </Card>
    </div>
  );
}