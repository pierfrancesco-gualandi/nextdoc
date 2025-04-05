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
import Sidebar from "@/components/sidebar";
import { useState, createContext, useContext, useEffect } from "react";

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
      <Router />
    </QueryClientProvider>
  );
}

export default App;
