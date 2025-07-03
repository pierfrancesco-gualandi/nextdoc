import { useState, useEffect } from "react";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, Info, Trash, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BomTreeViewProps {
  bomItems: any[] | null | undefined;
  title?: string;
  description?: string | null;
  onItemClick?: (item: any) => void;
  onToggleExpand?: (item: any, expanded: boolean) => void;
  onDeleteItem?: (item: any) => void;
  className?: string;
  editable?: boolean;
}

interface TreeItem {
  id: number;
  componentId?: number;
  code: string;
  description: string;
  quantity: number;
  children?: TreeItem[];
  parentId?: number | null;
  level: number;
  expanded: boolean;
}

export default function BomTreeView({ 
  bomItems, 
  title = "Visualizzazione Distinta Base", 
  description = null,
  onItemClick,
  onToggleExpand,
  onDeleteItem,
  className = "",
  editable = false
}: BomTreeViewProps) {
  // Verifica che bomItems sia un array
  const safeItems = Array.isArray(bomItems) ? bomItems : [];
  const [treeData, setTreeData] = useState<TreeItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Funzione per costruire la gerarchia BOM basata sui livelli e relazioni tra componenti
  const buildBomHierarchy = (items: any[]): TreeItem[] => {
    if (!items || items.length === 0) return [];
    
    // Prima processiamo gli elementi per estrarre i livelli
    const processedItems = items.map(item => {
      // Estrai il livello direttamente o dai dettagli del componente (con fallback a 0)
      let level = 0;
      
      // Prima controlla se il livello è definito direttamente sull'item
      if (item.level !== undefined && !isNaN(parseInt(String(item.level), 10))) {
        level = parseInt(String(item.level), 10);
      } 
      // Altrimenti controlla nei dettagli del componente
      else if (item.component && item.component.details) {
        try {
          const details = item.component.details;
          if (typeof details === 'string' && details.startsWith('{')) {
            const parsedDetails = JSON.parse(details);
            if (parsedDetails.level !== undefined) {
              level = parseInt(String(parsedDetails.level), 10);
            }
          } else if (typeof details === 'object' && details.level !== undefined) {
            level = parseInt(String(details.level), 10);
          }
        } catch (e) {
          console.error("Errore nel parsing dei dettagli del componente:", e);
        }
      }
      
      return {
        id: item.id,
        componentId: item.componentId || item.component?.id,
        code: item.component?.code || 'N/A',
        description: item.component?.description || 'Componente sconosciuto',
        quantity: item.quantity,
        parentId: item.parentId || null,
        level: level,
        expanded: expandedItems[item.id] || false,
        children: [] as TreeItem[]
      };
    });
    
    // Ordina elementi per livello e poi per codice
    processedItems.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.code.localeCompare(b.code);
    });
    
    // Mappa per tenere traccia dell'ultimo elemento a ciascun livello
    const lastAtLevel: Record<number, TreeItem | null> = {};
    
    // Array risultato per gli elementi di primo livello
    const result: TreeItem[] = [];
    
    // Elabora gli elementi in ordine
    processedItems.forEach(item => {
      if (item.level === 0) {
        // Gli elementi di livello 0 vanno alla radice
        result.push(item);
        lastAtLevel[0] = item;
      } else {
        // Per gli elementi di livello > 0, trova il genitore appropriato
        const parentLevel = item.level - 1;
        const parent = lastAtLevel[parentLevel];
        
        if (parent) {
          // Aggiungi l'elemento come figlio dell'ultimo elemento del livello precedente
          parent.children = parent.children || [];
          parent.children.push(item);
          item.parentId = parent.id; // Imposta il parentId esplicito
        } else {
          // Se non troviamo un genitore appropriato, mettiamo l'elemento alla radice
          result.push(item);
        }
      }
      
      // Aggiorna l'ultimo elemento a questo livello
      lastAtLevel[item.level] = item;
      
      // Azzera tutti i livelli successivi quando cambia il livello corrente
      // Questo assicura che i figli siano collegati al genitore più recente
      for (let i = item.level + 1; i < 20; i++) {
        lastAtLevel[i] = null;
      }
    });
    
    return result;
  };

  useEffect(() => {
    if (safeItems.length > 0) {
      try {
        // Costruiamo la gerarchia BOM
        const hierarchicalTree = buildBomHierarchy(safeItems);
        setTreeData(hierarchicalTree);
        
        // Inizializza lo stato di espansione dei nodi se è la prima volta
        if (Object.keys(expandedItems).length === 0) {
          const expanded: Record<number, boolean> = {};
          const initializeExpanded = (items: TreeItem[]) => {
            items.forEach(item => {
              // Espande solo i livelli 0 e 1 per default, i livelli più profondi rimangono chiusi
              expanded[item.id] = item.level <= 1;
              if (item.children && item.children.length > 0) {
                initializeExpanded(item.children);
              }
            });
          };
          
          initializeExpanded(hierarchicalTree);
          setExpandedItems(expanded);
        }
      } catch (error) {
        console.error("Errore nella costruzione della gerarchia BOM:", error);
        
        // Fallback: struttura piatta se ci sono errori
        const flatTree = safeItems.map(item => ({
          id: item.id,
          componentId: item.componentId,
          code: item.component?.code || 'N/A',
          description: item.component?.description || 'Componente sconosciuto',
          quantity: item.quantity,
          level: 0,
          expanded: true
        }));
        
        setTreeData(flatTree);
        
        if (Object.keys(expandedItems).length === 0) {
          const expanded: Record<number, boolean> = {};
          flatTree.forEach(item => {
            expanded[item.id] = true;
          });
          setExpandedItems(expanded);
        }
      }
    } else {
      setTreeData([]);
    }
  }, [safeItems]);

  const toggleExpand = (itemId: number, item?: TreeItem) => {
    const newValue = !expandedItems[itemId];
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: newValue
    }));
    
    // Se viene fornita la funzione di callback, la invochiamo
    if (onToggleExpand && item) {
      onToggleExpand(item, newValue);
    }
  };
  
  const renderTreeItem = (item: TreeItem) => {
    const isExpanded = expandedItems[item.id];
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={item.id} className="tree-item">
        <div 
          className={`flex items-start py-2 px-2 hover:bg-neutral-100 rounded-md cursor-pointer ${onItemClick ? 'hover:bg-primary-50' : ''}`}
          onClick={() => {
            if (onItemClick) {
              onItemClick(item);
            }
          }}
        >
          {/* Indentazione gerarchica basata sui livelli */}
          <div style={{ 
            paddingLeft: `${item.level * 20}px`, 
            display: 'flex',
            alignItems: 'center',
            minWidth: '150px'
          }}>
            {/* Simbolo di espansione: > o < */}
            <span
              className="mr-2 text-neutral-700 cursor-pointer font-bold select-none"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleExpand(item.id, item);
                }
              }}
            >
              {hasChildren ? (isExpanded ? "< " : "> ") : "  "}
            </span>
            
            {/* Badge del livello */}
            <Badge variant="secondary" className="mr-2 text-xs min-w-[24px] flex justify-center">
              L{item.level}
            </Badge>
            
            {/* Codice alfanumerico */}
            <span 
              className="font-medium text-neutral-900 whitespace-nowrap cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleExpand(item.id, item);
                }
              }}
            >
              {item.code}
            </span>
          </div>
          
          {/* Quantità */}
          <div className="min-w-[80px] flex items-center">
            <Badge className="ml-2" variant="outline">
              {item.quantity} {item.quantity > 1 ? 'pz' : 'pz'}
            </Badge>
          </div>
          
          {/* Descrizione interattiva */}
          <div 
            className="ml-3 text-sm text-neutral-700 truncate flex-grow cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleExpand(item.id, item);
              }
            }}
          >
            {item.description}
          </div>
          
          {/* Azioni (visibili solo in modalità modifica) */}
          <div className="flex gap-1 ml-auto">
            {editable && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Elimina componente</AlertDialogTitle>
                    <AlertDialogDescription>
                      {hasChildren 
                        ? "Sei sicuro di voler eliminare questo componente e tutti i suoi figli dalla distinta base?" 
                        : "Sei sicuro di voler eliminare questo componente dalla distinta base?"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-500 hover:bg-red-600" 
                      onClick={() => onDeleteItem && onDeleteItem(item)}
                    >
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {/* Dettagli aggiuntivi in un tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help flex-shrink-0">
                    <Info className="h-4 w-4 text-neutral-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium text-primary">{item.code}</p>
                    <p><span className="font-medium">Livello:</span> {item.level}</p>
                    <p><span className="font-medium">Descrizione:</span> {item.description}</p>
                    <p><span className="font-medium">Quantità:</span> {item.quantity}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Elementi figli */}
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {safeItems.length === 0 ? (
          <div className="text-center py-8 text-neutral-medium">
            Nessun componente disponibile nella distinta base
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {treeData.map(item => renderTreeItem(item))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}