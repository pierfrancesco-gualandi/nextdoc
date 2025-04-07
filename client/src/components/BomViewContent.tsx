import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface BomFilterSettings {
  codeFilter?: string;
  codeFilterType?: 'contains' | 'startsWith' | 'equals';
  descriptionFilter?: string;
  descriptionFilterType?: 'contains' | 'startsWith' | 'equals';
  levelFilter?: number;
  enableFiltering: boolean;
}

// Interfaccia per le traduzioni dell'elenco componenti
export interface BomTranslation {
  title?: string;
  headers?: {
    number?: string;
    level?: string;
    code?: string;
    description?: string;
    quantity?: string;
  };
  messages?: {
    loading?: string;
    notFound?: string;
    empty?: string;
    noResults?: string;
  };
  // Traduzioni delle descrizioni dei componenti
  descriptions?: {
    [code: string]: string; // Map di codice -> descrizione tradotta
  };
}

interface BomViewContentProps {
  bomId: number;
  filter?: string;
  levelFilter?: number;
  useFilters?: boolean;
  // Parametro per memorizzare le impostazioni di filtro complesse
  filterSettings?: BomFilterSettings;
  onFilterUpdate?: (filterSettings: BomFilterSettings) => void;
  // Traduzioni
  translation?: BomTranslation;
}

function findChildComponents(items: any[], parentCode: string): string[] {
  const childCodes: string[] = [];
  let currentLevel = -1;
  let isChildren = false;
  
  // Prima identifica il livello del codice padre
  for (const item of items) {
    if (item.component && item.component.code === parentCode) {
      currentLevel = item.level;
      isChildren = true;
      childCodes.push(parentCode); // Includi anche il codice padre
      break;
    }
  }
  
  // Se il codice padre è stato trovato, cerca tutti i figli
  if (isChildren) {
    for (const item of items) {
      if (item.level > currentLevel) {
        // Questo è un figlio del codice padre
        if (item.component && item.component.code) {
          childCodes.push(item.component.code);
        }
      } else if (item.level <= currentLevel && childCodes.length > 1) {
        // Abbiamo trovato un elemento successivo di livello uguale o superiore
        // dopo aver già aggiunto dei figli, quindi siamo fuori dal ramo
        break;
      }
    }
  }
  
  return childCodes;
}

