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
  filteredComponentCodes?: string[]; // Lista di codici dei componenti filtrati
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
  // Lingua selezionata
  selectedLanguage?: string;
  // Evidenzia testi non tradotti
  highlightMissingTranslations?: boolean;
}

function findChildComponents(items: any[], parentCode: string): string[] {
  const childCodes: string[] = [];
  
  // Prima trova l'indice e il livello del componente padre
  let parentIndex = -1;
  let parentLevel = -1;
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].component && items[i].component.code === parentCode) {
      parentIndex = i;
      parentLevel = items[i].level;
      childCodes.push(parentCode);
      break;
    }
  }
  
  // Se il padre non è stato trovato, restituisci array vuoto
  if (parentIndex === -1) {
    return childCodes;
  }
  
  console.log(`🔍 findChildComponents per ${parentCode}: padre trovato all'indice ${parentIndex}, livello ${parentLevel}`);
  
  // Trova tutti i componenti che seguono il padre e hanno livello superiore (sono nel sottoramo)
  for (let i = parentIndex + 1; i < items.length; i++) {
    const currentItem = items[i];
    
    // Se troviamo un altro componente allo stesso livello del padre o superiore, fermiamoci
    if (currentItem.level <= parentLevel) {
      console.log(`🔍 findChildComponents per ${parentCode}: fermato a ${currentItem.component?.code || 'N/A'} (livello ${currentItem.level})`);
      break;
    }
    
    // Se è a un livello inferiore (maggiore), è parte del sottoramo
    if (currentItem.level > parentLevel && currentItem.component && currentItem.component.code) {
      childCodes.push(currentItem.component.code);
      console.log(`🔍 findChildComponents per ${parentCode}: aggiunto componente del sottoramo ${currentItem.component.code} (livello ${currentItem.level})`);
    }
  }
  
  console.log(`🔍 findChildComponents per ${parentCode}: tutti i componenti nel sottoramo:`, childCodes);
  return childCodes;
}

