import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useOpenDocuments } from "@/App";

interface SidebarProps {
  activePath: string;
}

export default function Sidebar({ activePath }: SidebarProps) {
  const [, navigate] = useLocation();
  const { openDocuments, getLastOpenDocument } = useOpenDocuments();
  
  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
    staleTime: 10000, // 10 seconds
  });

  return (
    <aside className="bg-white shadow-md w-64 flex-shrink-0 h-full overflow-y-auto hidden md:block">
      <div className="p-4 border-b border-neutral-light flex items-center">
        <svg className="h-10 w-10 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h1 className="text-lg font-semibold">VKS Studio</h1>
      </div>
      
      <nav className="px-2 py-4">
        <div className="mb-4">
          <Link href="/documents/new">
            <a className="w-full bg-primary text-white py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-dark transition cursor-pointer">
              <span className="material-icons text-sm mr-1">add</span>
              Nuovo Documento
            </a>
          </Link>
        </div>
        
        <ul className="space-y-1">
          <li>
            <Link href="/">
              <a className={`flex items-center px-4 py-2 rounded-md ${activePath === '/' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}>
                <span className={`material-icons mr-3 ${activePath === '/' ? '' : 'text-neutral-medium'}`}>dashboard</span>
                Dashboard
              </a>
            </Link>
          </li>
          <li>
            <div 
              onClick={(e) => {
                e.preventDefault();
                // Se c'è almeno un documento aperto, reindirizza all'ultimo documento aperto
                try {
                  // Recupera i documenti dal localStorage
                  const savedDocs = localStorage.getItem('openDocuments');
                  const storedDocs = JSON.parse(savedDocs || '[]');
                  
                  if (storedDocs.length > 0) {
                    // Se ci sono documenti nel localStorage, usa l'ultimo
                    const lastStoredDoc = storedDocs[storedDocs.length - 1];
                    navigate(`/documents/${lastStoredDoc.id}`);
                    console.log(`Navigazione diretta da localStorage: ${lastStoredDoc.id}`);
                  } else {
                    // Altrimenti, prova con il contesto
                    const lastDoc = getLastOpenDocument();
                    if (lastDoc) {
                      navigate(`/documents/${lastDoc.id}`);
                      console.log(`Navigazione a documento aperto: ${lastDoc.id}`);
                    } else {
                      // Se non c'è nulla, vai alla pagina dei documenti
                      navigate('/documents');
                      console.log('Nessun documento aperto, navigazione a /documents');
                    }
                  }
                } catch (error) {
                  console.error('Errore nel recuperare documenti dal localStorage:', error);
                  navigate('/documents');
                }
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/documents' || activePath.startsWith('/documents/') ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/documents' || activePath.startsWith('/documents/') ? '' : 'text-neutral-medium'}`}>description</span>
              Documenti
            </div>
          </li>
          <li>
            <div 
              onClick={(e) => {
                e.preventDefault();
                // Naviga alle distinte
                navigate('/components');
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/components' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/components' ? '' : 'text-neutral-medium'}`}>category</span>
              Distinte Base
            </div>
          </li>
          <li>
            <div 
              onClick={(e) => {
                e.preventDefault();
                navigate('/modules');
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/modules' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/modules' ? '' : 'text-neutral-medium'}`}>view_module</span>
              Libreria Moduli
            </div>
          </li>
          <li>
            <div 
              onClick={(e) => {
                e.preventDefault();
                navigate('/users');
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/users' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/users' ? '' : 'text-neutral-medium'}`}>people</span>
              Utenti
            </div>
          </li>
          <li>
            <div 
              onClick={(e) => {
                e.preventDefault();
                navigate('/translations');
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/translations' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/translations' ? '' : 'text-neutral-medium'}`}>translate</span>
              Traduzioni
            </div>
          </li>
          <li>
            <div 
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/settings' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/settings' ? '' : 'text-neutral-medium'}`}>settings</span>
              Impostazioni
            </div>
          </li>
        </ul>
      </nav>
      
      {activePath.startsWith('/documents/') && activePath !== '/documents/new' && (
        <div className="px-4 py-2 border-t border-neutral-light">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm text-neutral-dark">STRUTTURA DOCUMENTO</h3>
            <button className="text-primary hover:text-primary-dark">
              <span className="material-icons text-sm">add</span>
            </button>
          </div>
          
          <SimpleSectionTree documentId={activePath.split('/')[2]} />
        </div>
      )}
    </aside>
  );
}

// Renamed to avoid conflict with the main DocumentTreeView component
function SimpleSectionTree({ documentId }: { documentId: string }) {
  const { data: sections, isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/sections`],
    enabled: !!documentId && documentId !== 'new',
  });

  if (isLoading || !sections) {
    return <div className="text-sm text-neutral-medium py-2">Caricamento...</div>;
  }

  // Organize sections into a hierarchical structure
  const rootSections = sections.filter(section => !section.parentId);
  const childSections = sections.filter(section => section.parentId);

  const renderSection = (section: any, level = 0) => {
    const children = childSections.filter(child => child.parentId === section.id);
    const isFolder = children.length > 0;
    const isActive = false; // Set based on current section

    return (
      <div key={section.id}>
        <div className={`tree-item ${isActive ? 'tree-item-active' : ''} px-2 py-1 rounded-sm my-1 flex items-center`}>
          <span className={`material-icons text-sm mr-1 ${isActive ? 'text-primary' : 'text-neutral-medium'}`}>
            {isFolder ? 'folder' : 'article'}
          </span>
          <span>{section.title}</span>
        </div>
        
        {children.length > 0 && (
          <div className={`pl-4`}>
            {children.map(child => (
              <div key={child.id} className="tree-item px-2 py-1 rounded-sm my-1 flex items-center">
                <span className="material-icons text-sm mr-1 text-neutral-medium">label</span>
                <span>{child.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tree-view pl-1 text-sm">
      {rootSections.map(section => renderSection(section))}
      
      {rootSections.length === 0 && (
        <div className="text-sm text-neutral-medium py-2">Nessuna sezione disponibile</div>
      )}
    </div>
  );
}
