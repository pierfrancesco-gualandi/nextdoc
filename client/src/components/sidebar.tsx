import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useOpenDocuments } from "@/App";
import { useUser } from "@/contexts/UserContext";
import { canAccessDashboardSection, canPerformAction } from "@/lib/permissions";


interface SidebarProps {
  activePath: string;
}

export default function Sidebar({ activePath }: SidebarProps) {
  const [, navigate] = useLocation();
  const { openDocuments, getLastOpenDocument } = useOpenDocuments();
  const { selectedUser } = useUser();

  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
    staleTime: 10000, // 10 seconds
  });

  return (
    <aside className="bg-white shadow-md w-64 flex-shrink-0 h-full overflow-y-auto hidden md:block">
      <div className="p-4 border-b border-neutral-light flex items-center">
        <svg
          className="h-10 w-10 mr-2 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h1 className="text-lg font-semibold">N@xtDoc</h1>
      </div>



      <nav className="px-2 py-4">
        {/* Pulsante Nuovo Documento - solo per admin e editor */}
        {canPerformAction(selectedUser, 'createDocument') && (
          <div className="mb-4">
            <Link href="/documents/new">
              <a className="w-full bg-primary text-white py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-dark transition cursor-pointer">
                <span className="material-icons text-sm mr-1">add</span>
                Nuovo Documento
              </a>
            </Link>
          </div>
        )}

        <ul className="space-y-1">
          {/* Dashboard - accessibile a tutti */}
          {canAccessDashboardSection(selectedUser, 'documents') && (
            <li>
              <Link href="/">
                <a
                  className={`flex items-center px-4 py-2 rounded-md ${activePath === "/" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
                >
                  <span
                    className={`material-icons mr-3 ${activePath === "/" ? "text-white" : "text-neutral-medium"}`}
                  >
                    dashboard
                  </span>
                  Dashboard
                </a>
              </Link>
            </li>
          )}

          {/* Documenti - tutti tranne traduttore puro possono vedere documenti */}
          {(canPerformAction(selectedUser, 'viewDocument') || selectedUser?.role === 'reader') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  // Se c'è almeno un documento aperto, reindirizza all'ultimo documento aperto
                  try {
                    // Recupera i documenti dal localStorage
                    const savedDocs = localStorage.getItem("openDocuments");
                    const storedDocs = JSON.parse(savedDocs || "[]");

                    if (storedDocs.length > 0) {
                      // Se ci sono documenti nel localStorage, usa l'ultimo
                      const lastStoredDoc = storedDocs[storedDocs.length - 1];
                      navigate(`/documents/${lastStoredDoc.id}`);
                      console.log(
                        `Navigazione diretta da localStorage: ${lastStoredDoc.id}`,
                      );
                    } else {
                      // Altrimenti, prova con il contesto
                      const lastDoc = getLastOpenDocument();
                      if (lastDoc) {
                        navigate(`/documents/${lastDoc.id}`);
                        console.log(
                          `Navigazione a documento aperto: ${lastDoc.id}`,
                        );
                      } else {
                        // Se non c'è nulla, vai alla pagina dei documenti
                        navigate("/documents");
                        console.log(
                          "Nessun documento aperto, navigazione a /documents",
                        );
                      }
                    }
                  } catch (error) {
                    console.error(
                      "Errore nel recuperare documenti dal localStorage:",
                      error,
                    );
                    navigate("/documents");
                  }
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/documents" || activePath.startsWith("/documents/") ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/documents" || activePath.startsWith("/documents/") ? "text-white" : "text-neutral-medium"}`}
                >
                  description
                </span>
                Documenti
              </div>
            </li>
          )}

          {/* Distinte Base - solo admin e editor */}
          {canAccessDashboardSection(selectedUser, 'components') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/components");
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/components" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/components" ? "text-white" : "text-neutral-medium"}`}
                >
                  category
                </span>
                Distinte Base
              </div>
            </li>
          )}

          {/* Confronto Distinte - solo admin e editor */}
          {canAccessDashboardSection(selectedUser, 'bom') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/bom-comparison");
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/bom-comparison" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/bom-comparison" ? "text-white" : "text-neutral-medium"}`}
                >
                  compare_arrows
                </span>
                Confronto Distinte
              </div>
            </li>
          )}

          {/* Libreria Moduli - solo admin e editor */}
          {canAccessDashboardSection(selectedUser, 'modules') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/modules");
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/modules" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/modules" ? "text-white" : "text-neutral-medium"}`}
                >
                  view_module
                </span>
                Libreria Moduli
              </div>
            </li>
          )}

          {/* Gestione Utenti - solo admin */}
          {canAccessDashboardSection(selectedUser, 'users') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/users");
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/users" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/users" ? "text-white" : "text-neutral-medium"}`}
                >
                  people
                </span>
                Utenti
              </div>
            </li>
          )}

          {/* Traduzioni - solo traduttori e admin */}
          {canAccessDashboardSection(selectedUser, 'translations') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/translations");
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/translations" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/translations" ? "text-white" : "text-neutral-medium"}`}
                >
                  translate
                </span>
                Traduzioni
              </div>
            </li>
          )}

          {/* Impostazioni - solo admin */}
          {canAccessDashboardSection(selectedUser, 'settings') && (
            <li>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/settings");
                }}
                className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${activePath === "/settings" ? "bg-primary text-white font-medium" : "text-neutral-dark hover:bg-neutral-lightest transition"}`}
              >
                <span
                  className={`material-icons mr-3 ${activePath === "/settings" ? "text-white" : "text-neutral-medium"}`}
                >
                  settings
                </span>
                Impostazioni
              </div>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}

