import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DocumentDetails from "@/components/document-details";
import DocumentTreeView from "@/components/document-tree-view";
import Header from "@/components/header";
import { useUser } from "@/contexts/UserContext";
import { useOpenDocuments } from "@/App";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrop } from "react-dnd";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DocumentEditorProps {
  id: string;
  toggleSidebar?: () => void;
}

// TrashBin component (internal to this file)
type DragItem = {
  type: string;
  id: number;
  originalParentId: number | null;
  originalIndex: number;
}

interface TrashBinProps {
  showTrashBin: boolean;
  onDeleteRequest: (id: number) => void;
}

function TrashBin({ showTrashBin, onDeleteRequest }: TrashBinProps) {
  const [draggedOverTrash, setDraggedOverTrash] = useState(false);

  // Handle trash drop
  const [{ isOverTrash }, trashDrop] = useDrop({
    accept: 'SECTION',
    drop(item: DragItem) {
      onDeleteRequest(item.id);
    },
    hover() {
      setDraggedOverTrash(true);
    },
    collect: (monitor) => ({
      isOverTrash: monitor.isOver()
    })
  });

  if (!showTrashBin) return null;

  return (
    <div 
      ref={trashDrop}
      className={`
        fixed bottom-4 right-4 z-50
        w-14 h-14 flex items-center justify-center 
        rounded-full shadow-lg
        transition-all duration-200
        ${draggedOverTrash || isOverTrash 
          ? 'bg-red-600 scale-110' 
          : 'bg-neutral-800'}
      `}
    >
      <Trash2 
        className={`
          w-6 h-6
          ${draggedOverTrash || isOverTrash ? 'text-white' : 'text-white opacity-80'}
        `}
      />
    </div>
  );
}

