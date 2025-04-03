import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DocumentEditor from "@/pages/document-editor";
import ModulesLibrary from "@/pages/modules-library";
import BomManagement from "@/pages/bom-management";
import Users from "@/pages/users";
import Translations from "@/pages/translations";
import Sidebar from "@/components/sidebar";
import { useState, createContext, useContext, useEffect } from "react";

// Creiamo un contesto per gestire i documenti aperti
export interface OpenDocument {
  id: number;
  title: string;
}

interface OpenDocumentsContextType {
  openDocuments: OpenDocument[];
  addOpenDocument: (doc: OpenDocument) => void;
  removeOpenDocument: (id: number) => void;
  isDocumentOpen: (id: number) => boolean;
}

const OpenDocumentsContext = createContext<OpenDocumentsContextType>({
  openDocuments: [],
  addOpenDocument: () => {},
  removeOpenDocument: () => {},
  isDocumentOpen: () => false,
});

// Hook per usare il contesto dei documenti aperti
export const useOpenDocuments = () => useContext(OpenDocumentsContext);

function Router() {
  const [location] = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Utilizziamo useEffect per recuperare i documenti aperti dal localStorage all'avvio
  const [openDocuments, setOpenDocuments] = useState<OpenDocument[]>(() => {
    try {
      const savedDocuments = localStorage.getItem('openDocuments');
      return savedDocuments ? JSON.parse(savedDocuments) : [];
    } catch (error) {
      console.error('Errore nel caricamento dei documenti aperti:', error);
      return [];
    }
  });
  
  // Salviamo i documenti aperti nel localStorage quando cambiano
  useEffect(() => {
    localStorage.setItem('openDocuments', JSON.stringify(openDocuments));
    console.log('Documenti aperti salvati:', openDocuments);
  }, [openDocuments]);
  
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const addOpenDocument = (doc: OpenDocument) => {
    if (!openDocuments.some(d => d.id === doc.id)) {
      setOpenDocuments(prev => [...prev, doc]);
    }
  };

  const removeOpenDocument = (id: number) => {
    setOpenDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const isDocumentOpen = (id: number) => {
    return openDocuments.some(doc => doc.id === id);
  };
  
  const openDocumentsValue = {
    openDocuments,
    addOpenDocument,
    removeOpenDocument,
    isDocumentOpen
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
            <Route path="/users" component={() => <Users toggleSidebar={toggleSidebar} />} />
            <Route path="/translations" component={() => <Translations toggleSidebar={toggleSidebar} />} />
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