// Renamed to avoid conflict with the main DocumentTreeView component
// Define section type outside the component
interface Section {
  id: number;
  title: string;
  parentId: number | null;
  documentId: number;
  order: number;
  description: string | null;
  isModule: boolean | null;
}

function SimpleSectionTree({ documentId }: { documentId: string }) {
  const { data: sections, isLoading } = useQuery<Section[]>({
    queryKey: [`/api/documents/${documentId}/sections`],
    enabled: !!documentId && documentId !== "new",
  });

  if (isLoading || !sections) {
    return (
      <div className="text-sm text-neutral-medium py-2">Caricamento...</div>
    );
  }

  // Use the Section interface defined above

  // Organize sections into a hierarchical structure
  const rootSections = (sections as Section[]).filter(
    (section) => !section.parentId,
  );
  const childSections = (sections as Section[]).filter(
    (section) => section.parentId,
  );

  const renderSection = (section: Section, level = 0) => {
    const children = childSections.filter(
      (child) => child.parentId === section.id,
    );
    const isFolder = children.length > 0;
    const isActive = false; // Set based on current section

    return (
      <div key={section.id}>
        <div
          className={`tree-item ${isActive ? "tree-item-active" : ""} px-2 py-1 rounded-sm my-1 flex items-center`}
        >
          <span
            className={`material-icons text-sm mr-1 ${isActive ? "text-primary" : "text-neutral-medium"}`}
          >
            {isFolder ? "folder" : "article"}
          </span>
          <span>{section.title}</span>
        </div>

        {children.length > 0 && (
          <div className={`pl-4`}>
            {children.map((child: Section) => (
              <div
                key={child.id}
                className="tree-item px-2 py-1 rounded-sm my-1 flex items-center"
              >
                <span className="material-icons text-sm mr-1 text-neutral-medium">
                  label
                </span>
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
      {rootSections.map((section: Section) => renderSection(section))}

      {rootSections.length === 0 && (
        <div className="text-sm text-neutral-medium py-2">
          Nessuna sezione disponibile
        </div>
      )}
    </div>
  );
}
