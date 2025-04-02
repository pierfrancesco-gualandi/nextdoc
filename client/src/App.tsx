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
import { useState } from "react";

function Router() {
  const [location] = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);
  
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };
  
  return (
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
