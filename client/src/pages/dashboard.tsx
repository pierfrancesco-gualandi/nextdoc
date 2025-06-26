import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDocumentStatus } from "@/lib/document-utils";
import { useOpenDocuments } from "@/App";
import { queryClient } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/contexts/UserContext";

interface DashboardProps {
  toggleSidebar?: () => void;
}

export default function Dashboard({ toggleSidebar }: DashboardProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const { selectedUser } = useUser();
  const { toast } = useToast();
  
  // Accesso al context per i documenti aperti
  const { openDocuments, addOpenDocument, removeOpenDocument, isDocumentOpen, getLastOpenDocument } = useOpenDocuments();
  
  // Al caricamento della dashboard, controlla se ci sono documenti aperti
  useEffect(() => {
    const lastOpenDocument = getLastOpenDocument();
    // Se c'è un documento aperto e siamo alla root o a /documents, naviga al documento
    if (lastOpenDocument && (window.location.pathname === '/' || window.location.pathname === '/documents')) {
      navigate(`/documents/${lastOpenDocument.id}`);
      console.log(`Navigazione automatica al documento aperto: ${lastOpenDocument.id}`);
    }
  }, []);
  
  // Debug: stampa i documenti aperti nel localStorage
  useEffect(() => {
    console.log('Dashboard - Documenti aperti:', openDocuments);
    try {
      const savedDocs = localStorage.getItem('openDocuments');
      console.log('Dashboard - Documenti nel localStorage:', savedDocs);
      
      // Se abbiamo documenti nel localStorage ma non nel contesto, aggiungiamoli
      const storedDocs = JSON.parse(savedDocs || '[]');
      if (storedDocs.length > 0 && openDocuments.length === 0) {
        console.log('Ripristino documenti aperti dal localStorage:', storedDocs);
        storedDocs.forEach((doc: any) => {
          addOpenDocument({
            id: doc.id,
            title: doc.title
          });
        });
      }
    } catch (error) {
      console.error('Errore nel leggere i documenti dal localStorage:', error);
    }
  }, []);
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents', searchQuery, selectedUser?.id],
    queryFn: async ({ queryKey }) => {
      const [_, query, userId] = queryKey;
      let url = '/api/documents';
      const params = new URLSearchParams();
      
      if (query) {
        params.append('q', query);
      }
      if (userId) {
        params.append('userId', userId.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return await res.json();
    },
    enabled: !!selectedUser, // Only run query when user is selected
  });
  
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete document');
      return id;
    },
    onSuccess: (id) => {
      // Aggiorna la cache dopo l'eliminazione
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Se il documento era aperto, rimuoverlo dalla lista
      if (isDocumentOpen(id)) {
        removeOpenDocument(id);
      }
      
      toast({
        title: "Documento eliminato",
        description: "Il documento è stato eliminato con successo",
        variant: "default",
      });
      
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il documento: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCreateNew = () => {
    navigate('/documents/new');
  };
  
  const handleOpenDocument = (doc: any) => {
    // Aggiungi il documento al contesto
    addOpenDocument({
      id: doc.id,
      title: doc.title
    });
    
    // Naviga al documento
    navigate(`/documents/${doc.id}`);
  };
  
  const confirmDeleteDocument = (doc: any) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDocument = () => {
    if (documentToDelete) {
      deleteDocumentMutation.mutate(documentToDelete.id);
    }
  };
  
  return (
    <>
      <Header title="Dashboard" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header principale della pagina */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-neutral-darkest tracking-tight">I tuoi documenti</h1>
                <p className="text-lg text-neutral-medium">Gestisci e crea documenti di istruzioni visive</p>
              </div>
              <Button onClick={handleCreateNew} size="lg" className="mt-2">
                <span className="material-icons text-sm mr-2">add</span>
                Nuovo Documento
              </Button>
            </div>
          </div>
          
          {/* Visualizza i documenti aperti se presenti */}
          {openDocuments.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-neutral-dark mb-3">Documenti Aperti</h2>
              <div className="bg-white rounded-md shadow">
                <div className="grid gap-1 p-2">
                  {openDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-neutral-50">
                      <Link href={`/documents/${doc.id}`} className="text-blue-600 hover:underline truncate flex-1">
                        {doc.title}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-neutral-medium hover:text-red-500"
                        onClick={(e) => {
                          e.preventDefault();
                          removeOpenDocument(doc.id);
                        }}
                      >
                        <span className="material-icons text-sm">close</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <Tabs defaultValue="grid" className="mb-6">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="grid">
                  <span className="material-icons text-sm mr-1">grid_view</span> Griglia
                </TabsTrigger>
                <TabsTrigger value="list">
                  <span className="material-icons text-sm mr-1">view_list</span> Lista
                </TabsTrigger>
              </TabsList>
              
              <div className="relative w-64">
                <Input
                  className="pl-10"
                  placeholder="Cerca per titolo o descrizione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="material-icons absolute left-3 top-2.5 text-neutral-medium">search</span>
              </div>
            </div>
            
            <TabsContent value="grid" className="mt-4">
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-5 bg-neutral-light rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-neutral-light rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-4 bg-neutral-light rounded w-full mb-2"></div>
                        <div className="h-4 bg-neutral-light rounded w-3/4"></div>
                      </CardContent>
                      <CardFooter>
                        <div className="h-8 bg-neutral-light rounded w-full"></div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {documents && documents.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {documents.map((doc: any) => {
                        const statusDisplay = formatDocumentStatus(doc.status);
                        return (
                          <Card key={doc.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{doc.title}</CardTitle>
                                <span className={`status-badge ${statusDisplay?.bgClass || 'bg-gray-100 text-gray-800'}`}>
                                  {statusDisplay?.label || doc.status}
                                </span>
                              </div>
                              <CardDescription>
                                Versione {doc.version}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-neutral-dark line-clamp-2">
                                {doc.description || "Nessuna descrizione disponibile"}
                              </p>
                              <p className="text-xs text-neutral-medium mt-2">
                                Ultimo aggiornamento: {new Date(doc.updatedAt).toLocaleDateString()}
                              </p>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => handleOpenDocument(doc)}
                              >
                                <span className="material-icons text-sm mr-1">edit</span>
                                Modifica
                              </Button>
                              <Button 
                                variant="outline" 
                                className="text-red-500 hover:bg-red-50"
                                onClick={() => confirmDeleteDocument(doc)}
                              >
                                <span className="material-icons text-sm">delete</span>
                              </Button>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <span className="material-icons text-4xl text-neutral-medium mb-2">description_off</span>
                      <h3 className="text-lg font-medium text-neutral-dark mb-2">Nessun documento trovato</h3>
                      <p className="text-neutral-medium mb-4">
                        {searchQuery ? `Nessun risultato per "${searchQuery}"` : "Inizia creando un nuovo documento"}
                      </p>
                      <Button onClick={handleCreateNew}>
                        <span className="material-icons text-sm mr-1">add</span>
                        Crea il primo documento
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="list" className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-md shadow animate-pulse">
                      <div className="h-5 bg-neutral-light rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-neutral-light rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-neutral-light rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {documents && documents.length > 0 ? (
                    <div className="overflow-hidden rounded-md border border-neutral-200">
                      <table className="w-full bg-white">
                        <thead>
                          <tr className="border-b border-neutral-200 bg-neutral-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-dark">Titolo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-dark">Versione</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-dark">Stato</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-dark">Aggiornato</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-neutral-dark">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc: any) => {
                            const statusDisplay = formatDocumentStatus(doc.status);
                            return (
                              <tr key={doc.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                <td className="px-4 py-3 text-sm text-neutral-darkest">{doc.title}</td>
                                <td className="px-4 py-3 text-sm text-neutral-dark">{doc.version}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`status-badge ${statusDisplay.bgClass}`}>
                                    {statusDisplay.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-medium">
                                  {new Date(doc.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm flex justify-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleOpenDocument(doc)}
                                  >
                                    <span className="material-icons text-sm">edit</span>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => confirmDeleteDocument(doc)}
                                  >
                                    <span className="material-icons text-sm">delete</span>
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <span className="material-icons text-4xl text-neutral-medium mb-2">description_off</span>
                      <h3 className="text-lg font-medium text-neutral-dark mb-2">Nessun documento trovato</h3>
                      <p className="text-neutral-medium mb-4">
                        {searchQuery ? `Nessun risultato per "${searchQuery}"` : "Inizia creando un nuovo documento"}
                      </p>
                      <Button onClick={handleCreateNew}>
                        <span className="material-icons text-sm mr-1">add</span>
                        Crea il primo documento
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Dialog di conferma eliminazione */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare il documento?</DialogTitle>
            <DialogDescription>
              Stai per eliminare il documento "{documentToDelete?.title}". Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDocument}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? (
                <>
                  <span className="animate-spin material-icons text-sm mr-1">sync</span>
                  Eliminazione in corso...
                </>
              ) : (
                <>
                  <span className="material-icons text-sm mr-1">delete</span>
                  Elimina
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
