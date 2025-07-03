import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BomTreeView from "@/components/BomTreeView";
import BomExcelImporter from "@/components/BomExcelImporter";
import { Switch } from "@/components/ui/switch";
import { Trash } from "lucide-react";

interface BomManagementProps {
  toggleSidebar?: () => void;
}

export default function BomManagement({ toggleSidebar }: BomManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("boms");
  const [newBomTitle, setNewBomTitle] = useState("");
  const [newBomDescription, setNewBomDescription] = useState("");
  const [newComponentCode, setNewComponentCode] = useState("");
  const [newComponentDescription, setNewComponentDescription] = useState("");
  const [selectedBom, setSelectedBom] = useState<any>(null);
  const [selectedComponent, setSelectedComponent] = useState<any>(null);
  const [showTreeView, setShowTreeView] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch BOMs
  const { data: boms = [], isLoading: bomsLoading } = useQuery<any[]>({
    queryKey: ['/api/boms'],
  });
  
  // Fetch Components
  const { data: components = [], isLoading: componentsLoading } = useQuery<any[]>({
    queryKey: ['/api/components', searchQuery || ''],
    queryFn: async ({ queryKey }) => {
      const [base, query] = queryKey as [string, string];
      const url = query ? `${base}?q=${encodeURIComponent(query)}` : base;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch components');
      return await res.json();
    },
  });
  
  // Fetch BOM items when a BOM is selected
  const { data: bomItems = [], isLoading: bomItemsLoading } = useQuery<any[]>({
    queryKey: [`/api/boms/${selectedBom?.id}/items`],
    enabled: !!selectedBom,
  });
  
  // Create BOM mutation
  const createBomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/boms', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boms'] });
      setNewBomTitle("");
      setNewBomDescription("");
      toast({
        title: "Distinta creata",
        description: "La distinta base è stata creata con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Create Component mutation
  const createComponentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/components', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/components'] });
      setNewComponentCode("");
      setNewComponentDescription("");
      toast({
        title: "Componente creato",
        description: "Il componente è stato creato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Delete BOM mutation
  const deleteBomMutation = useMutation({
    mutationFn: async (bomId: number) => {
      const res = await apiRequest('DELETE', `/api/boms/${bomId}`);
      // La risposta è 204 No Content, quindi non c'è contenuto da analizzare
      if (res.status === 204) {
        return { success: true };
      }
      // Per altre risposte, prova a parsificare il JSON
      try {
        return await res.json();
      } catch (e) {
        return { success: false };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boms'] });
      setSelectedBom(null);
      toast({
        title: "Distinta eliminata",
        description: "La distinta base è stata eliminata con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Delete BOM item mutation
  const deleteBomItemMutation = useMutation({
    mutationFn: async (bomItemId: number) => {
      const res = await apiRequest('DELETE', `/api/bom-items/${bomItemId}`);
      // La risposta è 204 No Content, quindi non c'è contenuto da analizzare
      if (res.status === 204) {
        return { success: true };
      }
      // Per altre risposte, prova a parsificare il JSON
      try {
        return await res.json();
      } catch (e) {
        return { success: false };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boms/${selectedBom?.id}/items`] });
      toast({
        title: "Componente rimosso",
        description: "Il componente è stato rimosso dalla distinta base"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Add component to BOM mutation
  const addComponentToBomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/bom-items', data);
      try {
        return await res.json();
      } catch (e) {
        if (res.status === 201) {
          return { success: true };
        }
        throw new Error("Errore durante l'aggiunta del componente");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boms/${selectedBom?.id}/items`] });
      setSelectedComponent(null);
      toast({
        title: "Componente aggiunto",
        description: "Il componente è stato aggiunto alla distinta base"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Handle creating a new BOM
  const handleCreateBom = () => {
    if (!newBomTitle) {
      toast({
        title: "Errore",
        description: "Il titolo è obbligatorio",
        variant: "destructive"
      });
      return;
    }
    
    createBomMutation.mutate({
      title: newBomTitle,
      description: newBomDescription
    });
  };
  
  // Handle creating a new component
  const handleCreateComponent = () => {
    if (!newComponentCode || !newComponentDescription) {
      toast({
        title: "Errore",
        description: "Codice e descrizione sono obbligatori",
        variant: "destructive"
      });
      return;
    }
    
    createComponentMutation.mutate({
      code: newComponentCode,
      description: newComponentDescription,
      details: {}
    });
  };
  
  // Handle adding a component to a BOM
  const handleAddComponentToBom = () => {
    if (!selectedBom || !selectedComponent) {
      toast({
        title: "Errore",
        description: "Seleziona una distinta base e un componente",
        variant: "destructive"
      });
      return;
    }
    
    addComponentToBomMutation.mutate({
      bomId: selectedBom.id,
      componentId: selectedComponent.id,
      quantity: 1
    });
  };
  
  return (
    <>
      <Header title="Gestione Distinte Base" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header principale della pagina */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-neutral-darkest tracking-tight">Distinte Base</h1>
                <p className="text-lg text-neutral-medium">Gestisci componenti e distinte base per i tuoi progetti</p>
              </div>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="boms">Distinte</TabsTrigger>
                <TabsTrigger value="components">Componenti</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="boms">
              <div className="flex flex-col gap-6">
                <BomExcelImporter onImportSuccess={(bomId) => {
                  const bom = boms.find((b: any) => b.id === bomId);
                  if (bom) setSelectedBom(bom);
                }} />
                
                <div className="flex gap-6">
                {/* Left column: BOMs list */}
                <div className="w-1/3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Distinte Base</CardTitle>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <span className="material-icons text-sm mr-1">add</span>
                            Nuova
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Crea Nuova Distinta Base</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div>
                              <Label htmlFor="bom-title">Titolo</Label>
                              <Input 
                                id="bom-title" 
                                value={newBomTitle}
                                onChange={(e) => setNewBomTitle(e.target.value)}
                                placeholder="Es. RC100 - Pannello Controllo"
                              />
                            </div>
                            <div>
                              <Label htmlFor="bom-description">Descrizione</Label>
                              <Input 
                                id="bom-description"
                                value={newBomDescription}
                                onChange={(e) => setNewBomDescription(e.target.value)}
                                placeholder="Descrizione opzionale"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleCreateBom}>Crea Distinta</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {bomsLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse">
                              <div className="h-10 bg-neutral-light rounded-md"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {boms && boms.length > 0 ? (
                            boms.map((bom: any) => (
                              <Card 
                                key={bom.id} 
                                className={`cursor-pointer hover:bg-neutral-lightest ${selectedBom?.id === bom.id ? 'border-primary' : ''}`}
                                onClick={() => setSelectedBom(bom)}
                              >
                                <CardContent className="p-3 flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">{bom.title}</div>
                                    {bom.description && (
                                      <div className="text-sm text-neutral-dark">{bom.description}</div>
                                    )}
                                  </div>
                                  {selectedBom?.id === bom.id && (
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
                                          <AlertDialogTitle>Elimina distinta base</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Sei sicuro di voler eliminare questa distinta base e tutti i suoi componenti? 
                                            Questa azione non può essere annullata.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                                          <AlertDialogAction 
                                            className="bg-red-500 hover:bg-red-600"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteBomMutation.mutate(bom.id);
                                            }}
                                          >
                                            Elimina
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="text-center py-4 text-neutral-medium">
                              Nessuna distinta base disponibile
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Right column: BOM details */}
                <div className="w-2/3">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {selectedBom ? selectedBom.title : "Seleziona una distinta base"}
                      </CardTitle>
                      {selectedBom && (
                        <CardDescription>{selectedBom.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {!selectedBom ? (
                        <div className="text-center py-12 text-neutral-medium">
                          Seleziona una distinta base per visualizzare i componenti
                        </div>
                      ) : bomItemsLoading ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-10 bg-neutral-light rounded-md"></div>
                          <div className="h-10 bg-neutral-light rounded-md"></div>
                          <div className="h-10 bg-neutral-light rounded-md"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">Componenti</h3>
                              <div className="flex items-center ml-6">
                                <Label htmlFor="view-type" className="mr-2 text-sm">
                                  Vista Albero
                                </Label>
                                <Switch
                                  id="view-type"
                                  checked={showTreeView}
                                  onCheckedChange={setShowTreeView}
                                />
                              </div>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm">
                                  <span className="material-icons text-sm mr-1">add</span>
                                  Aggiungi componente
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Aggiungi Componente</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="relative">
                                    <Input
                                      placeholder="Cerca componenti..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="pl-10"
                                    />
                                    <span className="material-icons absolute left-3 top-2 text-neutral-medium">search</span>
                                  </div>
                                  
                                  <div className="h-60 overflow-y-auto border rounded-md">
                                    {componentsLoading ? (
                                      <div className="p-4 text-center">Caricamento componenti...</div>
                                    ) : components && components.length > 0 ? (
                                      <div className="divide-y">
                                        {components.map((component: any) => (
                                          <div 
                                            key={component.id} 
                                            className={`p-2 cursor-pointer hover:bg-neutral-lightest ${selectedComponent?.id === component.id ? 'bg-primary bg-opacity-10' : ''}`}
                                            onClick={() => setSelectedComponent(component)}
                                          >
                                            <div className="font-medium">{component.code}</div>
                                            <div className="text-sm text-neutral-dark">{component.description}</div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-4 text-center text-neutral-medium">
                                        Nessun componente trovato
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleAddComponentToBom} disabled={!selectedComponent}>
                                    Aggiungi
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                          
                          {showTreeView ? (
                            <BomTreeView 
                              bomItems={bomItems} 
                              title="" 
                              className="border-0 shadow-none" 
                              editable={true}
                              onItemClick={(item) => {
                                toast({
                                  title: "Componente selezionato",
                                  description: `${item.code} - ${item.description}`
                                });
                              }}
                              onToggleExpand={(item, expanded) => {
                                console.log(`Componente ${item.code} ${expanded ? 'espanso' : 'compresso'}`);
                              }}
                              onDeleteItem={(item) => {
                                deleteBomItemMutation.mutate(item.id);
                              }}
                            />
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Codice</TableHead>
                                  <TableHead>Descrizione</TableHead>
                                  <TableHead>Quantità</TableHead>
                                  <TableHead className="w-[100px]">Azioni</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bomItems && bomItems.length > 0 ? (
                                  bomItems.map((item: any) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{item.component?.code}</TableCell>
                                      <TableCell>{item.component?.description}</TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => deleteBomItemMutation.mutate(item.id)}
                                        >
                                          <span className="material-icons text-sm">delete</span>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-neutral-medium">
                                      Nessun componente in questa distinta
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="components">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Componenti</CardTitle>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Input
                        placeholder="Cerca componenti..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <span className="material-icons absolute left-3 top-2 text-neutral-medium">search</span>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <span className="material-icons text-sm mr-1">add</span>
                          Nuovo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crea Nuovo Componente</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div>
                            <Label htmlFor="component-code">Codice</Label>
                            <Input 
                              id="component-code" 
                              value={newComponentCode}
                              onChange={(e) => setNewComponentCode(e.target.value)}
                              placeholder="Es. RC100-BASE"
                            />
                          </div>
                          <div>
                            <Label htmlFor="component-description">Descrizione</Label>
                            <Input 
                              id="component-description"
                              value={newComponentDescription}
                              onChange={(e) => setNewComponentDescription(e.target.value)}
                              placeholder="Es. Base pannello in alluminio"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreateComponent}>Crea Componente</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codice</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead className="w-[100px]">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {componentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            Caricamento componenti...
                          </TableCell>
                        </TableRow>
                      ) : components && components.length > 0 ? (
                        components.map((component: any) => (
                          <TableRow key={component.id}>
                            <TableCell className="font-medium">{component.code}</TableCell>
                            <TableCell>{component.description}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <span className="material-icons text-sm">edit</span>
                              </Button>
                              <Button variant="ghost" size="sm">
                                <span className="material-icons text-sm">delete</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-neutral-medium">
                            {searchQuery ? 
                              `Nessun risultato per "${searchQuery}"` : 
                              "Nessun componente disponibile"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