const BomViewContent = ({ 
  bomId, 
  filter, 
  levelFilter, 
  useFilters = false,
  filterSettings,
  onFilterUpdate,
  translation,
  selectedLanguage,
  highlightMissingTranslations = false
}: BomViewContentProps) => {
  // Log per debug
  console.log("BomViewContent: Rendering con filtri:", { 
    bomId, 
    filterSettings, 
    filter,
    isTranslation: !!translation,
    filteredComponentCodes: filterSettings?.filteredComponentCodes
  });
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
    
    console.log("BomViewContent - Filtering Items:", {
      enableFiltering,
      codeFilter,
      levelFilterValue,
      filteredComponentCodes: filterSettings?.filteredComponentCodes || [],
      itemCount: bomItems.length
    });
    
    // Se abbiamo una lista esplicita di codici componenti da mostrare nella traduzione
    // SOLO se non ci sono filtri dinamici attivi
    if (filterSettings?.filteredComponentCodes?.length > 0 && 
        !codeFilter && !descriptionFilter && levelFilterValue === undefined) {
      console.log("BomViewContent - Usando filteredComponentCodes specifici:", 
        filterSettings.filteredComponentCodes.length, 
        "componenti da mostrare"
      );
      
      // Filtra usando direttamente la lista dei codici
      return bomItems.filter((item: any) => {
        if (!item || !item.component) return false;
        return filterSettings.filteredComponentCodes?.includes(item.component.code);
      });
    }
    
    // Se il filtro è disabilitato, mostra tutti i componenti
    if (!enableFiltering) return bomItems;
    
    // Cerca codici padre e figli se è specificato un filtro per codice
    let childCodes: string[] = [];
    let foundParentAtLevel = false;
    
    if (codeFilter && levelFilterValue !== undefined) {
      // Trova componenti al livello specificato che corrispondono al filtro
      const potentialParents = bomItems.filter((item: any) => 
        item.component && 
        item.level === levelFilterValue &&
        (codeFilterType === 'equals' 
          ? item.component.code.toLowerCase() === codeFilter.toLowerCase()
          : codeFilterType === 'startsWith'
          ? item.component.code.toLowerCase().startsWith(codeFilter.toLowerCase())
          : item.component.code.toLowerCase().includes(codeFilter.toLowerCase())
        )
      );
      
      if (potentialParents.length > 0) {
        console.log("🔍 Trovati componenti padre al livello", levelFilterValue, ":", potentialParents.map(p => p.component.code));
        foundParentAtLevel = true;
        
        // Per ogni componente padre al livello specificato, includi solo i figli al livello immediatamente successivo
        const maxAllowedLevel = levelFilterValue + 1;
        
        for (const parent of potentialParents) {
          // Aggiungi il padre stesso
          childCodes.push(parent.component.code);
          
          // Trova tutti i figli diretti e indiretti usando la funzione esistente
          const allChildren = findChildComponents(bomItems, parent.component.code);
          console.log(`Padre ${parent.component.code}: tutti i figli trovati:`, allChildren);
          
          // Filtra solo i figli al livello massimo consentito (livello padre + 1)
          const filteredChildren = bomItems
            .filter((item: any) => 
              item.component && 
              allChildren.includes(item.component.code) &&
              item.level <= maxAllowedLevel
            )
            .map((item: any) => item.component.code);
          
          console.log(`Padre ${parent.component.code}: figli al livello <= ${maxAllowedLevel}:`, filteredChildren);
          childCodes.push(...filteredChildren);
        }
        
        // Rimuovi duplicati
        childCodes = [...new Set(childCodes)];
        console.log(`Codici inclusi (livello ${levelFilterValue} + max ${maxAllowedLevel}):`, childCodes);
      }
    } else if (codeFilter) {
      // Logica originale per filtro solo codice (senza livello)
      const parentItem = bomItems.find((item: any) => 
        item.component && 
        item.component.code.toLowerCase() === codeFilter.toLowerCase()
      );
      
      if (parentItem) {
        console.log("Trovato codice padre:", parentItem.component.code);
        childCodes = findChildComponents(bomItems, parentItem.component.code);
        console.log("Codici inclusi nel ramo:", childCodes);
      }
    }
    
    // Applica filtri con logica gerarchica intelligente
    return bomItems.filter((item: any) => {
      if (!item || !item.component) return false;
      
      const code = item.component.code || '';
      const description = item.component.description || '';
      
      // Gestione speciale per filtro codice con logica gerarchica
      let codeMatch = true;  // Predefinito a true se non c'è filtro
      let isHierarchicalMatch = false;
      
      if (codeFilter) {
        if (childCodes.length > 0) {
          // Logica gerarchica: se abbiamo trovato figli, mostra padre + tutti i figli
          isHierarchicalMatch = childCodes.includes(code);
          codeMatch = isHierarchicalMatch;
        } else if (!foundParentAtLevel) {
          // Filtro normale per codice solo se non abbiamo trovato padre al livello
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
        } else {
          // Se abbiamo trovato padre al livello ma nessun figlio, non mostrare niente
          codeMatch = false;
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
      
      // Logica livello INTELLIGENTE:
      // Se siamo in modalità gerarchica (childCodes trovati), ignora il filtro livello
      // Se non siamo in modalità gerarchica, applica il filtro livello normalmente
      let levelMatch = true;
      if (levelFilterValue !== undefined && !isHierarchicalMatch) {
        // Applica filtro livello solo se NON siamo in modalità gerarchica
        levelMatch = item.level === levelFilterValue;
        console.log(`🔍 ${code}: levelMatch (${item.level} === ${levelFilterValue}) = ${levelMatch}`);
      } else if (levelFilterValue !== undefined && isHierarchicalMatch) {
        // In modalità gerarchica, accetta tutti i livelli dei componenti nel ramo
        levelMatch = true;
        console.log(`🔍 ${code}: levelMatch (gerarchica - accetta tutti i livelli) = ${levelMatch}`);
      }
      
      const finalResult = codeMatch && descriptionMatch && levelMatch;
      console.log(`🔍 ${code}: FINALE = ${finalResult} (code: ${codeMatch}, desc: ${descriptionMatch}, level: ${levelMatch}, gerarchica: ${isHierarchicalMatch})`);
      
      return finalResult;
    });
  }, [bomItems, codeFilter, codeFilterType, descriptionFilter, descriptionFilterType, levelFilterValue, enableFiltering, filterSettings]);

  // Aggiorna i filtri e notifica il componente padre
  useEffect(() => {
    if (onFilterUpdate) {
      // Estrai i codici dei componenti visualizzati per aggiungere ai filtri
      const visibleComponentCodes = filteredItems.map(item => item?.component?.code).filter(Boolean);
      
      // Debug: Log dei componenti filtrati
      console.log(`🔍 BomViewContent - Filtro: "${codeFilter}", Livello: ${levelFilterValue}, Componenti trovati:`, visibleComponentCodes);
      
      const newFilterSettings = {
        codeFilter,
        codeFilterType,
        descriptionFilter,
        descriptionFilterType,
        levelFilter: levelFilterValue,
        enableFiltering,
        filteredComponentCodes: visibleComponentCodes // Aggiungi i codici dei componenti filtrati
      };
      
      // Salva le impostazioni di filtro nel componente padre
      onFilterUpdate(newFilterSettings);
    }
  }, [codeFilter, codeFilterType, descriptionFilter, descriptionFilterType, levelFilterValue, enableFiltering, onFilterUpdate, filteredItems]);

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
        <h3 className="text-xl font-bold mb-2">
          {(() => {
            console.log("BomViewContent - Rendering titolo, translation:", translation);
            // Mostra il titolo tradotto se disponibile
            if (translation && translation.title && translation.title.trim() !== "") {
              console.log("BomViewContent - Usando titolo tradotto:", translation.title);
              return translation.title;
            } else {
              // Se la traduzione è richiesta ma manca, evidenzia il titolo in rosso
              if (highlightMissingTranslations && selectedLanguage) {
                console.log("BomViewContent - Evidenziando titolo mancante in rosso");
                return <span className="text-red-500">Elenco Componenti</span>;
              } else {
                console.log("BomViewContent - Usando titolo default");
                return "Elenco Componenti";
              }
            }
          })()}
        </h3>
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
                    {/* Debug della traduzione e dei suoi contenuti in modo visibile */}
                    {(() => {
                      console.log(
                        "Item:", item.component.code, 
                        "- Translation exists:", !!translation,
                        "- Descriptions exists:", !!(translation?.descriptions),
                        "- Has this code?", translation?.descriptions ? Object.keys(translation.descriptions).includes(item.component.code) : false,
                        "- Translation value:", translation?.descriptions ? translation.descriptions[item.component.code] : undefined
                      );
                      
                      // Controlla se la traduzione esiste e non è undefined/null per questo codice
                      const hasValidTranslation = translation?.descriptions && 
                        item.component.code in translation.descriptions && 
                        translation.descriptions[item.component.code] !== undefined && 
                        translation.descriptions[item.component.code] !== null && 
                        translation.descriptions[item.component.code] !== "";
                        
                      if (hasValidTranslation && translation?.descriptions) {
                        return translation.descriptions[item.component.code];
                      } else {
                        // Se la traduzione è richiesta ma manca, evidenzia il testo in rosso
                        return (highlightMissingTranslations && selectedLanguage)
                          ? <span className="text-red-500">{item.component.description}</span>
                          : item.component.description;
                      }
                    })()}
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
const getVisibleComponentCodes = (items: any[]): string[] => {
  if (!items || !Array.isArray(items)) return [];
  return items.map(item => item.component?.code).filter(Boolean);
};

export { getVisibleComponentCodes };
export default BomViewContent;