export default function DocumentEditor({ id, toggleSidebar }: DocumentEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Accedi al contesto dei documenti aperti
  const { addOpenDocument, removeOpenDocument } = useOpenDocuments();
  
  // Stati locali
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("editor");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [draggedSection, setDraggedSection] = useState<any>(null);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);

  // Ottieni l'utente corrente
  const { selectedUser } = useUser();

  // Fetch document data
  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: [`/api/documents/${id}`],
    enabled: id !== 'new',
  });

  // Fetch sections
  const { data: sections } = useQuery({
    queryKey: [`/api/documents/${id}/sections`],
    enabled: id !== 'new',
  });

  // Mutations per salvare il documento
  const saveDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      if (id === 'new') {
        const response = await apiRequest('POST', '/api/documents', documentData);
        return response.json();
      } else {
        const response = await apiRequest('PUT', `/api/documents/${id}`, documentData);
        return response.json();
      }
    },
    onSuccess: (savedDocument) => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      if (id === 'new') {
        navigate(`/documents/${savedDocument.id}`);
        addOpenDocument({ id: savedDocument.id, title: savedDocument.title });
        toast({
          title: "Documento creato",
          description: "Il documento è stato creato con successo.",
        });
      } else {
        toast({
          title: "Documento salvato",
          description: "Le modifiche sono state salvate con successo.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Errore nel salvataggio",
        description: error.message || "Si è verificato un errore durante il salvataggio.",
        variant: "destructive",
      });
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: number) => {
      await apiRequest('DELETE', `/api/sections/${sectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/sections`] });
      setSelectedSection(null);
      setSectionToDelete(null);
      toast({
        title: "Sezione eliminata",
        description: "La sezione è stata eliminata con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore nell'eliminazione",
        description: error.message || "Si è verificato un errore durante l'eliminazione.",
        variant: "destructive",
      });
    },
  });

  // Funzioni di gestione
  const handleSectionSelect = (section: any) => {
    setSelectedSection(section);
  };

  const handleSaveDocument = async () => {
    if (id === 'new') {
      // Per un nuovo documento, il salvataggio è gestito dal componente DocumentDetails
      return;
    }

    if (document) {
      await saveDocumentMutation.mutateAsync({
        title: document.title,
        description: document.description,
        userId: selectedUser?.id || 1,
      });
    }
  };

  const handleCloseDocument = () => {
    if (id !== 'new') {
      removeOpenDocument(parseInt(id));
    }
    navigate('/');
  };

  const handleDeleteRequest = (sectionId: number) => {
    setSectionToDelete(sectionId);
    setShowTrashBin(false);
  };

  const confirmDeleteSection = () => {
    if (sectionToDelete) {
      deleteSectionMutation.mutate(sectionToDelete);
    }
  };

  // Determina il titolo del documento
  const documentTitle = id === 'new' ? 'Nuovo documento' : (document?.title || '');

  // Controllo permessi
  const userRole = selectedUser?.role || 'viewer';
  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canManageUsers = userRole === 'admin';

  // Effetto per aggiungere il documento ai documenti aperti quando viene caricato
  useEffect(() => {
    if (document && id !== 'new') {
      addOpenDocument({ id: document.id, title: document.title });
    }
  }, [document, id, addOpenDocument]);

  // Se sta caricando il documento
  if (documentLoading && id !== 'new') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Caricamento documento...</div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        <Header 
          title={documentTitle} 
          documentId={id}
          status={document?.status}
          showTabs={true}
          selectedLanguage={selectedLanguage}
          onSave={handleSaveDocument}
          onClose={handleCloseDocument}
          toggleSidebar={toggleSidebar}
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-lightest">
          {activeTab === 'editor' && (
            <div className="flex h-full">
              {/* Left sidebar with document tree */}
              <div className="w-64 bg-white shadow-inner border-r border-neutral-light p-4 overflow-y-auto">
                {id !== 'new' ? (
                  <DocumentTreeView 
                    documentId={id}
                    onSectionSelect={handleSectionSelect}
                    selectedSectionId={selectedSection?.id}
                  />
                ) : (
                  <div className="text-sm text-neutral-medium">
                    Salva il documento per aggiungere sezioni.
                  </div>
                )}
              </div>
              
              {/* Main content area */}
              <div className="flex-1 p-6 overflow-y-auto">
                {id === 'new' ? (
                  <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                      <CardTitle>Crea nuovo documento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DocumentDetails 
                        document={null} 
                        userId={selectedUser?.id || 1}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  selectedSection ? (
                    // Section editor
                    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm mb-6">
                      <div className="px-6 py-4 border-b border-neutral-light flex justify-between items-center">
                        <h3 className="text-lg font-medium">{selectedSection.title}</h3>
                        <div className="flex items-center space-x-2">
                          <button 
                            className={`p-1.5 rounded has-tooltip ${canEdit 
                              ? 'text-neutral-dark hover:bg-neutral-lightest' 
                              : 'text-neutral-light cursor-not-allowed'}`}
                            disabled={!canEdit}
                            title={!canEdit ? "Non hai permessi per modificare" : ""}
                          >
                            <span className="material-icons">content_copy</span>
                            <span className="tooltip -mt-10">Duplica sezione</span>
                          </button>
                          <button 
                            className={`p-1.5 rounded has-tooltip ${canEdit 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-neutral-light cursor-not-allowed'}`}
                            disabled={!canEdit}
                            title={!canEdit ? "Non hai permessi per eliminare" : ""}
                          >
                            <span className="material-icons">delete</span>
                            <span className="tooltip -mt-10">Elimina sezione</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        <SectionEditor 
                          section={selectedSection} 
                          canEdit={canEdit}
                          documentId={id}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-5xl mx-auto text-center py-12">
                      <h3 className="text-xl font-medium text-neutral-dark mb-2">Seleziona una sezione</h3>
                      <p className="text-neutral-medium">
                        Seleziona una sezione dal menu a sinistra o crea una nuova sezione per iniziare.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Anteprima documento</h3>
                </div>
                <div className="p-6">
                  <DocumentPreview documentId={id} selectedLanguage={selectedLanguage} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bom' && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Elenco Componenti</h3>
                </div>
                <div className="p-6">
                  <BomViewer documentId={id} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bom-section' && canEdit && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Associa BOM</h3>
                </div>
                <div className="p-6">
                  <BomSectionManager documentId={id} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && canManageUsers && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Gestione Permessi</h3>
                </div>
                <div className="p-6">
                  <DocumentPermissions documentId={id} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Cronologia</h3>
                </div>
                <div className="p-6">
                  <DocumentHistory documentId={id} />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* TrashBin component */}
        <TrashBin showTrashBin={showTrashBin} onDeleteRequest={handleDeleteRequest} />

        {/* Alert Dialog for section deletion confirmation */}
        <AlertDialog open={sectionToDelete !== null} onOpenChange={(open) => !open && setSectionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare questa sezione? Questa azione non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSection}>
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </DndProvider>
  );
}