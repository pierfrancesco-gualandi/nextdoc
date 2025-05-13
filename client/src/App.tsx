import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DocumentEditor from "@/pages/document-editor";
import ModulesLibrary from "@/pages/modules-library";
import BomManagement from "@/pages/bom-management";
import BomComparison from "@/pages/bom-comparison";
import Users from "@/pages/users";
import Translations from "@/pages/translations";
import ModuleTranslation from "@/pages/module-translation";
import DocumentTranslationExport from "@/pages/document-translation-export";
import DocumentTranslationTree from "@/pages/document-translation-tree";
import Sidebar from "@/components/sidebar";
import React, { useState, createContext, useContext, useEffect } from "react";
import SettingsRedirect from "@/pages/settings-redirect";
import { UserProvider } from "./contexts/UserContext";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Definizione delle interfacce per i documenti aperti
export interface OpenDocument {
  id: number;
  title: string;
}

interface OpenDocumentsContextType {
  openDocuments: OpenDocument[];
  addOpenDocument: (doc: OpenDocument) => void;
  removeOpenDocument: (id: number) => void;
  isDocumentOpen: (id: number) => boolean;
  currentDocumentId: number | null;
  setCurrentDocumentId: (id: number | null) => void;
  getLastOpenDocument: () => OpenDocument | null;
}

const OpenDocumentsContext = createContext<OpenDocumentsContextType>({
  openDocuments: [],
  addOpenDocument: () => {},
  removeOpenDocument: () => {},
  isDocumentOpen: () => false,
  currentDocumentId: null,
  setCurrentDocumentId: () => {},
  getLastOpenDocument: () => null
});

// Hook per usare il contesto dei documenti aperti
export const useOpenDocuments = () => useContext(OpenDocumentsContext);

