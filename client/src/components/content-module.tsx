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

// We need to create these components for BOM module support
const BomSelector = ({ bomId, onChange }: { bomId: number, onChange: (bomId: number) => void }) => {
  const { data: boms } = useQuery({
    queryKey: ['/api/boms'],
    staleTime: 30000,
  });

  if (!boms || !Array.isArray(boms) || boms.length === 0) {
    return <div className="text-neutral-medium">Nessuna distinta base disponibile</div>;
  }

  return (
    <Select
      value={bomId ? bomId.toString() : ""}
      onValueChange={(value) => onChange(parseInt(value))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona una distinta base" />
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

const BomViewContent = ({ bomId, filter, levelFilter: initialLevelFilter, useFilters = false }: { bomId: number, filter?: string, levelFilter?: number, useFilters?: boolean }) => {
  const { data: bom = {} as any } = useQuery({
    queryKey: ['/api/boms', bomId],
    enabled: !!bomId,
    staleTime: 30000,
  });

  const { data: bomItems = [] as any[] } = useQuery({
    queryKey: ['/api/boms', bomId, 'items'],
    enabled: !!bomId,
    staleTime: 30000,
  });

  const [codeFilter, setCodeFilter] = useState('');
  const [codeFilterType, setCodeFilterType] = useState<'contains' | 'startsWith' | 'equals'>('contains');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [descriptionFilterType, setDescriptionFilterType] = useState<'contains' | 'startsWith' | 'equals'>('contains');
  const [levelFilter, setLevelFilter] = useState<number | undefined>(initialLevelFilter);
  const [enableFiltering, setEnableFiltering] = useState(useFilters);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Trova i livelli unici disponibili nella distinta base
  const uniqueLevels = useMemo(() => {
    if (!Array.isArray(bomItems) || bomItems.length === 0) return [0];
    try {
      // Estrai tutti i livelli unici dalla distinta
      const levels = Array.from(new Set(bomItems.map((item: any) => {
        if (item && typeof item.level === 'number') {
          return item.level;
        }
        return 0;
      }))).sort((a, b) => a - b);
      
      console.log("Livelli unici trovati nella distinta:", levels);
      return levels;
    } catch (error) {
      console.error("Errore durante l'elaborazione dei livelli:", error);
      return [0, 1, 2]; // Valori di fallback
    }
  }, [bomItems]);

  // Filtra gli elementi in base ai criteri selezionati
  const filteredItems = useMemo(() => {
    if (!Array.isArray(bomItems)) return [];
    if (!enableFiltering) return bomItems;
    
    console.log("Filtraggio attivo con:", {
      codeFilter, codeFilterType, descriptionFilter, descriptionFilterType, levelFilter
    });
    
    // Applica filtri direttamente senza la logica a due fasi
    return bomItems.filter((item: any) => {
      if (!item || !item.component) return false;
      
      const code = item.component.code || '';
      const description = item.component.description || '';
      
      // Applica il filtro per codice
      let codeMatch = true;  // Predefinito a true se non c'è filtro
      if (codeFilter) {
        switch (codeFilterType) {
          case 'equals':
            codeMatch = code.toLowerCase() === codeFilter.toLowerCase();
            break;
          case 'startsWith':
            codeMatch = code.toLowerCase().startsWith(codeFilter.toLowerCase());
            break;
          case 'contains':
          default:
            codeMatch = code.toLowerCase().includes(codeFilter.toLowerCase());
            break;
        }
      }
      
      // Applica il filtro per descrizione
      let descriptionMatch = true;  // Predefinito a true se non c'è filtro
      if (descriptionFilter) {
        switch (descriptionFilterType) {
          case 'equals':
            descriptionMatch = description.toLowerCase() === descriptionFilter.toLowerCase();
            break;
          case 'startsWith':
            descriptionMatch = description.toLowerCase().startsWith(descriptionFilter.toLowerCase());
            break;
          case 'contains':
          default:
            descriptionMatch = description.toLowerCase().includes(descriptionFilter.toLowerCase());
            break;
        }
      }
      
      // Applica il filtro per livello - mostra tutti gli elementi di quel livello
      let levelMatch = true;
      if (levelFilter !== undefined && levelFilter !== null && 
          !(typeof levelFilter === "string" && levelFilter === "all")) {
        levelMatch = item.level === Number(levelFilter);
      }
      
      // Tutte le condizioni devono essere soddisfatte
      const matchResult = codeMatch && descriptionMatch && levelMatch;
      return matchResult;
    });
  }, [
    bomItems, 
    enableFiltering, 
    codeFilter,
    codeFilterType, 
    descriptionFilter,
    descriptionFilterType, 
    levelFilter
  ]);

  if (!bomId) {
    return <div className="text-neutral-medium italic">Nessuna distinta base selezionata</div>;
  }

  // Visualizza il messaggio di caricamento quando items non è ancora disponibile o vuoto
  if (!Array.isArray(bomItems) || bomItems.length === 0) {
    return <div className="text-neutral-medium">Caricamento distinta base...</div>;
  }
  
  // Debug per visualizzare i dati caricati
  console.log(`Distinta base ${bomId} caricata con ${bomItems.length} elementi`);
  console.log("Livelli trovati:", uniqueLevels);

  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-medium mb-2">{bom && bom.title ? bom.title : 'Distinta Base'}</h3>
      
      {/* Filtri */}
      <div className="mb-4 border border-gray-200 rounded-md p-3 bg-gray-50">
        <div className="flex items-center mb-2">
          <Checkbox 
            id="enable-filters"
            checked={enableFiltering}
            onCheckedChange={(checked) => setEnableFiltering(!!checked)}
          />
          <label htmlFor="enable-filters" className="ml-2 text-sm font-medium">Attiva filtri</label>
        </div>
        
        {enableFiltering && (
          <div className="space-y-3">
            {/* Filtro per codice */}
            <div className="space-y-2">
              <Label htmlFor="code-filter" className="text-xs font-medium">Filtro per codice</Label>
              <div className="flex gap-2">
                <div className="flex-grow">
                  <Input 
                    id="code-filter" 
                    value={codeFilter}
                    onChange={e => setCodeFilter(e.target.value)}
                    placeholder="Inserisci codice"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="w-36">
                  <Select
                    value={codeFilterType}
                    onValueChange={(value) => setCodeFilterType(value as 'contains' | 'startsWith' | 'equals')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Contiene" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contiene</SelectItem>
                      <SelectItem value="startsWith">Inizia con</SelectItem>
                      <SelectItem value="equals">Uguale a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Filtro per descrizione */}
            <div className="space-y-2">
              <Label htmlFor="description-filter" className="text-xs font-medium">Filtro per descrizione</Label>
              <div className="flex gap-2">
                <div className="flex-grow">
                  <Input 
                    id="description-filter" 
                    value={descriptionFilter}
                    onChange={e => setDescriptionFilter(e.target.value)}
                    placeholder="Inserisci descrizione"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="w-36">
                  <Select
                    value={descriptionFilterType}
                    onValueChange={(value) => setDescriptionFilterType(value as 'contains' | 'startsWith' | 'equals')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Contiene" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contiene</SelectItem>
                      <SelectItem value="startsWith">Inizia con</SelectItem>
                      <SelectItem value="equals">Uguale a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Filtro per livello */}
            <div className="space-y-2">
              <Label htmlFor="level-filter" className="text-xs font-medium">Filtro per livello</Label>
              <Select
                value={levelFilter !== undefined ? (typeof levelFilter === "number" ? levelFilter.toString() : "all") : "all"}
                onValueChange={(value) => setLevelFilter(value === "all" ? undefined : parseInt(value))}
              >
                <SelectTrigger id="level-filter" className="h-8 text-sm">
                  <SelectValue placeholder="Tutti i livelli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i livelli</SelectItem>
                  {uniqueLevels.map((level: number) => (
                    <SelectItem key={level} value={level.toString()}>
                      Livello {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Pulsante per applicare i filtri */}
            <div className="pt-2">
              <Button 
                size="sm" 
                onClick={() => setFiltersApplied(true)}
                className="w-full"
              >
                Applica filtri
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Tabella */}
      {Array.isArray(filteredItems) && filteredItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-neutral-lightest border-b border-neutral-light">
                <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">N°</th>
                <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Livello</th>
                <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Codice</th>
                <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Descrizione</th>
                <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Quantità</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any, index: number) => {
                // Verifica che item esista e sia valido
                if (!item || !item.component) return null;
                
                // Estrai proprietà in modo sicuro
                const level = item.level !== undefined ? item.level : '';
                const code = item.component.code || '';
                const description = item.component.description || '';
                const quantity = item.quantity || 0;
                
                return (
                  <tr key={item.id || index} className="border-b border-neutral-light hover:bg-neutral-lightest">
                    <td className="py-2 px-3 text-sm font-bold">{index + 1}</td>
                    <td className="py-2 px-3 text-sm">{level}</td>
                    <td className="py-2 px-3 text-sm font-medium">{code}</td>
                    <td className="py-2 px-3 text-sm">{description}</td>
                    <td className="py-2 px-3 text-sm">{quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-neutral-medium italic">
          {enableFiltering 
            ? "Nessun componente corrisponde ai filtri selezionati" 
            : "Nessun componente nella distinta base"}
        </div>
      )}
    </div>
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
}

export default function ContentModule({ 
  module, 
  onDelete, 
  onUpdate,
  documentId,
  isPreview = false
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
      case "bom": return "inventory_2";
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
      case "bom": return "Distinta Base";
      default: return type;
    }
  };
  
  const renderModuleContent = () => {
    if (isEditing) {
      return renderModuleEditor();
    }
    
    // Prima di renderizzare, assicuriamoci che l'oggetto content esista
    if (!content) {
      return <div className="p-2 text-neutral-dark">Contenuto non disponibile</div>;
    }

    switch (module.type) {
      case "text":
        // Assicuriamoci che il testo esista prima di renderizzarlo
        return content.text 
          ? <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.text }} /> 
          : <div className="text-neutral-medium italic">Testo vuoto</div>;
        
      case "image":
        return (
          <div className="flex flex-col items-center">
            <img src={content.src} alt={content.alt} className="max-w-full h-auto rounded-md max-h-80" />
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "warning":
        // Verifica se il modulo di avviso ha il contenuto necessario
        if (!content.title || !content.message) {
          return <div className="text-neutral-medium italic">Avviso configurato in modo incompleto</div>;
        }
        
        let bgColor = "bg-warning";
        let borderColor = "border-warning";
        let textColor = "text-warning";
        let icon = "warning";
        
        if (content.level === "info") {
          bgColor = "bg-info";
          borderColor = "border-info";
          textColor = "text-info";
          icon = "info";
        } else if (content.level === "error") {
          bgColor = "bg-error";
          borderColor = "border-error";
          textColor = "text-error";
          icon = "error";
        }
        
        return (
          <div className={`p-4 ${bgColor} bg-opacity-5 border-l-4 ${borderColor}`}>
            <div className="flex">
              <span className={`material-icons ${textColor} mr-2`}>{icon}</span>
              <div>
                <p className="text-neutral-darkest font-medium mb-1">{content.title}</p>
                <p className="text-neutral-dark whitespace-pre-wrap">{content.message}</p>
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
        // Verifica se la tabella ha intestazioni e righe
        if (!content.headers || !content.rows || content.headers.length === 0) {
          return <div className="text-neutral-medium italic">Tabella vuota o non configurata correttamente</div>;
        }
        
        return (
          <div className="flex flex-col items-center w-full">
            <div className="w-full overflow-x-auto">
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="bg-neutral-lightest">
                    {content.headers.map((header: string, index: number) => (
                      <TableHead key={index} className="text-neutral-dark font-medium p-2 border border-neutral-light text-left">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.rows.map((row: string[], rowIndex: number) => {
                    // Assicurati che ogni riga abbia lo stesso numero di celle delle intestazioni
                    const displayRow = [...row];
                    while (displayRow.length < content.headers.length) {
                      displayRow.push(""); // Aggiungi celle vuote se mancanti
                    }
                    
                    return (
                      <TableRow key={rowIndex} className="hover:bg-neutral-lightest">
                        {displayRow.slice(0, content.headers.length).map((cell: string, cellIndex: number) => (
                          <TableCell key={cellIndex} className="p-2 border border-neutral-light">
                            {cell || ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );

      case "bom":
        return (
          <BomViewContent
            bomId={content.bomId}
            filter={content.filter}
            levelFilter={content.levelFilter}
            useFilters={content.useFilters}
          />
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
              <Label htmlFor="bom-id">Distinta Base</Label>
              <BomSelector
                bomId={content.bomId || 0}
                onChange={(bomId) => setContent({ ...content, bomId })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="bom-use-filters"
                checked={content.useFilters || false}
                onCheckedChange={(checked) => setContent({ ...content, useFilters: !!checked })}
              />
              <Label htmlFor="bom-use-filters">Mostra filtri</Label>
            </div>
          </div>
        );

      default:
        return <div>Tipo di modulo non supportato: {module.type}</div>;
    }
  };
  
  const renderModuleControls = () => {
    if (isPreview) return null;
    
    return (
      <div className="flex items-center justify-end space-x-2 p-2">
        {isEditing ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Annulla
            </Button>
            <Button size="sm" variant="default" onClick={saveChanges}>
              Salva
            </Button>
          </>
        ) : (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsEditing(true)}
            >
              <span className="material-icons text-sm mr-1">edit</span>
              Modifica
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDeleteModule}
            >
              <span className="material-icons text-sm mr-1">delete</span>
              Elimina
            </Button>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="mb-4">
      <Card className="w-full">
        <CardHeader className="px-6 py-3 flex flex-row items-center justify-between border-b border-neutral-light">
          <div className="flex items-center text-sm">
            <span className="material-icons text-neutral-medium mr-2">{getModuleIcon(module.type)}</span>
            <CardTitle className="text-lg text-neutral-dark">{getModuleLabel(module.type)}</CardTitle>
          </div>
          {renderModuleControls()}
        </CardHeader>
        <CardContent className="p-6">
          {renderModuleContent()}
        </CardContent>
      </Card>
    </div>
  );
}