import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useOpenDocuments } from "@/App";

interface SidebarProps {
  activePath: string;
}

export default function Sidebar({ activePath }: SidebarProps) {
  const [, navigate] = useLocation();
  const { openDocuments } = useOpenDocuments();
  
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
            {/* Reindirizza al documento aperto se c'è un documento aperto, altrimenti alla dashboard */}
            <a 
              onClick={(e) => {
                e.preventDefault();
                // Se c'è almeno un documento aperto, reindirizza all'ultimo documento aperto
                if (openDocuments.length > 0) {
                  const lastDocument = openDocuments[openDocuments.length - 1];
                  navigate(`/documents/${lastDocument.id}`);
                } else {
                  // Altrimenti, vai alla pagina dei documenti
                  navigate('/documents');
                }
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/documents' || activePath.startsWith('/documents/') ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/documents' || activePath.startsWith('/documents/') ? '' : 'text-neutral-medium'}`}>description</span>
              Documenti
            </a>
          </li>
          <li>
            <a 
              onClick={(e) => {
                e.preventDefault();
                // Se siamo in un documento e c'è almeno un documento aperto, memorizza il documento corrente
                if (activePath.startsWith('/documents/') && activePath !== '/documents/new') {
                  // Naviga alle distinte
                  navigate('/components');
                } else {
                  // Vai semplicemente alle distinte
                  navigate('/components');
                }
              }}
              className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === '/components' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}
            >
              <span className={`material-icons mr-3 ${activePath === '/components' ? '' : 'text-neutral-medium'}`}>category</span>
              Distinte Base
            </a>
          </li>
          <li>
            <Link href="/modules">
              <a className={`flex items-center px-4 py-2 rounded-md ${activePath === '/modules' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}>
                <span className={`material-icons mr-3 ${activePath === '/modules' ? '' : 'text-neutral-medium'}`}>view_module</span>
                Libreria Moduli
              </a>
            </Link>
          </li>
          <li>
            <Link href="/users">
              <a className={`flex items-center px-4 py-2 rounded-md ${activePath === '/users' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}>
                <span className={`material-icons mr-3 ${activePath === '/users' ? '' : 'text-neutral-medium'}`}>people</span>
                Utenti
              </a>
            </Link>
          </li>
          <li>
            <Link href="/translations">
              <a className={`flex items-center px-4 py-2 rounded-md ${activePath === '/translations' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}>
                <span className={`material-icons mr-3 ${activePath === '/translations' ? '' : 'text-neutral-medium'}`}>translate</span>
                Traduzioni
              </a>
            </Link>
          </li>
          <li>
            <Link href="/settings">
              <a className={`flex items-center px-4 py-2 rounded-md ${activePath === '/settings' ? 'bg-primary bg-opacity-10 text-primary font-medium' : 'text-neutral-dark hover:bg-neutral-lightest transition'}`}>
                <span className={`material-icons mr-3 ${activePath === '/settings' ? '' : 'text-neutral-medium'}`}>settings</span>
                Impostazioni
              </a>
            </Link>
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
