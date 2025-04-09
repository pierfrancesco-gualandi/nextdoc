import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
        // Qui assumiamo che esista un endpoint per ottenere le BOM associate a un documento
        // Se non esiste, dovremmo fare una query alle sezioni del documento e poi filtrare le BOM
        const response = await fetch(`/api/documents/${selectedDocumentId}/boms`);
        if (!response.ok) {
          // Alternativa: recuperare tutte le sezioni e i moduli, quindi filtrare per moduli di tipo BOM
          const sectionsResponse = await fetch(`/api/documents/${selectedDocumentId}/sections`);
          if (!sectionsResponse.ok) throw new Error("Errore nel recupero delle sezioni");
          
          const sections = await sectionsResponse.json();
          
          // Raccogliamo tutti gli ID delle sezioni
          const sectionIds = sections.map((section: any) => section.id);
          
          // Per ogni sezione, recuperiamo i moduli
          const modulesPromises = sectionIds.map((sectionId: number) => 
            fetch(`/api/sections/${sectionId}/modules`)
              .then(res => res.json())
              .catch(() => [])
          );
          
          const modulesBySection = await Promise.all(modulesPromises);
          
          // Filtriamo per moduli di tipo 'bom' e recuperiamo i bomId
          const bomModules = modulesBySection
            .flat()
            .filter((module: any) => module.type === 'bom' && module.content)
            .map((module: any) => {
              try {
                const content = typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
                return { bomId: content.bomId, sectionId: module.sectionId };
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);
          
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
    onSuccess: (data) => {
      toast({
        title: "Documento creato",
        description: "Il nuovo documento è stato creato con successo",
      });
      
      // Procediamo con la creazione delle sezioni e dei moduli
      createDocumentStructure(data.id);
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
      // 1. Recupera tutte le sezioni del documento sorgente
      const sectionsResponse = await fetch(`/api/documents/${selectedDocumentId}/sections`);
      if (!sectionsResponse.ok) throw new Error("Errore nel recupero delle sezioni");
      const sections = await sectionsResponse.json();
      
      // 2. Filtriamo le sezioni che contengono moduli BOM con i codici comuni
      // Prima recuperiamo tutti i moduli per ogni sezione
      const sectionModulesMap = new Map();
      for (const section of sections) {
        const modulesResponse = await fetch(`/api/sections/${section.id}/modules`);
        if (modulesResponse.ok) {
          const modules = await modulesResponse.json();
          sectionModulesMap.set(section.id, modules);
        }
      }
      
      // 3. Mappa per tenere traccia degli ID vecchi -> nuovi delle sezioni
      const sectionIdMap = new Map();
      
      // 4. Crea le nuove sezioni nel nuovo documento, in ordine per gestire le relazioni di gerarchia
      const sortedSections = [...sections].sort((a, b) => {
        // Ordina per parentId (null prima) e poi per ordine
        if (a.parentId === null && b.parentId !== null) return -1;
        if (a.parentId !== null && b.parentId === null) return 1;
        return a.order - b.order;
      });
      
      for (const section of sortedSections) {
        // Controlla se la sezione contiene moduli BOM associati ai codici comuni
        const modules = sectionModulesMap.get(section.id) || [];
        
        // Trova moduli BOM e verifica se sono associati ai codici comuni
        const bomModules = modules.filter((module: any) => {
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
        
        // Crea una nuova sezione nel nuovo documento
        const newSectionData = {
          documentId: newDocumentId,
          title: section.title,
          description: section.description,
          order: section.order,
          parentId: section.parentId ? sectionIdMap.get(section.parentId) : null,
          isModule: section.isModule
        };
        
        const newSectionResponse = await apiRequest('POST', '/api/sections', newSectionData);
        if (!newSectionResponse.ok) throw new Error("Errore nella creazione della sezione");
        
        const newSection = await newSectionResponse.json();
        sectionIdMap.set(section.id, newSection.id);
        
        // Duplica tutti i moduli della sezione, aggiornando quelli BOM con la nuova BOM
        for (const module of modules) {
          try {
            let moduleContent = typeof module.content === 'string' 
              ? JSON.parse(module.content) 
              : module.content;
            
            // Se è un modulo BOM, aggiorna il riferimento alla BOM target
            if (module.type === 'bom' && moduleContent.bomId === parseInt(selectedSourceBomId)) {
              moduleContent.bomId = parseInt(selectedTargetBomId);
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
        
        // Recupera e copia le traduzioni delle sezioni
        try {
          const sectionTranslationsResponse = await fetch(`/api/section-translations?sectionId=${section.id}`);
          if (sectionTranslationsResponse.ok) {
            const translations = await sectionTranslationsResponse.json();
            
            for (const translation of translations) {
              const newTranslationData = {
                sectionId: newSection.id,
                languageId: translation.languageId,
                title: translation.title,
                description: translation.description,
                status: translation.status
              };
              
              await apiRequest('POST', '/api/section-translations', newTranslationData);
            }
          }
        } catch (e) {
          console.error("Errore nella copia delle traduzioni della sezione:", e);
        }
      }
      
      toast({
        title: "Documento creato",
        description: "Il nuovo documento è stato creato con successo. Ora puoi accedervi dalla dashboard.",
      });
      
      setShowNewDocumentDialog(false);
    } catch (error) {
      console.error("Errore nella creazione della struttura del documento:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante la creazione della struttura del documento: ${error}`,
        variant: "destructive",
      });
    }
  };
  
  // Calcola lo stato di avanzamento del confronto
  const getComparisonSummary = () => {
    if (!comparisonResult) return null;
    
    const { commonCodes = [], targetItems = [] } = comparisonResult;
    
    // Calcola i codici unici dalla target BOM (non presenti nei codici comuni)
    const nonAssociatedCodes = targetItems
      .filter((item: any) => !commonCodes.includes(item.code))
      .map((item: any) => ({
        code: item.code,
        description: item.description,
        level: item.level,
        quantity: item.quantity
      }));
    
    const totalTargetCodes = targetItems?.length || 0;
    const uniqueCodesCount = nonAssociatedCodes.length;
    const commonCodesCount = commonCodes.length;
    
    // Calcola la percentuale di corrispondenza (quanti codici sono comuni rispetto al totale)
    const matchPercentage = totalTargetCodes > 0 
      ? Math.round((commonCodesCount / totalTargetCodes) * 100) 
      : 0;
    
    console.log("Calcolo percentuale:", { 
      commonCodesCount, 
      totalTargetCodes, 
      uniqueCodesCount,
      matchPercentage,
      nonAssociatedCodesCount: nonAssociatedCodes.length 
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
                  {/* Selezione documento */}
                  <div className="space-y-2">
                    <Label htmlFor="document-select">Documento di riferimento</Label>
                    <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                      <SelectTrigger id="document-select">
                        <SelectValue placeholder="Seleziona un documento" />
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
                  
                  {/* Selezione BOM sorgente (dal documento) */}
                  <div className="space-y-2">
                    <Label htmlFor="source-bom-select">Distinta Base di Origine</Label>
                    <Select 
                      value={selectedSourceBomId} 
                      onValueChange={setSelectedSourceBomId}
                      disabled={!selectedDocumentId || !documentBoms?.length}
                    >
                      <SelectTrigger id="source-bom-select">
                        <SelectValue placeholder="Seleziona una distinta base dal documento" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentBoms?.map(bom => (
                          <SelectItem key={bom.id} value={bom.id.toString()}>
                            {bom.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedDocumentId && (!documentBoms || documentBoms.length === 0) && (
                      <p className="text-red-500 text-sm mt-1">
                        Nessuna distinta base trovata per questo documento
                      </p>
                    )}
                  </div>
                  
                  {/* Selezione BOM target (tra tutte le BOM) */}
                  <div className="space-y-2">
                    <Label htmlFor="target-bom-select">Nuova Distinta Base</Label>
                    <Select 
                      value={selectedTargetBomId} 
                      onValueChange={setSelectedTargetBomId}
                      disabled={!allBoms?.length}
                    >
                      <SelectTrigger id="target-bom-select">
                        <SelectValue placeholder="Seleziona la nuova distinta base" />
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
                </CardContent>
                
                <CardFooter className="flex justify-end">
                  <Button 
                    onClick={compareBoms}
                    disabled={!selectedSourceBomId || !selectedTargetBomId}
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
                              <p className="text-2xl font-semibold">{summary.totalTargetCodes}</p>
                            </div>
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Codici Comuni</p>
                              <p className="text-2xl font-semibold">{summary.commonCodesCount}</p>
                            </div>
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Codici Non Associati</p>
                              <p className="text-2xl font-semibold text-amber-700">{summary.uniqueCodesCount}</p>
                            </div>
                            <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                              <p className="text-sm text-neutral-medium">Percentuale di Corrispondenza</p>
                              <p className="text-2xl font-semibold">{summary.matchPercentage}%</p>
                            </div>
                          </div>
                          
                          {summary.uniqueCodesCount > 0 && (
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
                                    I seguenti {summary.uniqueCodesCount} componenti sono presenti solo nella nuova distinta base
                                    e non hanno associazioni nella distinta originale:
                                  </p>
                                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {summary.nonAssociatedCodes?.slice(0, 9).map((item: any, index: number) => (
                                      <div key={index} className="px-3 py-2 bg-white border border-amber-200 rounded text-xs">
                                        <span className="font-medium">{item.code}</span>: {item.description}
                                      </div>
                                    ))}
                                    {summary.nonAssociatedCodes?.length > 9 && (
                                      <div className="px-3 py-2 bg-white border border-amber-200 rounded text-xs flex items-center justify-center">
                                        <span className="font-medium">+{summary.nonAssociatedCodes.length - 9} altri</span>
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
                          <TableCaption>Elenco dei codici nella nuova distinta base</TableCaption>
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
                            {comparisonResult.targetItems?.map((item: any) => {
                              const isCommon = comparisonResult.commonCodes?.includes(item.code);
                              
                              return (
                                <TableRow 
                                  key={item.id} 
                                  className={isCommon ? "" : "bg-amber-100 hover:bg-amber-200 font-medium"}
                                >
                                  <TableCell className={isCommon ? "" : "text-amber-700 font-medium"}>
                                    {item.code}
                                    {!isCommon && (
                                      <span className="inline-block ml-2 text-amber-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle">
                                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                          <path d="M12 9v4"></path><path d="M12 17h.01"></path>
                                        </svg>
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className={isCommon ? "" : "text-amber-700 font-medium"}>{item.description}</TableCell>
                                  <TableCell className={isCommon ? "" : "text-amber-700 font-medium"}>{item.level}</TableCell>
                                  <TableCell className={isCommon ? "" : "text-amber-700 font-medium"}>{item.quantity}</TableCell>
                                  <TableCell>
                                    {isCommon ? (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        Associato
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-200 text-amber-800 border border-amber-400">
                                        Non Associato
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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
                            >
                              Annulla
                            </Button>
                            <Button onClick={handleCreateDocument}>
                              Crea Documento
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