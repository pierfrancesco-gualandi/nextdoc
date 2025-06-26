import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useOpenDocuments } from "@/App";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface DocumentsProps {
  toggleSidebar: () => void;
}

export default function Documents({ toggleSidebar }: DocumentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);

  const { openDocuments, addOpenDocument, removeOpenDocument, isDocumentOpen } = useOpenDocuments();

  // Fetch documents
  const { data: documents, isLoading } = useQuery<any[]>({
    queryKey: ['/api/documents'],
  });

  // Filtra i documenti in base alla ricerca
  const filteredDocuments = documents ? documents.filter((doc: any) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Status formatting
  const formatDocumentStatus = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Bozza', bgClass: 'bg-yellow-100 text-yellow-800' };
      case 'review':
        return { label: 'In Revisione', bgClass: 'bg-blue-100 text-blue-800' };
      case 'published':
        return { label: 'Pubblicato', bgClass: 'bg-green-100 text-green-800' };
      case 'archived':
        return { label: 'Archiviato', bgClass: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, bgClass: 'bg-gray-100 text-gray-800' };
    }
  };

  // Delete document mutation
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
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
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
    addOpenDocument({
      id: doc.id,
      title: doc.title
    });
    
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
      <Header title="Documenti" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header principale della pagina */}
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-neutral-darkest tracking-tight">Libreria Moduli</h1>
                  <p className="text-lg text-neutral-medium">Gestisci e riutilizza moduli salvati nei tuoi documenti</p>
                </div>
              </div>
            </div>
              <Button onClick={handleCreateNew} size="lg" className="mt-2">
                <span className="material-icons text-sm mr-2">add</span>
                Nuovo Documento
              </Button>
            </div>
          </div>
          
          {/* Documenti aperti */}
          {openDocuments.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-neutral-dark mb-3">Documenti Aperti</h2>
              <div className="bg-white rounded-md shadow">
                <div className="grid gap-1 p-2">
                  {openDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-neutral-50">
                      <button 
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="text-blue-600 hover:underline truncate flex-1 text-left"
                      >
                        {doc.title}
                      </button>
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

          {/* Barra di ricerca e controlli */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Cerca documenti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "list")}>
              <TabsList>
                <TabsTrigger value="grid">
                  <span className="material-icons text-sm mr-1">grid_view</span>
                  Griglia
                </TabsTrigger>
                <TabsTrigger value="list">
                  <span className="material-icons text-sm mr-1">view_list</span>
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Contenuto documenti */}
          <Tabs value={viewMode} className="space-y-4">
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
                        <div className="h-4 bg-neutral-light rounded w-2/3"></div>
                      </CardContent>
                      <CardFooter>
                        <div className="h-8 bg-neutral-light rounded w-full"></div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {filteredDocuments && filteredDocuments.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {filteredDocuments.map((doc: any) => {
                        const statusDisplay = formatDocumentStatus(doc.status);
                        return (
                          <Card key={doc.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{doc.title}</CardTitle>
                                <Badge className={statusDisplay.bgClass}>
                                  {statusDisplay.label}
                                </Badge>
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
                  {filteredDocuments && filteredDocuments.length > 0 ? (
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
                          {filteredDocuments.map((doc: any) => {
                            const statusDisplay = formatDocumentStatus(doc.status);
                            return (
                              <tr key={doc.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                <td className="px-4 py-3 text-sm text-neutral-darkest">{doc.title}</td>
                                <td className="px-4 py-3 text-sm text-neutral-dark">{doc.version}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge className={statusDisplay.bgClass}>
                                    {statusDisplay.label}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-dark">
                                  {new Date(doc.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleOpenDocument(doc)}
                                    >
                                      <span className="material-icons text-sm mr-1">edit</span>
                                      Modifica
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-red-500 hover:bg-red-50"
                                      onClick={() => confirmDeleteDocument(doc)}
                                    >
                                      <span className="material-icons text-sm">delete</span>
                                    </Button>
                                  </div>
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
            <Button variant="destructive" onClick={handleDeleteDocument}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}