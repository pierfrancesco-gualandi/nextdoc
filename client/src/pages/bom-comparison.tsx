import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
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
      
      const data = await response.json();
      setComparisonResult(data);
      
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
    
    createDocumentMutation.mutate({
      title: newDocumentTitle,
      description: `Documento creato dal confronto tra le distinte base #${selectedSourceBomId} e #${selectedTargetBomId}`,
      status: "draft"
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
    
    const { commonCodes, uniqueTargetCodes, targetItems } = comparisonResult;
    const totalTargetCodes = targetItems.length;
    const matchPercentage = Math.round((commonCodes.length / totalTargetCodes) * 100);
    
    return {
      totalTargetCodes,
      commonCodesCount: commonCodes.length,
      uniqueCodesCount: uniqueTargetCodes.length,
      matchPercentage
    };
  };
  
  const summary = getComparisonSummary();
  
  return (
    <>
      <Header title="Confronto Distinte Base" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="container mx-auto">
          <Tabs defaultValue="compare" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="compare">Confronto</TabsTrigger>
              <TabsTrigger value="result" disabled={!comparisonResult}>Risultati</TabsTrigger>
            </TabsList>
            
            <TabsContent value="compare">
              <Card>
                <CardHeader>
                  <CardTitle>Seleziona le Distinte Base da Confrontare</CardTitle>
                  <CardDescription>
                    Seleziona un documento e le distinte base per il confronto
                  </CardDescription>
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
            
            <TabsContent value="result">
              {comparisonResult && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risultato del Confronto</CardTitle>
                      <CardDescription>
                        Confronto tra la distinta base originale e la nuova distinta base
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      {summary && (
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
                            <p className="text-2xl font-semibold">{summary.uniqueCodesCount}</p>
                          </div>
                          <div className="p-4 bg-neutral-lightest rounded-lg border border-neutral-light">
                            <p className="text-sm text-neutral-medium">Percentuale di Corrispondenza</p>
                            <p className="text-2xl font-semibold">{summary.matchPercentage}%</p>
                          </div>
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
                            {comparisonResult.targetItems.map((item: any) => {
                              const isCommon = comparisonResult.commonCodes.includes(item.code);
                              
                              return (
                                <TableRow 
                                  key={item.id} 
                                  className={isCommon ? "" : "bg-yellow-50 hover:bg-yellow-100"}
                                >
                                  <TableCell>{item.code}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell>{item.level}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>
                                    {isCommon ? (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        Associato
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
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
                                comuni tra le due distinte base. I codici non associati saranno evidenziati
                                nella nuova distinta base.
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