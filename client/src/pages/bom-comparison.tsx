import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import { DownloadGuideButton } from "@/components/download-guide-button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BomComparisonProps {
  toggleSidebar?: () => void;
}

export default function BomComparison({ toggleSidebar }: BomComparisonProps) {
  const { toast } = useToast();
  
  // Stati per le selezioni
  const [tabState, setTabState] = useState<string>("compare");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedSourceBomId, setSelectedSourceBomId] = useState<string>("");
  const [selectedTargetBomId, setSelectedTargetBomId] = useState<string>("");
  const [newDocumentTitle, setNewDocumentTitle] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false);
  
  // Query per ottenere i documenti
  const { data: documents } = useQuery<any[]>({
    queryKey: ['/api/documents'],
  });
  
  // Query per ottenere tutte le BOM
  const { data: allBoms } = useQuery<any[]>({
    queryKey: ['/api/boms'],
  });

  // Query per ottenere le BOM associate al documento selezionato
  const { data: documentBoms } = useQuery<any[]>({
    queryKey: ['/api/documents', selectedDocumentId, 'boms'],
    enabled: !!selectedDocumentId,
    queryFn: async () => {
      try {
        console.log(`Caricando BOM per documento ${selectedDocumentId}`);
        // Qui assumiamo che esista un endpoint per ottenere le BOM associate a un documento
        // Se non esiste, dovremmo fare una query alle sezioni del documento e poi filtrare le BOM
        const response = await fetch(`/api/documents/${selectedDocumentId}/boms`);
        if (!response.ok) {
          console.log(`Endpoint /api/documents/${selectedDocumentId}/boms non disponibile, uso logica alternativa`);
          // Alternativa: recuperare tutte le sezioni e i moduli, quindi filtrare per moduli di tipo BOM
          const sectionsResponse = await fetch(`/api/documents/${selectedDocumentId}/sections`);
          if (!sectionsResponse.ok) throw new Error("Errore nel recupero delle sezioni");
          
          const sections = await sectionsResponse.json();
          console.log(`Trovate ${sections.length} sezioni nel documento ${selectedDocumentId}:`, sections.map(s => s.title));
          
          // Raccogliamo tutti gli ID delle sezioni
          const sectionIds = sections.map((section: any) => section.id);
          
          // Per ogni sezione, recuperiamo i moduli
          const modulesPromises = sectionIds.map((sectionId: number) => 
            fetch(`/api/sections/${sectionId}/modules`)
              .then(res => res.json())
              .catch(() => [])
          );
          
          const modulesBySection = await Promise.all(modulesPromises);
          
          console.log(`Moduli trovati in tutte le sezioni:`, modulesBySection.flat());
          
          // Filtriamo per moduli di tipo 'bom' e recuperiamo i bomId
          const bomModules = modulesBySection
            .flat()
            .filter((module: any) => {
              console.log(`Checking module tipo ${module.type}, content:`, module.content);
              return module.type === 'bom' && module.content;
            })
            .map((module: any) => {
              try {
                const content = typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
                console.log(`Modulo BOM trovato con bomId: ${content.bomId}`);
                return { bomId: content.bomId, sectionId: module.sectionId };
              } catch (e) {
                console.error(`Errore parsing contenuto modulo BOM:`, e);
                return null;
              }
            })
            .filter(Boolean);
          
          console.log(`Moduli BOM estratti:`, bomModules);
          
          // Recuperiamo i dettagli delle BOM - evitando l'uso di Set
          const bomIdsMap: {[key: number]: boolean} = {};
          bomModules.forEach((bom: any) => {
            if (bom && bom.bomId) {
              bomIdsMap[bom.bomId] = true;
            }
          });
          const bomIds = Object.keys(bomIdsMap).map(id => parseInt(id));
          const bomsPromises = bomIds.map((bomId: number) => 
            fetch(`/api/boms/${bomId}`)
              .then(res => res.json())
              .catch(() => null)
          );
          
          const boms = (await Promise.all(bomsPromises)).filter(Boolean);
          return boms;
        }
        
        return await response.json();
      } catch (error) {
        console.error("Errore nel recupero delle BOM del documento:", error);
        return [];
      }
    }
  });
  
  // Confronta le BOM selezionate
  const compareBoms = async () => {
    if (!selectedSourceBomId || !selectedTargetBomId) {
      toast({
        title: "Errore",
        description: "Seleziona entrambe le distinte base per il confronto",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Utilizziamo l'endpoint esistente per il confronto
      const response = await fetch(`/api/boms/${selectedSourceBomId}/compare/${selectedTargetBomId}`);
      
      if (!response.ok) {
        // Se l'endpoint non esiste, facciamo un confronto manuale
        const sourceBomResponse = await fetch(`/api/boms/${selectedSourceBomId}/items`);
        const targetBomResponse = await fetch(`/api/boms/${selectedTargetBomId}/items`);
        
        if (!sourceBomResponse.ok || !targetBomResponse.ok) {
          throw new Error("Errore nel recupero degli elementi delle distinte base");
        }
        
        const sourceBomItems = await sourceBomResponse.json();
        const targetBomItems = await targetBomResponse.json();
        
        // Mappatura degli elementi per codice
        const sourceItemsByCode = sourceBomItems.reduce((acc: any, item: any) => {
          acc[item.code] = item;
          return acc;
        }, {});
        
        const targetItemsByCode = targetBomItems.reduce((acc: any, item: any) => {
          acc[item.code] = item;
          return acc;
        }, {});
        
        // Trova i codici comuni e unici
        const commonCodes = Object.keys(targetItemsByCode).filter(code => 
          sourceItemsByCode[code] !== undefined
        );
        
        const uniqueTargetCodes = Object.keys(targetItemsByCode).filter(code => 
          sourceItemsByCode[code] === undefined
        );
        
        // Crea il risultato del confronto
        const comparisonResult = {
          sourceItems: sourceBomItems,
          targetItems: targetBomItems,
          commonCodes,
          uniqueTargetCodes,
          sourceBomId: parseInt(selectedSourceBomId),
          targetBomId: parseInt(selectedTargetBomId)
        };
        
        setComparisonResult(comparisonResult);
        return;
      }
      
      let data = await response.json();
      
      // Recupera gli elementi completi della BOM target
      console.log("Recupero elementi completi della target BOM");
      const targetBomResponse = await fetch(`/api/boms/${selectedTargetBomId}/items`);
      const targetItems = targetBomResponse.ok ? await targetBomResponse.json() : [];
      
      console.log(`Recuperati ${targetItems.length} elementi della BOM target`);
      
      // Hack: Se l'array commonCodes è null ma ci sono similarities,
      // generiamo l'array dei codici comuni dalle similarities
      if (data.similarities && data.similarities.length > 0) {
        console.log("Ricostruzione dell'array commonCodes dalle similarities");
        
        // Estrai i codici dalle similarities con somiglianza al 100%
        const extractedCommonCodes = data.similarities
          .filter((sim: any) => sim.similarity === 100)
          .map((sim: any) => {
            const code = sim.item2?.component?.code;
            console.log(`Aggiunto codice comune: ${code} (similarità 100%)`);
            return code;
          })
          .filter(Boolean);
        
        console.log(`Trovati ${extractedCommonCodes.length} codici comuni dalle similarities`);
        
        // Prepara i dati completi
        data = {
          ...data,
          commonCodes: extractedCommonCodes,
          targetItems: targetItems
        };
      }
      
      setComparisonResult(data);
      
      // Passa automaticamente alla scheda Risultati
      setTabState("results");
      
      toast({
        title: "Confronto completato",
        description: "Il confronto tra le distinte base è stato completato con successo",
      });
    } catch (error) {
      console.error("Errore durante il confronto:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante il confronto: ${error}`,
        variant: "destructive",
      });
    }
  };
  
  // Mutation per creare un nuovo documento
  const createDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/documents', data);
      return await response.json();
    },
    onSuccess: async (data) => {
      try {
        // Procediamo con la creazione delle sezioni e dei moduli
        await createDocumentStructure(data.id);
        
        // Aggiorna la dashboard per mostrare il nuovo documento
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        
        toast({
          title: "Documento creato",
          description: "Il nuovo documento è stato creato con successo. Ora puoi accedervi dalla dashboard.",
        });
        
        setShowNewDocumentDialog(false);
      } catch (error) {
        toast({
          title: "Errore",
          description: `Si è verificato un errore durante la creazione della struttura del documento: ${error}`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante la creazione del documento: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Funzione per creare il nuovo documento e la sua struttura
  const handleCreateDocument = () => {
    if (!newDocumentTitle) {
      toast({
        title: "Errore",
        description: "Inserisci un titolo per il nuovo documento",
        variant: "destructive",
      });
      return;
    }
    
    // Creiamo il documento con tutti i campi richiesti dallo schema
    createDocumentMutation.mutate({
      title: newDocumentTitle,
      description: `Documento creato dal confronto tra le distinte base #${selectedSourceBomId} e #${selectedTargetBomId}`,
      status: "draft",
      createdById: 1, // ID utente predefinito
      updatedById: 1, // Anche questo è obbligatorio
      visibility: "public" // Campo obbligatorio secondo lo schema
    });
  };
  
  // Funzione per duplicare la struttura del documento
  const createDocumentStructure = async (newDocumentId: number) => {
    try {
      console.log("Inizio processo di creazione documento da confronto BOM");
      
      // Recuperiamo i codici comuni
      const { commonCodes = [] } = comparisonResult || {};
      console.log("Codici comuni tra le distinte:", commonCodes);
      
      if (!commonCodes?.length) {
        throw new Error("Nessun codice comune trovato tra le distinte base");
      }
      
      // 1. Recupera tutte le sezioni del documento sorgente
      const sectionsResponse = await fetch(`/api/documents/${selectedDocumentId}/sections`);
      if (!sectionsResponse.ok) throw new Error("Errore nel recupero delle sezioni");
      const sections = await sectionsResponse.json();
      console.log(`Recuperate ${sections.length} sezioni dal documento originale`);
      
      // 2. Recuperiamo tutti i moduli di tutte le sezioni e i loro componenti associati
      const sectionModulesMap = new Map();
      const sectionComponentsMap = new Map();
      const sectionWithComponentMap = new Map();
      
      // Crea una mappa di componenti per codice per rapida ricerca
      const componentCodeMap: {[key: string]: any} = {};
      
      // Prima recuperiamo i componenti associati alle sezioni
      for (const section of sections) {
        const componentsResponse = await fetch(`/api/sections/${section.id}/components`);
        if (componentsResponse.ok) {
          const components = await componentsResponse.json();
          sectionComponentsMap.set(section.id, components);
          
          // Marca le sezioni che hanno componenti con codici comuni
          const hasCommonComponents = components.some((comp: any) => 
            comp.component && commonCodes.includes(comp.component.code)
          );
          
          if (hasCommonComponents) {
            sectionWithComponentMap.set(section.id, true);
            console.log(`Sezione ${section.id} (${section.title}) ha componenti comuni`);
          }
          
          // Aggiungi i componenti alla mappa per codice
          for (const comp of components) {
            if (comp.component && comp.component.code) {
              componentCodeMap[comp.component.code] = comp.component;
            }
          }
        }
        
        // Recupera anche i moduli della sezione
        const modulesResponse = await fetch(`/api/sections/${section.id}/modules`);
        if (modulesResponse.ok) {
          const modules = await modulesResponse.json();
          sectionModulesMap.set(section.id, modules);
          
          // Marca le sezioni che hanno moduli BOM con riferimento alla distinta sorgente
          const hasBomModule = modules.some((module: any) => {
            if (module.type !== 'bom') return false;
            
            try {
              const content = typeof module.content === 'string' 
                ? JSON.parse(module.content) 
                : module.content;
                
              return content.bomId === parseInt(selectedSourceBomId);
            } catch (e) {
              return false;
            }
          });
          
          if (hasBomModule) {
            sectionWithComponentMap.set(section.id, true);
            console.log(`Sezione ${section.id} (${section.title}) ha moduli BOM rilevanti`);
          }
        }
      }
      
      // 3. Costruisci un grafo delle sezioni e determina le dipendenze gerarchiche
      const sectionChildren = new Map();
      const rootSections = [];
      
      for (const section of sections) {
        if (!section.parentId) {
          rootSections.push(section);
        } else {
          if (!sectionChildren.has(section.parentId)) {
            sectionChildren.set(section.parentId, []);
          }
          sectionChildren.get(section.parentId).push(section);
        }
      }
      
      // 4. Funzione ricorsiva per verificare se una sezione ha associazioni dirette a componenti comuni
      // o se ha moduli BOM con riferimento alla distinta sorgente
      const shouldIncludeSection = (sectionId: number): boolean => {
        // Verifica diretta - deve avere componenti associati o moduli BOM specifici
        return sectionWithComponentMap.has(sectionId);
      };
      
      // 5. Mappa per tenere traccia degli ID vecchi -> nuovi delle sezioni
      const sectionIdMap = new Map();
      
      // 6. Funzione ricorsiva per creare la struttura gerarchica nel nuovo documento
      const createSectionHierarchy = async (section: any, parentId: number | null = null) => {
        // Se questa sezione o i suoi discendenti non contengono componenti comuni, salta
        if (!shouldIncludeSection(section.id)) {
          console.log(`Sezione ${section.id} (${section.title}) saltata: nessun componente comune`);
          return;
        }
        
        console.log(`Creando sezione ${section.id} (${section.title}) nel nuovo documento`);
        
        // Crea la sezione nel nuovo documento
        const newSectionData = {
          documentId: newDocumentId,
          title: section.title,
          content: section.content,
          order: section.order,
          parentId: parentId
        };
        
        const newSectionResponse = await apiRequest('POST', '/api/sections', newSectionData);
        if (!newSectionResponse.ok) throw new Error("Errore nella creazione della sezione");
        
        const newSection = await newSectionResponse.json();
        sectionIdMap.set(section.id, newSection.id);
        
        // Duplica i moduli, prestando attenzione a quelli BOM
        const modules = sectionModulesMap.get(section.id) || [];
        for (const module of modules) {
          try {
            let moduleContent = typeof module.content === 'string' 
              ? JSON.parse(module.content) 
              : module.content;
            
            // Se è un modulo BOM, aggiorna il riferimento alla BOM target
            if (module.type === 'bom') {
              if (moduleContent.bomId === parseInt(selectedSourceBomId)) {
                moduleContent.bomId = parseInt(selectedTargetBomId);
                console.log(`Aggiornato modulo BOM in sezione ${newSection.id}, bomId ${moduleContent.bomId} -> ${selectedTargetBomId}`);
              }
            }
            
            const newModuleData = {
              sectionId: newSection.id,
              type: module.type,
              content: JSON.stringify(moduleContent),
              order: module.order
            };
            
            await apiRequest('POST', '/api/modules', newModuleData);
          } catch (e) {
            console.error("Errore nella creazione del modulo:", e);
          }
        }
        
        // Copiamo i componenti originali della sezione che si trovano nei codici comuni
        const components = sectionComponentsMap.get(section.id) || [];
        
        // Copiamo i componenti del documento di origine che sono nei codici comuni
        for (const comp of components) {
          try {
            if (!comp.component || !comp.component.id) {
              console.error("Componente senza oggetto component o ID valido:", comp);
              continue;
            }
            
            const componentId = comp.component.id;
            const componentCode = comp.component.code;
            
            // Verifichiamo se il componente è nella lista dei codici comuni
            const isCommonCode = componentCode && commonCodes.includes(componentCode);
            
            if (isCommonCode) {
              const newComponentData = {
                sectionId: newSection.id,
                componentId: componentId,
                quantity: comp.quantity || 1,
                notes: comp.notes || null
              };
              
              console.log(`Tentativo di associare componente ${componentCode} (ID: ${componentId}) alla sezione ${newSection.id}`, newComponentData);
              
              const response = await apiRequest('POST', '/api/section-components', newComponentData);
              
              if (response.ok) {
                console.log(`SUCCESSO: Copiato componente comune ${componentCode} (ID ${componentId}) alla sezione ${newSection.id}`);
              } else {
                const errorText = await response.text();
                console.error(`Errore nell'assegnazione del componente: ${errorText}`);
              }
            } else {
              console.log(`Componente ${componentCode || 'senza codice'} non nei codici comuni, non copiato alla nuova sezione`);
            }
          } catch (e) {
            console.error("Errore nell'assegnazione del componente:", e);
          }
        }
        
        // Procedi ricorsivamente con i figli
        const children = sectionChildren.get(section.id) || [];
        for (const childSection of children) {
          await createSectionHierarchy(childSection, newSection.id);
        }
      };
      
      // 7. Crea la gerarchia partendo dalle sezioni radice
      for (const rootSection of rootSections) {
        await createSectionHierarchy(rootSection);
      }
      
    } catch (error) {
      console.error("Errore nella creazione della struttura del documento:", error);
      throw error;
    }
  };
  
  // Calcola lo stato di avanzamento del confronto
  const getComparisonSummary = () => {
    console.log("getComparisonSummary chiamata, comparisonResult:", comparisonResult);
    if (!comparisonResult || !comparisonResult.targetItems) {
      console.log("getComparisonSummary: dati insufficienti");
      return null;
    }

    // Usa i dati reali dalla comparisonResult
    const targetItems = comparisonResult.targetItems;
    const totalTargetCodes = targetItems.length;
    
    // Ricostruisce commonCodes dalle similarities con match perfetti (100%)
    const commonCodes: string[] = [];
    if (comparisonResult.similarities) {
      comparisonResult.similarities.forEach((similarity: any) => {
        if (similarity.similarity === 100) { // Solo match perfetti
          const code = similarity.item2?.code || similarity.item2?.component?.code;
          if (code && !commonCodes.includes(code)) {
            commonCodes.push(code);
          }
        }
      });
    }
    
    const commonCodesCount = commonCodes.length;
    const uniqueCodesCount = totalTargetCodes - commonCodesCount;
    
    // Trova i codici non associati (presenti nella target BOM ma non comuni)
    const nonAssociatedCodes = targetItems
      .filter((item: any) => {
        const itemCode = item.code || item.component?.code;
        return itemCode && !commonCodes.includes(itemCode);
      })
      .map((item: any) => ({
        id: item.id,
        code: item.code || item.component?.code,
        description: item.description || item.component?.description,
        level: item.level || 0,
        quantity: item.quantity || 1,
      }));
    
    // Calcola la percentuale di corrispondenza (quanti codici sono comuni rispetto al totale)
    const matchPercentage = totalTargetCodes > 0 ? Math.round((commonCodesCount / totalTargetCodes) * 100) : 0;
    
    console.log("Dati di riepilogo dinamici:", { 
      totalTargetCodes,
      commonCodesCount, 
      uniqueCodesCount,
      matchPercentage,
      nonAssociatedCodes: nonAssociatedCodes.slice(0, 3) // Solo primi 3 per debug
    });
    
    return {
      totalTargetCodes,
      commonCodesCount,
      uniqueCodesCount,
      matchPercentage,
      nonAssociatedCodes
    };
  };
  
  const summary = getComparisonSummary();
  
  // Debug per visualizzare la risposta completa
  console.log("Dati di confronto completi:", comparisonResult);
  console.log("Codici comuni trovati:", comparisonResult?.commonCodes);
  console.log("Summary calcolato:", summary);
  
  return (
    <>
      <Header title="Confronto Distinte Base" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="container mx-auto">
          <Tabs value={tabState} onValueChange={setTabState} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="compare">Confronto</TabsTrigger>
              <TabsTrigger 
                value="results" 
                disabled={!comparisonResult}
              >
                Risultati
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="compare">
              <Card>
                <CardHeader className="flex justify-between items-start">
                  <div>
                    <CardTitle>Seleziona le Distinte Base da Confrontare</CardTitle>
                    <CardDescription>
                      Seleziona un documento e le distinte base per il confronto
                    </CardDescription>
                  </div>
                  <DownloadGuideButton className="ml-4" />
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Selezione documento di riferimento */}
                  <div className="space-y-2">
                    <Label htmlFor="document-select">Documento di Riferimento</Label>
                    <Select 
                      value={selectedDocumentId} 
                      onValueChange={setSelectedDocumentId}
                    >
                      <SelectTrigger id="document-select">
                        <SelectValue placeholder="Seleziona il documento contenente la BOM di partenza" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents?.map(doc => (
                          <SelectItem key={doc.id} value={doc.id.toString()}>
                            {doc.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Selezione BOM sorgente */}
                    <div className="space-y-2">
                      <Label htmlFor="source-bom-select">Distinta Base di Origine</Label>
                      <Select 
                        value={selectedSourceBomId} 
                        onValueChange={setSelectedSourceBomId}
                        disabled={!selectedDocumentId}
                      >
                        <SelectTrigger id="source-bom-select">
                          <SelectValue placeholder="Seleziona la distinta di partenza" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentBoms?.map(bom => (
                            <SelectItem key={bom.id} value={bom.id.toString()}>
                              {bom.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Selezione BOM target */}
                    <div className="space-y-2">
                      <Label htmlFor="target-bom-select">Nuova Distinta Base</Label>
                      <Select 
                        value={selectedTargetBomId} 
                        onValueChange={setSelectedTargetBomId}
                        disabled={!allBoms?.length}
                      >
                        <SelectTrigger id="target-bom-select">
                          <SelectValue placeholder="Seleziona la nuova distinta da confrontare" />
                        </SelectTrigger>
                        <SelectContent>
                          {allBoms?.map(bom => (
                            <SelectItem key={bom.id} value={bom.id.toString()}>
                              {bom.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-end">
                  <Button 
                    onClick={compareBoms}
                    disabled={!selectedDocumentId || !selectedSourceBomId || !selectedTargetBomId}
                  >
                    Confronta Distinte Base
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="results">
              {comparisonResult && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="flex justify-between items-start">
                      <div>
                        <CardTitle>Risultato del Confronto</CardTitle>
                        <CardDescription>
                          Confronto tra la distinta base originale e la nuova distinta base
                        </CardDescription>
                      </div>
                      <DownloadGuideButton className="ml-4" />
                    </CardHeader>
                    
                    <CardContent>
                      {summary && (
                        <div className="space-y-6">
                          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Codici Totali (Target)</p>
                              <p className="text-2xl font-semibold">{summary?.totalTargetCodes}</p>
                            </div>
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Codici Comuni</p>
                              <p className="text-2xl font-semibold">{summary?.commonCodesCount}</p>
                            </div>
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Codici Non Associati</p>
                              <p className="text-2xl font-semibold text-amber-700">{summary?.uniqueCodesCount}</p>
                            </div>
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Percentuale di Corrispondenza</p>
                              <p className="text-2xl font-semibold">{summary?.matchPercentage}%</p>
                            </div>
                          </div>
                          
                          {summary?.uniqueCodesCount > 0 && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                              <div className="flex items-start space-x-2">
                                <span className="text-amber-500 mt-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                    <path d="M12 9v4"></path><path d="M12 17h.01"></path>
                                  </svg>
                                </span>
                                <div>
                                  <h4 className="text-amber-800 font-medium text-sm">Componenti Non Associati</h4>
                                  <p className="text-amber-700 text-sm mt-1">
                                    I seguenti {summary?.uniqueCodesCount} componenti sono presenti solo nella nuova distinta base
                                    e non hanno associazioni nella distinta originale:
                                  </p>
                                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {summary?.nonAssociatedCodes?.slice(0, 9).map((item: any, index: number) => (
                                      <div key={index} className="px-3 py-2 bg-white border border-amber-200 rounded text-xs">
                                        <span className="font-medium">{item.code}</span>: {item.description}
                                      </div>
                                    ))}
                                    {(summary?.nonAssociatedCodes?.length || 0) > 9 && (
                                      <div className="px-3 py-2 bg-white border border-amber-200 rounded text-xs flex items-center justify-center">
                                        <span className="font-medium">+{(summary?.nonAssociatedCodes?.length || 0) - 9} altri</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableCaption>Codici non associati nella nuova distinta base</TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Codice</TableHead>
                              <TableHead>Descrizione</TableHead>
                              <TableHead>Livello</TableHead>
                              <TableHead>Quantità</TableHead>
                              <TableHead>Stato</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Filtra e mostra solo i codici non associati */}
                            {summary?.nonAssociatedCodes?.map((item: any) => (
                              <TableRow 
                                key={item.id} 
                                className="bg-amber-100 hover:bg-amber-200 font-medium"
                              >
                                <TableCell className="text-amber-700 font-medium">
                                  {item.code}
                                  <span className="inline-block ml-2 text-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle">
                                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                      <path d="M12 9v4"></path><path d="M12 17h.01"></path>
                                    </svg>
                                  </span>
                                </TableCell>
                                <TableCell className="text-amber-700 font-medium">{item.description}</TableCell>
                                <TableCell className="text-amber-700 font-medium">{item.level}</TableCell>
                                <TableCell className="text-amber-700 font-medium">{item.quantity}</TableCell>
                                <TableCell>
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-200 text-amber-800 border border-amber-400">
                                    Non Associato
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-end">
                      <Dialog open={showNewDocumentDialog} onOpenChange={setShowNewDocumentDialog}>
                        <DialogTrigger asChild>
                          <Button>Crea Nuovo Documento</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Crea Nuovo Documento</DialogTitle>
                            <DialogDescription>
                              Inserisci un titolo per il nuovo documento basato sulla nuova distinta base.
                              Verranno copiate tutte le sezioni e i moduli associati ai codici comuni.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="document-title">Titolo del documento</Label>
                              <Input
                                id="document-title"
                                value={newDocumentTitle}
                                onChange={(e) => setNewDocumentTitle(e.target.value)}
                                placeholder="Inserisci il titolo del nuovo documento"
                              />
                            </div>
                            
                            <Alert>
                              <AlertTitle>Informazioni</AlertTitle>
                              <AlertDescription>
                                Il nuovo documento conterrà tutte le sezioni e i moduli associati ai codici
                                comuni tra le due distinte base. I codici non associati saranno chiaramente
                                evidenziati in arancione nella nuova distinta base, per permettere una facile
                                identificazione dei componenti che richiedono attenzione.
                              </AlertDescription>
                            </Alert>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setShowNewDocumentDialog(false)}
                              disabled={createDocumentMutation.isPending}
                            >
                              Annulla
                            </Button>
                            <Button 
                              onClick={handleCreateDocument}
                              disabled={createDocumentMutation.isPending || !newDocumentTitle.trim()}
                            >
                              {createDocumentMutation.isPending ? "Creazione in corso..." : "Crea Documento"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}