import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useLocation } from "wouter";
import Header from "@/components/header";
import DocumentTreeView from "@/components/document-tree-view";
import ModuleToolbar from "@/components/module-toolbar";
import ContentModule from "@/components/content-module";
import DocumentDetails from "@/components/document-details";
import VersionComparison from "@/components/version-comparison";
import BomManager from "@/components/bom-manager";
import SectionBomAssociator from "@/components/section-bom-associator";
import SectionBomSummary from "@/components/section-bom-summary";
import DocumentSectionPreview from "@/components/DocumentSectionPreview";
import TranslatedDocumentSectionPreview from "@/components/TranslatedDocumentSectionPreview";
import LanguageSelector from "@/components/language-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDocumentVersion } from "@/lib/document-utils";
import { Trash2, X } from "lucide-react";
import { useOpenDocuments } from "@/App";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
};

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

  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("0"); // Lingua predefinita (originale)
  
  // Fetch document data
  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: [`/api/documents/${id}`],
    enabled: id !== 'new'
  });
  
  // Effetto per aggiungere il documento alla lista dei documenti aperti
  useEffect(() => {
    if (document && id !== 'new') {
      console.log('Documento aperto:', document.title);
      // Aggiungi il documento alla lista dei documenti aperti
      addOpenDocument({
        id: Number(id),
        title: document.title
      });
      
      // Forza direttamente anche l'inserimento nel localStorage
      try {
        const existingDocs = JSON.parse(localStorage.getItem('openDocuments') || '[]');
        // Evita duplicati
        if (!existingDocs.some((doc: any) => doc.id === Number(id))) {
          existingDocs.push({
            id: Number(id),
            title: document.title
          });
          localStorage.setItem('openDocuments', JSON.stringify(existingDocs));
          console.log('Documento aggiunto direttamente al localStorage:', document.title);
        }
      } catch (error) {
        console.error('Errore nel salvare direttamente nel localStorage:', error);
      }
    }
  }, [document, id, addOpenDocument]);
  
  // Get current user (using admin for now)
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const userId = users?.[0]?.id || 1; // Default to first user (admin)
  
  // Fetch sections when document ID is available
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: [`/api/documents/${id}/sections`],
    enabled: id !== 'new' && !!document,
  });
  
  // Fetch content modules when a section is selected
  const { data: contentModules, isLoading: modulesLoading } = useQuery({
    queryKey: [`/api/sections/${selectedSection?.id}/modules`],
    enabled: !!selectedSection,
  });
  
  // Fetch associated BOM components for selected section
  const { data: sectionComponents, isLoading: sectionComponentsLoading } = useQuery({
    queryKey: [`/api/sections/${selectedSection?.id}/components`],
    enabled: !!selectedSection,
  });
  
  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedSection) return null;
      const res = await apiRequest('PUT', `/api/sections/${selectedSection.id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/sections`] });
      toast({
        title: "Sezione aggiornata",
        description: "La sezione è stata aggiornata con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento della sezione: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      await apiRequest('DELETE', `/api/modules/${moduleId}`, undefined);
      return moduleId;
    },
    onSuccess: (moduleId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${selectedSection?.id}/modules`] });
      toast({
        title: "Modulo eliminato",
        description: "Il modulo è stato eliminato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione del modulo: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Create document version mutation
  const createVersionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/versions', data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/versions`] });
      toast({
        title: "Versione creata",
        description: "Una nuova versione del documento è stata creata con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante la creazione della versione: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: number) => {
      await apiRequest('DELETE', `/api/sections/${sectionId}`, undefined);
      return sectionId;
    },
    onSuccess: (sectionId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/sections`] });
      if (selectedSection?.id === sectionId) {
        setSelectedSection(null);
      }
      toast({
        title: "Sezione eliminata",
        description: "La sezione è stata eliminata con successo"
      });
      setSectionToDelete(null);
      setShowTrashBin(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'eliminazione della sezione: ${error}`,
        variant: "destructive"
      });
      setSectionToDelete(null);
    }
  });
  
  // Set section form data when a section is selected
  useEffect(() => {
    if (selectedSection) {
      setSectionTitle(selectedSection.title);
      setSectionDescription(selectedSection.description || "");
    } else {
      setSectionTitle("");
      setSectionDescription("");
    }
  }, [selectedSection]);
  
  // Handle document close
  const handleCloseDocument = () => {
    if (id !== 'new') {
      removeOpenDocument(Number(id));
      
      // Aggiorna direttamente anche il localStorage
      try {
        const savedDocs = localStorage.getItem('openDocuments');
        const storedDocs = JSON.parse(savedDocs || '[]');
        const updatedDocs = storedDocs.filter((doc: any) => doc.id !== Number(id));
        localStorage.setItem('openDocuments', JSON.stringify(updatedDocs));
        console.log('Documento rimosso direttamente dal localStorage, ID:', id);
      } catch (error) {
        console.error('Errore nel rimuovere il documento dal localStorage:', error);
      }
    }
    navigate('/');
  };
  
  // Handle section selection
  const handleSectionSelect = (section: any) => {
    setSelectedSection(section);
  };
  
  // Handle section update
  const handleSectionUpdate = () => {
    if (!selectedSection) return;
    
    updateSectionMutation.mutate({
      title: sectionTitle,
      description: sectionDescription
    });
  };
  
  // Handle module deletion
  const handleDeleteModule = (moduleId: number) => {
    deleteModuleMutation.mutate(moduleId);
  };
  
  // Handle module update
  const handleUpdateModule = (moduleId: number, data: any) => {
    queryClient.invalidateQueries({ queryKey: [`/api/sections/${selectedSection?.id}/modules`] });
  };
  
  // Handle module added
  const handleModuleAdded = (module: any) => {
    queryClient.invalidateQueries({ queryKey: [`/api/sections/${selectedSection?.id}/modules`] });
  };
  
  // Handle document save
  const handleSaveDocument = async () => {
    if (id === 'new') return;
    
    try {
      if (!document) return;
      
      // Get the full document structure
      const documentData = {
        id: Number(id),
        version: document.version,
        title: document.title,
        description: document.description,
        status: document.status
      };
      
      // Create a snapshot of the current document state
      const versionData = {
        documentId: Number(id),
        version: document.version,
        content: documentData,
        createdById: userId,
        notes: "Salvataggio manuale"
      };
      
      createVersionMutation.mutate(versionData);
      
    } catch (error) {
      toast({
        title: "Errore",
        description: `Errore durante il salvataggio: ${error}`,
        variant: "destructive"
      });
    }
  };
  
  // Handle drag over for drop zone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('drag-over');
    }
  };
  
  // Handle drag leave for drop zone
  const handleDragLeave = () => {
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
  };
  
  // Handle drop for adding new modules
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
    
    const moduleType = e.dataTransfer.getData('moduleType');
    if (moduleType && selectedSection) {
      // Create a new module (using the ModuleToolbar component)
      // This is handled elsewhere
    }
  };
  
  // Document title display
  const documentTitle = document ? document.title : id === 'new' ? "Nuovo Documento" : "Caricamento...";
  
  // Document update handler
  const handleDocumentUpdate = (updatedDocument: any) => {
    queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
  };
  
  // Handle section deletion
  const handleDeleteSection = (sectionId: number) => {
    deleteSectionMutation.mutate(sectionId);
  };
  
  // Effect to handle drag events for trash bin
  useEffect(() => {
    const handleDragStart = () => setShowTrashBin(true);
    const handleDragEnd = () => setShowTrashBin(false);
    
    window.document.addEventListener('dragstart', handleDragStart);
    window.document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      window.document.removeEventListener('dragstart', handleDragStart);
      window.document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);
  
  return (
    <>
      <Header 
        title={documentTitle} 
        documentId={id}
        status={document?.status}
        showTabs={true}
        onSave={handleSaveDocument}
        onClose={handleCloseDocument}
        toggleSidebar={toggleSidebar}
      />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest">
        <DndProvider backend={HTML5Backend}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="px-4 border-b border-neutral-light">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
              <TabsTrigger value="bom">Distinta Base</TabsTrigger>
              <TabsTrigger value="bom-section">Associa BOM</TabsTrigger>
              <TabsTrigger value="permissions">Permessi</TabsTrigger>
              <TabsTrigger value="history">Cronologia</TabsTrigger>
            </TabsList>
          
          <TabsContent value="editor" className="h-full">
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
                        userId={userId}
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
                          <button className="p-1.5 text-neutral-dark hover:bg-neutral-lightest rounded has-tooltip">
                            <span className="material-icons">content_copy</span>
                            <span className="tooltip -mt-10">Duplica sezione</span>
                          </button>
                          <button className="p-1.5 text-neutral-dark hover:bg-neutral-lightest rounded has-tooltip">
                            <span className="material-icons">save</span>
                            <span className="tooltip -mt-10">Salva come modulo</span>
                          </button>
                          <button 
                            className="p-1.5 text-neutral-dark hover:bg-neutral-lightest rounded has-tooltip"
                            onClick={() => setSectionToDelete(selectedSection.id)}
                          >
                            <span className="material-icons">delete</span>
                            <span className="tooltip -mt-10">Elimina sezione</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="mb-4">
                          <Label htmlFor="section-title">Titolo sezione</Label>
                          <Input
                            id="section-title"
                            value={sectionTitle}
                            onChange={(e) => setSectionTitle(e.target.value)}
                            className="w-full p-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <Label htmlFor="section-description">Descrizione</Label>
                          <Textarea
                            id="section-description"
                            value={sectionDescription}
                            onChange={(e) => setSectionDescription(e.target.value)}
                            className="w-full p-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            rows={3}
                          />
                        </div>
                        
                        <button 
                          className="mb-4 bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md flex items-center text-sm"
                          onClick={handleSectionUpdate}
                        >
                          <span className="material-icons text-sm mr-1">save</span>
                          Aggiorna sezione
                        </button>
                        
                        {/* Componenti BOM associati */}
                        <SectionBomSummary 
                          sectionId={selectedSection.id} 
                          onSwitchTab={(tab) => setActiveTab(tab)} 
                        />
                        
                        {/* Module toolbar */}
                        <ModuleToolbar 
                          sectionId={selectedSection.id}
                          onModuleAdded={handleModuleAdded}
                        />
                        
                        {/* Content modules */}
                        <div className="space-y-4">
                          {modulesLoading ? (
                            <div>Caricamento moduli...</div>
                          ) : contentModules && contentModules.length > 0 ? (
                            contentModules.map((module: any) => (
                              <ContentModule 
                                key={module.id}
                                module={module}
                                onDelete={handleDeleteModule}
                                onUpdate={handleUpdateModule}
                                documentId={id}
                              />
                            ))
                          ) : (
                            <div className="text-neutral-dark text-center py-4">
                              Nessun modulo in questa sezione. Aggiungi un modulo dalla barra degli strumenti.
                            </div>
                          )}
                          
                          {/* Drop zone for new modules */}
                          <div 
                            ref={dropZoneRef}
                            className="border border-dashed border-neutral-light rounded-md p-4 text-center hover:bg-neutral-lightest transition cursor-pointer"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => {/* Show module options */}}
                          >
                            <span className="material-icons text-neutral-medium">add_circle_outline</span>
                            <p className="text-neutral-medium text-sm mt-1">Trascina un modulo qui o clicca per aggiungere</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // No section selected
                    <div className="text-center p-10">
                      <span className="material-icons text-5xl text-neutral-medium mb-3">menu_book</span>
                      <h3 className="text-xl font-medium text-neutral-dark mb-2">Seleziona una sezione</h3>
                      <p className="text-neutral-medium">
                        Seleziona una sezione dal menu a sinistra o crea una nuova sezione per iniziare.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview">
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light flex justify-between items-center">
                  <h3 className="text-lg font-medium">Anteprima documento</h3>
                  
                  {/* Selettore lingua per traduzione */}
                  {sections && sections.length > 0 && (
                    <LanguageSelector 
                      documentId={id} 
                      onLanguageChange={setSelectedLanguage} 
                    />
                  )}
                </div>
                <div className="p-6">
                  {id === 'new' ? (
                    <div className="text-center py-8">
                      <p>Salva il documento per visualizzare l'anteprima.</p>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{document?.title}</h1>
                      <p className="text-neutral-dark mb-6">{document?.description}</p>
                      
                      {/* Render documento completo con tutte le sezioni e moduli */}
                      {sections && sections.length > 0 ? (
                        <div className="document-preview">
                          {sections
                            .filter((section: any) => !section.parentId) // Solo sezioni di primo livello
                            .sort((a: any, b: any) => a.order - b.order)
                            .map((section: any) => (
                              selectedLanguage && selectedLanguage !== '0' ? (
                                <TranslatedDocumentSectionPreview 
                                  key={section.id} 
                                  section={section} 
                                  allSections={sections}
                                  documentId={id}
                                  level={0}
                                  languageId={selectedLanguage}
                                />
                              ) : (
                                <DocumentSectionPreview 
                                  key={section.id} 
                                  section={section} 
                                  allSections={sections}
                                  documentId={id}
                                  level={0}
                                />
                              )
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p>Questo documento non ha ancora sezioni.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bom">
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Gestione Distinte Base</h3>
                </div>
                <BomManager documentId={id} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bom-section">
            <div className="flex h-full">
              {/* Left sidebar with document tree for section selection */}
              <div className="w-64 bg-white shadow-inner border-r border-neutral-light p-4 overflow-y-auto">
                {id !== 'new' ? (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-darkest mb-2">Seleziona una sezione</h3>
                    <DocumentTreeView 
                      documentId={id}
                      onSectionSelect={handleSectionSelect}
                      selectedSectionId={selectedSection?.id}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-neutral-medium">
                    Salva il documento per aggiungere sezioni.
                  </div>
                )}
              </div>
              
              {/* Main content area for BOM association */}
              <div className="flex-1 overflow-y-auto">
                {id === 'new' ? (
                  <div className="p-6 text-center">
                    <p>Salva il documento prima di associare le distinte base.</p>
                  </div>
                ) : selectedSection ? (
                  <div className="max-w-5xl mx-auto bg-white shadow-sm">
                    <div className="px-6 py-4 border-b border-neutral-light">
                      <h3 className="text-lg font-medium">
                        Associa componenti BOM alla sezione: <span className="text-primary">{selectedSection.title}</span>
                      </h3>
                      <p className="text-sm text-neutral-medium mt-1">
                        In questa sezione puoi associare i componenti di una distinta base alla sezione selezionata.
                      </p>
                    </div>
                    <SectionBomAssociator sectionId={selectedSection.id} />
                  </div>
                ) : (
                  <div className="text-center p-10">
                    <span className="material-icons text-5xl text-neutral-medium mb-3">view_list</span>
                    <h3 className="text-xl font-medium text-neutral-dark mb-2">Seleziona una sezione</h3>
                    <p className="text-neutral-medium">
                      Seleziona una sezione dal menu a sinistra per associare componenti di una distinta base.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="permissions">
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Impostazioni permessi</h3>
                </div>
                <div className="p-6">
                  <p className="text-center py-8 text-neutral-medium">
                    Funzionalità in sviluppo.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="p-6">
              <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-light flex justify-between items-center">
                  <h3 className="text-lg font-medium">Cronologia e Versioni</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        window.open(`/api/documents/${id}/export/word`, '_blank');
                      }}
                      className="flex items-center"
                    >
                      <span className="material-icons text-sm mr-1">download</span>
                      Esporta Word
                    </Button>
                  </div>
                </div>
                <VersionComparison documentId={id} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
          
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
                <AlertDialogAction 
                  onClick={() => {
                    if (sectionToDelete) {
                      handleDeleteSection(sectionToDelete);
                    }
                  }}
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Trash Bin */}
          <TrashBin
            showTrashBin={showTrashBin}
            onDeleteRequest={(id) => setSectionToDelete(id)}
          />
        </DndProvider>
      </main>
    </>
  );
}