const BomViewContent = ({ 
  bomId, 
  filter, 
  levelFilter, 
  useFilters = false,
  filterSettings,
  onFilterUpdate,
  translation
}: BomViewContentProps) => {
  // Stati locali per filtri
  const [codeFilter, setCodeFilter] = useState<string>(filterSettings?.codeFilter || "");
  const [codeFilterType, setCodeFilterType] = useState<'contains' | 'startsWith' | 'equals'>(
    filterSettings?.codeFilterType || 'contains'
  );
  const [descriptionFilter, setDescriptionFilter] = useState<string>(filterSettings?.descriptionFilter || "");
  const [descriptionFilterType, setDescriptionFilterType] = useState<'contains' | 'startsWith' | 'equals'>(
    filterSettings?.descriptionFilterType || 'contains'
  );
  const [levelFilterValue, setLevelFilterValue] = useState<number | undefined>(
    filterSettings?.levelFilter !== undefined ? filterSettings.levelFilter : undefined
  );
  const [showFilters, setShowFilters] = useState<boolean>(useFilters);
  const [enableFiltering, setEnableFiltering] = useState<boolean>(
    filterSettings?.enableFiltering || false
  );

  // Query per recuperare la BOM
  const { data: bom, isLoading: isBomLoading } = useQuery({
    queryKey: ['/api/boms', bomId],
    enabled: !!bomId,
  });

  // Query per recuperare gli elementi della BOM
  const { data: bomItems, isLoading: isItemsLoading } = useQuery({
    queryKey: ['/api/boms', bomId, 'items'],
    enabled: !!bomId,
    queryFn: async () => {
      const response = await fetch(`/api/boms/${bomId}/items`);
      if (!response.ok) throw new Error('Errore nel caricamento degli elementi della distinta base');
      return response.json();
    }
  });

  // Ottieni livelli unici per il filtro
  const uniqueLevels = useMemo(() => {
    if (!bomItems || !Array.isArray(bomItems)) return [];
    
    const levels = new Set<number>();
    bomItems.forEach((item: any) => {
      if (item.level !== undefined) {
        levels.add(item.level);
      }
    });
    
    return Array.from(levels).sort((a, b) => a - b);
  }, [bomItems]);

  // Filtra gli elementi in base ai criteri
  const filteredItems = useMemo(() => {
    if (!bomItems || !Array.isArray(bomItems)) return [];
    if (!enableFiltering) return bomItems;
    
    // Cerca codici padre e figli se è specificato un filtro per codice
    let childCodes: string[] = [];
    if (codeFilter) {
      // Trova prima il componente che corrisponde esattamente al filtro
      const parentItem = bomItems.find((item: any) => 
        item.component && 
        item.component.code.toLowerCase() === codeFilter.toLowerCase()
      );
      
      if (parentItem) {
        console.log("Trovato codice padre:", parentItem.component.code);
        // Trova tutti i componenti figli
        childCodes = findChildComponents(bomItems, parentItem.component.code);
        console.log("Codici inclusi nel ramo:", childCodes);
      }
    }
    
    // Applica filtri con logica gerarchica
    return bomItems.filter((item: any) => {
      if (!item || !item.component) return false;
      
      const code = item.component.code || '';
      const description = item.component.description || '';
      
      // Gestione speciale per filtro codice se abbiamo trovato una gerarchia
      let codeMatch = true;  // Predefinito a true se non c'è filtro
      if (codeFilter) {
        if (childCodes.length > 0) {
          // Usa la logica gerarchica se abbiamo trovato il codice specificato
          codeMatch = childCodes.includes(code);
        } else {
          // Altrimenti usa il filtro normale
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
      }
      
      // Applica il filtro per descrizione
      let descriptionMatch = true;
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
      
      // Applica il filtro per livello
      let levelMatch = true;
      if (levelFilterValue !== undefined) {
        levelMatch = item.level === levelFilterValue;
      }
      
      // Tutte le condizioni devono essere soddisfatte
      return codeMatch && descriptionMatch && levelMatch;
    });
  }, [bomItems, codeFilter, codeFilterType, descriptionFilter, descriptionFilterType, levelFilterValue, enableFiltering]);

  // Aggiorna i filtri e notifica il componente padre
  useEffect(() => {
    if (onFilterUpdate) {
      const newFilterSettings = {
        codeFilter,
        codeFilterType,
        descriptionFilter,
        descriptionFilterType,
        levelFilter: levelFilterValue,
        enableFiltering
      };
      
      // Salva le impostazioni di filtro nel componente padre
      onFilterUpdate(newFilterSettings);
    }
  }, [codeFilter, codeFilterType, descriptionFilter, descriptionFilterType, levelFilterValue, enableFiltering, onFilterUpdate]);

  // Messaggi predefiniti o tradotti
  const messages = {
    loading: translation?.messages?.loading || "Caricamento elenco componenti...",
    notFound: translation?.messages?.notFound || "Elenco componenti non trovato",
    empty: translation?.messages?.empty || "Nessun componente trovato nell'elenco",
    noResults: translation?.messages?.noResults || "Nessun risultato con i filtri applicati"
  };

  if (isBomLoading || isItemsLoading) {
    return <div className="py-4 text-center text-neutral-medium">{messages.loading}</div>;
  }

  if (!bom) {
    return <div className="py-4 text-center text-neutral-medium">{messages.notFound}</div>;
  }

  if (!bomItems || !Array.isArray(bomItems) || bomItems.length === 0) {
    return <div className="py-4 text-center text-neutral-medium">{messages.empty}</div>;
  }

  // Determina se mostrare i controlli di filtro o solo la tabella filtrata
  // In modalità anteprima o per l'esportazione, mostra solo la tabella
  const isPreviewOrExport = !showFilters;

  return (
    <div className="space-y-4">
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="code-filter">Filtra per Codice:</Label>
                  <Select
                    value={codeFilterType}
                    onValueChange={(v: any) => setCodeFilterType(v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contiene</SelectItem>
                      <SelectItem value="startsWith">Inizia con</SelectItem>
                      <SelectItem value="equals">Uguale a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  id="code-filter"
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                  placeholder="Inserisci codice componente"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description-filter">Filtra per Descrizione:</Label>
                  <Select
                    value={descriptionFilterType}
                    onValueChange={(v: any) => setDescriptionFilterType(v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contiene</SelectItem>
                      <SelectItem value="startsWith">Inizia con</SelectItem>
                      <SelectItem value="equals">Uguale a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  id="description-filter"
                  value={descriptionFilter}
                  onChange={(e) => setDescriptionFilter(e.target.value)}
                  placeholder="Inserisci descrizione"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="level-filter">Filtra per Livello:</Label>
                <Select
                  value={levelFilterValue !== undefined ? levelFilterValue.toString() : "all"}
                  onValueChange={(v) => setLevelFilterValue(v === "all" ? undefined : parseInt(v))}
                >
                  <SelectTrigger id="level-filter">
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
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCodeFilter("");
                  setDescriptionFilter("");
                  setLevelFilterValue(undefined);
                }}
              >
                Cancella Filtri
              </Button>
              
              <Button 
                variant={enableFiltering ? "default" : "outline"}
                onClick={() => setEnableFiltering(!enableFiltering)}
              >
                {enableFiltering ? "Filtri Attivi" : "Attiva Filtri"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* La tabella viene sempre mostrata, sia in modalità modifica che in anteprima */}
      <div className="overflow-x-auto">
        {translation?.title && (
          <h3 className="text-xl font-bold mb-2">{translation.title}</h3>
        )}
        <Table className="w-full border-collapse">
          <TableHeader>
            <TableRow className="bg-neutral-lightest">
              <TableHead className="font-medium p-2 border border-neutral-light text-left w-12">
                {translation?.headers?.number || "N°"}
              </TableHead>
              <TableHead className="font-medium p-2 border border-neutral-light text-left w-20">
                {translation?.headers?.level || "Livello"}
              </TableHead>
              <TableHead className="font-medium p-2 border border-neutral-light text-left">
                {translation?.headers?.code || "Codice"}
              </TableHead>
              <TableHead className="font-medium p-2 border border-neutral-light text-left">
                {translation?.headers?.description || "Descrizione"}
              </TableHead>
              <TableHead className="font-medium p-2 border border-neutral-light text-right w-24">
                {translation?.headers?.quantity || "Quantità"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item: any, index: number) => {
              // Se l'elemento non ha un componente, salta
              if (!item.component) return null;
              
              return (
                <TableRow key={item.id} className="hover:bg-neutral-lightest">
                  <TableCell className="p-2 border border-neutral-light">{index + 1}</TableCell>
                  <TableCell className="p-2 border border-neutral-light">{item.level !== undefined ? item.level : ''}</TableCell>
                  <TableCell className="p-2 border border-neutral-light font-medium">
                    {item.component.code}
                  </TableCell>
                  <TableCell className="p-2 border border-neutral-light">
                    {/* Mostra la descrizione tradotta se disponibile, altrimenti usa quella originale */}
                    {translation?.descriptions && translation.descriptions[item.component.code] 
                      ? translation.descriptions[item.component.code] 
                      : item.component.description}
                  </TableCell>
                  <TableCell className="p-2 border border-neutral-light text-right">
                    {item.quantity}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-4 text-center text-neutral-medium">
                  {messages.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {showFilters && filteredItems.length > 0 && enableFiltering && (
        <div className="text-sm text-neutral-medium mt-2">
          Mostra {filteredItems.length} di {bomItems.length} componenti
        </div>
      )}
    </div>
  );
};

// Funzione di utilità per estrarre i codici dei componenti dalla BOM
export function getVisibleComponentCodes(items: any[]): string[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map(item => item.component?.code).filter(Boolean);
}

export default BomViewContent;