function Router() {
  const [location] = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  
  // Recupera documenti aperti dal localStorage all'avvio
  const [openDocuments, setOpenDocuments] = useState<OpenDocument[]>(() => {
    try {
      const savedDocuments = localStorage.getItem('openDocuments');
      const parsed = savedDocuments ? JSON.parse(savedDocuments) : [];
      console.log('Documenti aperti caricati:', parsed);
      return parsed;
    } catch (error) {
      console.error('Errore nel caricamento dei documenti aperti:', error);
      return [];
    }
  });
  
  // Salva i documenti aperti nel localStorage quando cambiano
  useEffect(() => {
    try {
      // Salva sempre, anche quando l'array è vuoto
      localStorage.setItem('openDocuments', JSON.stringify(openDocuments));
      console.log('Documenti aperti salvati nel localStorage:', openDocuments);
    } catch (error) {
      console.error('Errore nel salvare i documenti nel localStorage:', error);
    }
  }, [openDocuments]);
  
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const addOpenDocument = (doc: OpenDocument) => {
    if (!isDocumentOpen(doc.id)) {
      setOpenDocuments(prev => [...prev, doc]);
      setCurrentDocumentId(doc.id);
      console.log(`Documento aggiunto: ${doc.title} (ID: ${doc.id})`);
      
      // Aggiorna immediamente il localStorage
      try {
        const updatedDocs = [...openDocuments, doc];
        localStorage.setItem('openDocuments', JSON.stringify(updatedDocs));
        console.log('Aggiornamento diretto localStorage - Documento aggiunto:', doc.title);
      } catch (error) {
        console.error('Errore nel salvare il documento nel localStorage:', error);
      }
    } else {
      setCurrentDocumentId(doc.id);
    }
  };

  const removeOpenDocument = (id: number) => {
    setOpenDocuments(prev => prev.filter(doc => doc.id !== id));
    if (currentDocumentId === id) {
      const remaining = openDocuments.filter(doc => doc.id !== id);
      if (remaining.length > 0) {
        // Se ci sono altri documenti aperti, vai all'ultimo
        setCurrentDocumentId(remaining[remaining.length - 1].id);
      } else {
        setCurrentDocumentId(null);
      }
    }
    
    // Aggiorna immediatamente il localStorage
    try {
      const updatedDocs = openDocuments.filter(doc => doc.id !== id);
      localStorage.setItem('openDocuments', JSON.stringify(updatedDocs));
      console.log('Aggiornamento diretto localStorage - Documento rimosso ID:', id);
    } catch (error) {
      console.error('Errore nel rimuovere il documento dal localStorage:', error);
    }
  };

  const isDocumentOpen = (id: number) => {
    return openDocuments.some(doc => doc.id === id);
  };
  
  const getLastOpenDocument = (): OpenDocument | null => {
    if (openDocuments.length === 0) return null;
    
    // Se c'è un documento corrente, restituisci quello
    if (currentDocumentId) {
      const current = openDocuments.find(doc => doc.id === currentDocumentId);
      if (current) return current;
    }
    
    // Altrimenti, restituisci l'ultimo documento dell'array
    return openDocuments[openDocuments.length - 1];
  };
  
  const openDocumentsValue = {
    openDocuments,
    addOpenDocument,
    removeOpenDocument,
    isDocumentOpen,
    currentDocumentId,
    setCurrentDocumentId,
    getLastOpenDocument
  };
  
  return (
    <OpenDocumentsContext.Provider value={openDocumentsValue}>
      <div className="flex h-screen overflow-hidden bg-neutral-lightest">
        {showSidebar && <Sidebar activePath={location} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Switch>
            <Route path="/" component={() => <Dashboard toggleSidebar={toggleSidebar} />} />
            <Route path="/documents" component={() => <Dashboard toggleSidebar={toggleSidebar} />} />
            <Route path="/documents/:id" component={({ params }) => <DocumentEditor id={params.id} toggleSidebar={toggleSidebar} />} />
            <Route path="/modules" component={() => <ModulesLibrary toggleSidebar={toggleSidebar} />} />
            <Route path="/components" component={() => <BomManagement toggleSidebar={toggleSidebar} />} />
            <Route path="/bom-comparison" component={() => <BomComparison toggleSidebar={toggleSidebar} />} />
            <Route path="/users" component={() => <Users toggleSidebar={toggleSidebar} />} />
            <Route path="/translations" component={() => <Translations toggleSidebar={toggleSidebar} />} />
            <Route path="/module-translation/:id" component={({ params }) => <ModuleTranslation toggleSidebar={toggleSidebar} />} />
            <Route path="/document/:id/export-translations" component={({ params }) => <DocumentTranslationExport />} />
            <Route path="/document/:id/translate" component={({ params }) => <DocumentTranslationTree toggleSidebar={toggleSidebar} />} />
            {/* Rotte per le impostazioni */}
            <Route path="/settings" component={() => {
              // Importazione diretta (no dynamic import che causa problemi)
              return (
                <div className="flex flex-col flex-1 p-6 overflow-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Impostazioni</h1>
                    <button 
                      className="p-2 rounded-full hover:bg-neutral-100"
                      onClick={toggleSidebar}
                    >
                      <span className="material-icons">menu</span>
                    </button>
                  </div>
                  
                  <div>
                    {/* Tabs */}
                    <div className="flex space-x-2 mb-6 border-b">
                      <button 
                        className="px-4 py-2 border-b-2 border-primary text-primary font-medium"
                        onClick={() => document.getElementById('tab-generale')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Generale
                      </button>
                      <button 
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-50"
                        onClick={() => document.getElementById('tab-html')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Esportazione HTML
                      </button>
                      <button 
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-50"
                        onClick={() => document.getElementById('tab-domain')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Dominio
                      </button>
                      <button 
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-50"
                        onClick={() => document.getElementById('tab-deploy')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Deployment
                      </button>
                    </div>
                  </div>
                  
                  {/* Tab: Generale */}
                  <div id="tab-generale" className="mb-10">
                    <h2 className="text-2xl font-bold mb-4">Impostazioni Generali</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="bg-white rounded-lg shadow-sm p-6 border">
                        <h3 className="text-xl font-semibold mb-4">Applicazione</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Nome dell'applicazione</label>
                            <input 
                              type="text" 
                              defaultValue="VKS Studio" 
                              className="w-full p-2 border rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Logo personalizzato</label>
                            <div className="flex items-center">
                              <div className="w-12 h-12 bg-neutral-100 rounded flex items-center justify-center mr-4">
                                <span className="material-icons text-2xl">description</span>
                              </div>
                              <button className="px-3 py-1 bg-primary text-white rounded-md text-sm">
                                Carica logo
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg shadow-sm p-6 border">
                        <h3 className="text-xl font-semibold mb-4">Interfaccia Utente</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Lingua di sistema</label>
                            <select className="w-full p-2 border rounded-md">
                              <option value="it">Italiano</option>
                              <option value="en">English</option>
                              <option value="de">Deutsch</option>
                              <option value="fr">Français</option>
                            </select>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              id="sidebar-option" 
                              className="mr-2"
                              defaultChecked
                            />
                            <label htmlFor="sidebar-option" className="text-sm">Mostra barra laterale all'avvio</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tab: Esportazione HTML */}
                  <div id="tab-html" className="mb-10">
                    <h2 className="text-2xl font-bold mb-4">Configurazione Esportazione HTML</h2>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6 border mb-6">
                      <h3 className="text-xl font-semibold mb-4">Configurazione HTML esportato</h3>
                      <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium mb-1">Titolo pagina HTML</label>
                            <input 
                              type="text" 
                              placeholder="[Titolo documento]" 
                              className="w-full p-2 border rounded-md"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Usa [Titolo documento] per inserire dinamicamente il titolo del documento</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Tag meta description</label>
                            <input 
                              type="text" 
                              placeholder="[Descrizione documento]" 
                              className="w-full p-2 border rounded-md"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">CSS personalizzato</label>
                          <textarea 
                            className="w-full p-2 border rounded-md font-mono text-sm h-32"
                            placeholder="/* Inserisci qui il tuo CSS personalizzato */"
                          ></textarea>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Header HTML personalizzato</label>
                          <textarea 
                            className="w-full p-2 border rounded-md font-mono text-sm h-32"
                            placeholder="<!-- Inserisci qui codice HTML da includere nell'header -->"
                          ></textarea>
                          <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito nel tag &lt;head&gt; delle pagine esportate</p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              id="include-js" 
                              className="mr-2"
                              defaultChecked
                            />
                            <label htmlFor="include-js" className="text-sm">Includi JavaScript per funzionalità interattive</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              id="include-toc" 
                              className="mr-2"
                              defaultChecked
                            />
                            <label htmlFor="include-toc" className="text-sm">Includi indice dei contenuti</label>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
                            Salva configurazione
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                      <h3 className="text-xl font-semibold mb-4">Anteprima HTML</h3>
                      <div className="border rounded-md p-4 h-64 bg-neutral-50 flex items-center justify-center">
                        <div className="text-center">
                          <span className="material-icons text-4xl text-neutral-400 mb-2">code</span>
                          <p className="text-neutral-500">L'anteprima del documento HTML verrà visualizzata qui</p>
                          <button className="mt-4 px-3 py-1 bg-primary text-white rounded-md text-sm">
                            Genera anteprima
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tab: Dominio */}
                  <div id="tab-domain" className="mb-10">
                    <h2 className="text-2xl font-bold mb-4">Configurazione Dominio</h2>
                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                      <h3 className="text-xl font-semibold mb-4">Configurazione Dominio</h3>
                      <p className="mb-4">Aggiungi un dominio personalizzato alla tua applicazione.</p>
                      
                      <div className="mb-6">
                        <h4 className="text-lg font-medium mb-2">Dominio Attuale</h4>
                        <code className="bg-neutral-50 p-2 rounded border block">app-nome.replit.app</code>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-lg font-medium mb-2">Aggiungi Dominio Personalizzato</h4>
                        <div className="flex mb-4">
                          <input 
                            type="text" 
                            placeholder="esempio.com" 
                            className="flex-1 p-2 border rounded-l-md"
                          />
                          <button className="px-4 py-2 bg-primary text-white rounded-r-md">
                            Aggiungi
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-medium mb-2">Configurazione DNS</h4>
                        <div className="bg-neutral-50 p-4 rounded border">
                          <p className="mb-2">Per collegare il tuo dominio a questa applicazione, configura questi record DNS:</p>
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="py-2 text-left">Tipo</th>
                                  <th className="py-2 text-left">Nome</th>
                                  <th className="py-2 text-left">Valore</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b">
                                  <td className="py-2">CNAME</td>
                                  <td className="py-2">www</td>
                                  <td className="py-2">app-nome.replit.app</td>
                                </tr>
                                <tr>
                                  <td className="py-2">A</td>
                                  <td className="py-2">@</td>
                                  <td className="py-2">76.76.21.123</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tab: Deployment */}
                  <div id="tab-deploy" className="mb-10">
                    <h2 className="text-2xl font-bold mb-4">Deployment</h2>
                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                      <h3 className="text-xl font-semibold mb-4">Gestione Deployment</h3>
                      <p className="mb-6">Configura e gestisci il deployment della tua applicazione.</p>
                      
                      <div className="mb-6">
                        <h4 className="text-lg font-medium mb-2">Stato Attuale</h4>
                        <div className="flex items-center">
                          <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                          <span>Applicazione attiva</span>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-lg font-medium mb-2">Ultima Versione</h4>
                        <div className="bg-neutral-50 p-4 rounded border">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">v1.0.0</span>
                            <span className="text-neutral-600">3 giorni fa</span>
                          </div>
                          <p>Release iniziale</p>
                        </div>
                      </div>
                      
                      <button className="px-4 py-2 bg-primary text-white rounded-md">
                        Crea Nuovo Deployment
                      </button>
                    </div>
                  </div>
                </div>
              );
            }} />
            <Route component={NotFound} />
          </Switch>
        </div>
        <Toaster />
      </div>
    </OpenDocumentsContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <DndProvider backend={HTML5Backend}>
          <Router />
        </DndProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
