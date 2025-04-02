import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import DocumentTreeView from "@/components/document-tree-view";
import ModuleToolbar from "@/components/module-toolbar";
import ContentModule from "@/components/content-module";
import DocumentDetails from "@/components/document-details";
import VersionComparison from "@/components/version-comparison";
import BomManager from "@/components/bom-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDocumentVersion } from "@/lib/document-utils";

interface DocumentEditorProps {
  id: string;
  toggleSidebar?: () => void;
}

export default function DocumentEditor({ id, toggleSidebar }: DocumentEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("editor");
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Fetch document data
  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: [`/api/documents/${id}`],
    enabled: id !== 'new',
  });
  
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
  
  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async (data: any) => {
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
  
  return (
    <>
      <Header 
        title={documentTitle} 
        documentId={id}
        status={document?.status}
        showTabs={true}
        onSave={handleSaveDocument}
        toggleSidebar={toggleSidebar}
      />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="px-4 border-b border-neutral-light">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Anteprima</TabsTrigger>
            <TabsTrigger value="bom">Distinta Base</TabsTrigger>
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
                          <button className="p-1.5 text-neutral-dark hover:bg-neutral-lightest rounded has-tooltip">
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
                          className="mb-6 bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md flex items-center text-sm"
                          onClick={handleSectionUpdate}
                        >
                          <span className="material-icons text-sm mr-1">save</span>
                          Aggiorna sezione
                        </button>
                        
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
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Anteprima documento</h3>
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
                      
                      {/* We would render a preview of all sections and modules here */}
                      {sections && sections.length > 0 ? (
                        sections.map((section: any) => (
                          <div key={section.id} className="mb-8">
                            <h2 className="text-xl font-semibold mb-3 pb-1 border-b border-neutral-light">{section.title}</h2>
                            <p className="mb-4">{section.description}</p>
                            
                            {/* Content modules would be rendered here */}
                            <div className="pl-4 border-l-2 border-neutral-light">
                              {/* This would be populated with actual content */}
                              <p className="text-neutral-medium">[Contenuto moduli]</p>
                            </div>
                          </div>
                        ))
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
                <div className="px-6 py-4 border-b border-neutral-light">
                  <h3 className="text-lg font-medium">Confronto Versioni</h3>
                </div>
                <VersionComparison documentId={id} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
