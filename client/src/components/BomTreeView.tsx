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
    // Prima passiamo attraverso gli elementi per estrarre i livelli basati sul formato del codice
    const processedItems = items.map(item => {
      // Assumiamo che il livello possa essere derivato dal codice o sia esplicitamente specificato
      let level = item.level || 0;
      
      // Se il livello non è esplicitamente specificato, cerchiamo di derivarlo dal codice
      // Ad esempio, codici come "1.2.3" possono indicare livelli diversi basati sul numero di segmenti
      if (typeof level !== 'number' && item.component?.code) {
        const codeParts = item.component.code.split(/[.-]/);
        level = codeParts.length - 1;
      }
      
      return {
        id: item.id,
        componentId: item.componentId,
        code: item.component?.code || 'N/A',
        description: item.component?.description || 'Componente sconosciuto',
        quantity: item.quantity,
        parentId: item.parentId || null,
        level,
        expanded: true,
        children: [] as TreeItem[]
      };
    });
    
    // Ordina elementi per livello e codice
    processedItems.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.code.localeCompare(b.code);
    });
    
    // Cerchiamo di costruire la gerarchia basata sui livelli e sui prefissi del codice
    const result: TreeItem[] = [];
    const itemMap: Record<number, TreeItem> = {};
    
    // Populiamo la mappa per accesso veloce
    processedItems.forEach(item => {
      itemMap[item.id] = item;
    });
    
    // Funzione per trovare il parent basato sul codice e livello
    const findParentByCode = (item: TreeItem) => {
      // Per elementi di livello 0, non c'è parent
      if (item.level === 0) return null;
      
      // Se c'è un parentId esplicito, lo usiamo
      if (item.parentId && itemMap[item.parentId]) {
        return itemMap[item.parentId];
      }
      
      // Altrimenti, cerchiamo di abbinare basandoci sul codice
      // Assumiamo che i codici seguano una struttura gerarchica come "1", "1.1", "1.1.1", ecc.
      const codeParts = item.code.split(/[.-]/);
      if (codeParts.length <= 1) return null;
      
      // Rimuoviamo l'ultimo segmento per ottenere il potenziale codice del parent
      codeParts.pop();
      const parentCode = codeParts.join('.');
      
      // Cerca un elemento con lo stesso codice
      const parentItem = processedItems.find(p => 
        p.code === parentCode && p.level === item.level - 1
      );
      
      return parentItem || null;
    };
    
    // Costruisci la gerarchia
    processedItems.forEach(item => {
      const parent = findParentByCode(item);
      
      if (!parent) {
        // Elemento di root
        result.push(item);
      } else {
        // Aggiungi come figlio
        if (!parent.children) parent.children = [] as TreeItem[];
        parent.children.push(item as TreeItem);
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
        
        // Inizializza lo stato di espansione dei nodi
        const expanded: Record<number, boolean> = {};
        const initializeExpanded = (items: TreeItem[]) => {
          items.forEach(item => {
            expanded[item.id] = true;
            if (item.children && item.children.length > 0) {
              initializeExpanded(item.children);
            }
          });
        };
        
        initializeExpanded(hierarchicalTree);
        setExpandedItems(expanded);
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
        
        const expanded: Record<number, boolean> = {};
        flatTree.forEach(item => {
          expanded[item.id] = true;
        });
        setExpandedItems(expanded);
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
          className={`flex items-center py-2 px-2 hover:bg-neutral-100 rounded-md cursor-pointer ${onItemClick ? 'hover:bg-primary-50' : ''}`}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id, item);
            }
            if (onItemClick) {
              onItemClick(item);
            }
          }}
        >
          {/* Indentazione in base al livello gerarchico */}
          <div className="flex items-center" style={{ minWidth: `${(item.level * 24) + 24}px` }}>
            <span className="mr-1 text-neutral-500 w-5">
              {hasChildren ? (
                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              ) : (
                <span className="w-4"></span>
              )}
            </span>
            
            {/* Livello (mostra il livello come Badge prima del codice) */}
            <Badge variant="secondary" className="mr-2 text-xs min-w-[24px] flex justify-center">
              L{item.level}
            </Badge>
          </div>
          
          {/* Codice alfanumerico */}
          <div className="flex items-center min-w-[120px]">
            <span className="font-medium text-neutral-900 whitespace-nowrap">{item.code}</span>
          </div>
          
          {/* Quantità */}
          <div className="min-w-[80px] flex items-center">
            <Badge className="ml-2" variant="outline">
              {item.quantity} {item.quantity > 1 ? 'pz' : 'pz'}
            </Badge>
          </div>
          
          {/* Descrizione */}
          <div className="ml-3 text-sm text-neutral-700 truncate flex-grow">
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