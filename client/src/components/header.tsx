import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ExportDropdown } from "./export-dropdown";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import UserSelectorDialog from "./user-selector-dialog";

interface HeaderProps {
  title?: string;
  documentId?: string;
  status?: string;
  showTabs?: boolean;
  onSave?: () => void;
  onClose?: () => void;
  toggleSidebar?: () => void;
}

export default function Header({ 
  title = "", 
  documentId,
  status = "draft",
  showTabs = false,
  onSave,
  onClose,
  toggleSidebar
}: HeaderProps) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("editor");
  const { toast } = useToast();
  
  // Stati per gestire i dropdown
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  
  // Refs per gestire i click esterni
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: documentVersions } = useQuery({
    queryKey: documentId ? [`/api/documents/${documentId}/versions`] : ["no-versions"],
    enabled: !!documentId && documentId !== 'new',
  });
  
  // Ottieni l'utente corrente
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // Usa il contesto utente
  const { currentUserId, displayName, userBadgeColor, currentUserRole, setUserDetails } = useUser();

  // Format status for display
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case "draft": return { label: "Bozza", bgClass: "bg-info bg-opacity-10 text-info" };
      case "in_review": return { label: "In Revisione", bgClass: "bg-info bg-opacity-10 text-info" };
      case "approved": return { label: "Approvato", bgClass: "bg-success bg-opacity-10 text-success" };
      case "obsolete": return { label: "Obsoleto", bgClass: "bg-error bg-opacity-10 text-error" };
      default: return { label: status, bgClass: "bg-info bg-opacity-10 text-info" };
    }
  };
  
  const statusDisplay = getStatusDisplay(status);
  
  const showVersionHistory = () => {
    toast({
      title: "Cronologia versioni",
      description: "Funzionalità in sviluppo"
    });
    setVersionMenuOpen(!versionMenuOpen);
  };
  
  const showComments = () => {
    toast({
      title: "Commenti",
      description: "Funzionalità in sviluppo"
    });
  };
  
  // Gestisce i click esterni per chiudere i dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Per il menu versioni
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(event.target as Node)) {
        setVersionMenuOpen(false);
      }
      
      // Per il menu altro
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-neutral-light">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <button 
            className="md:hidden p-2 mr-2 rounded-full hover:bg-neutral-lightest"
            onClick={toggleSidebar}
          >
            <span className="material-icons">menu</span>
          </button>
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium">{title}</h2>
            {status && (
              <span className={`status-badge ${statusDisplay.bgClass}`}>
                {statusDisplay.label}
              </span>
            )}
            {displayName && (
              <div 
                className="flex items-center ml-4 px-3 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                style={{ 
                  backgroundColor: `${userBadgeColor}20`,
                  color: userBadgeColor,
                  borderColor: `${userBadgeColor}40`,
                  border: "1px solid"
                }}
                onClick={() => setUserSelectorOpen(true)}
                title="Clicca per cambiare utente"
              >
                <User className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">{displayName}</span>
              </div>
            )}
            
            {/* Dialog per la selezione dell'utente */}
            <UserSelectorDialog 
              isOpen={userSelectorOpen}
              onClose={(userId, userRole, displayName, badgeColor) => {
                setUserDetails(userId, userRole, displayName, badgeColor);
                setUserSelectorOpen(false);
                toast({
                  title: "Utente cambiato",
                  description: `Ora stai utilizzando ${displayName} con ruolo ${userRole}`
                });
              }}
              onCancel={() => setUserSelectorOpen(false)}
            />
          </div>
        </div>
        
        {documentId && (
          <div className="flex items-center space-x-2">
            <div className="relative" ref={versionDropdownRef}>
              <button 
                className="p-2 rounded-full hover:bg-neutral-lightest has-tooltip"
                onClick={showVersionHistory}
              >
                <span className="material-icons">history</span>
                <span className="tooltip -mt-10">Cronologia</span>
              </button>
              
              {versionMenuOpen && documentVersions && Array.isArray(documentVersions) && documentVersions.length > 0 && (
                <div className="absolute right-0 mt-2 bg-white p-2 rounded shadow-lg z-50">
                  <h4 className="text-sm font-medium text-neutral-dark mb-2 px-2">Versioni recenti</h4>
                  {documentVersions.slice(0, 3).map((version: any) => (
                    <div key={version.id} className="px-2 py-1 hover:bg-neutral-lightest rounded text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">v{version.version}</span>
                        <span className="text-neutral-medium text-xs">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-dark">{version.notes || "Nessuna nota"}</div>
                    </div>
                  ))}
                  <div className="mt-2 text-center">
                    <a href="#" className="text-primary text-xs font-medium">Visualizza tutte</a>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              className="p-2 rounded-full hover:bg-neutral-lightest has-tooltip"
              onClick={showComments}
            >
              <span className="material-icons">comment</span>
              <span className="tooltip -mt-10">Commenti</span>
            </button>
            
            <div className="relative" ref={moreDropdownRef}>
              <button 
                className="p-2 rounded-full hover:bg-neutral-lightest has-tooltip"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              >
                <span className="material-icons">more_vert</span>
                <span className="tooltip -mt-10">Altro</span>
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded shadow-lg z-50 min-w-[160px]">
                  <a href="#" className="block px-4 py-2 text-sm hover:bg-neutral-lightest">
                    <span className="material-icons text-sm mr-2">content_copy</span>
                    Duplica
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm hover:bg-neutral-lightest">
                    <span className="material-icons text-sm mr-2">share</span>
                    Condividi
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm hover:bg-neutral-lightest">
                    <span className="material-icons text-sm mr-2">delete</span>
                    Elimina
                  </a>
                </div>
              )}
            </div>
            
            <div className="border-l border-neutral-light h-6 mx-2"></div>
            
            <Button 
              className="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-md flex items-center text-sm"
              onClick={onSave}
            >
              <span className="material-icons text-sm mr-1">save</span>
              Salva
            </Button>
            
            {onClose && (
              <Button 
                variant="outline"
                className="px-4 py-1.5 rounded-md flex items-center text-sm"
                onClick={onClose}
              >
                <span className="material-icons text-sm mr-1">close</span>
                Chiudi
              </Button>
            )}
            
            <ExportDropdown documentId={documentId} />
          </div>
        )}
      </div>
      
      {showTabs && (
        <div className="flex px-4 border-t border-neutral-light">
          <button 
            className={`px-4 py-2 border-b-2 ${activeTab === 'editor' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-dark hover:text-neutral-darkest'}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button 
            className={`px-4 py-2 border-b-2 ${activeTab === 'preview' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-dark hover:text-neutral-darkest'}`}
            onClick={() => setActiveTab('preview')}
          >
            Anteprima
          </button>
          <button 
            className={`px-4 py-2 border-b-2 ${activeTab === 'bom' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-dark hover:text-neutral-darkest'}`}
            onClick={() => setActiveTab('bom')}
          >
            Distinta Base
          </button>
          <button 
            className={`px-4 py-2 border-b-2 ${activeTab === 'permissions' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-dark hover:text-neutral-darkest'}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permessi
          </button>
          <button 
            className={`px-4 py-2 border-b-2 ${activeTab === 'history' ? 'border-primary text-primary font-medium' : 'border-transparent text-neutral-dark hover:text-neutral-darkest'}`}
            onClick={() => setActiveTab('history')}
          >
            Cronologia
          </button>
        </div>
      )}
    </header>
  );
}
