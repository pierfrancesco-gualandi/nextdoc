import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDocumentStatus } from "@/lib/document-utils";

interface DashboardProps {
  toggleSidebar?: () => void;
}

export default function Dashboard({ toggleSidebar }: DashboardProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents', searchQuery],
    queryFn: async ({ queryKey }) => {
      const [_, query] = queryKey;
      const url = query ? `/api/documents?q=${encodeURIComponent(query)}` : '/api/documents';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      return await res.json();
    },
  });
  
  const handleCreateNew = () => {
    navigate('/documents/new');
  };
  
  return (
    <>
      <Header title="Dashboard" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">I tuoi documenti</h1>
              <p className="text-neutral-dark">Gestisci e crea documenti di istruzioni visive</p>
            </div>
            <Button onClick={handleCreateNew}>
              <span className="material-icons text-sm mr-1">add</span>
              Nuovo Documento
            </Button>
          </div>
          
          <div className="mb-6">
            <div className="relative">
              <Input
                className="pl-10"
                placeholder="Cerca per titolo o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="material-icons absolute left-3 top-2.5 text-neutral-medium">search</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-neutral-light rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-neutral-light rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-neutral-light rounded w-full mb-2"></div>
                    <div className="h-4 bg-neutral-light rounded w-3/4"></div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-8 bg-neutral-light rounded w-full"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {documents && documents.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc: any) => {
                    const statusDisplay = formatDocumentStatus(doc.status);
                    return (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{doc.title}</CardTitle>
                            <span className={`status-badge ${statusDisplay.bgClass}`}>
                              {statusDisplay.label}
                            </span>
                          </div>
                          <CardDescription>
                            Versione {doc.version}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-neutral-dark line-clamp-2">
                            {doc.description || "Nessuna descrizione disponibile"}
                          </p>
                          <p className="text-xs text-neutral-medium mt-2">
                            Ultimo aggiornamento: {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="outline" className="w-full">
                              <span className="material-icons text-sm mr-1">edit</span>
                              Modifica
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="material-icons text-4xl text-neutral-medium mb-2">description_off</span>
                  <h3 className="text-lg font-medium text-neutral-dark mb-2">Nessun documento trovato</h3>
                  <p className="text-neutral-medium mb-4">
                    {searchQuery ? `Nessun risultato per "${searchQuery}"` : "Inizia creando un nuovo documento"}
                  </p>
                  <Button onClick={handleCreateNew}>
                    <span className="material-icons text-sm mr-1">add</span>
                    Crea il primo documento
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
