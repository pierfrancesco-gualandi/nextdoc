import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ModulesLibraryProps {
  toggleSidebar?: () => void;
}

export default function ModulesLibrary({ toggleSidebar }: ModulesLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch modules (sections with isModule=true)
  const { data: modules, isLoading } = useQuery({
    queryKey: ['/api/modules-library'],
  });
  
  // Mutation to mark a section as a module
  const saveAsModuleMutation = useMutation({
    mutationFn: async (sectionId: number) => {
      const res = await apiRequest('PUT', `/api/sections/${sectionId}`, {
        isModule: true
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules-library'] });
      toast({
        title: "Modulo salvato",
        description: "La sezione è stata salvata come modulo riutilizzabile"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Filter modules based on search query
  const filteredModules = modules ? 
    modules.filter((module: any) => 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.description && module.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : [];
  
  return (
    <>
      <Header title="Libreria Moduli" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Libreria Moduli</h1>
              <p className="text-neutral-dark">Gestisci e riutilizza moduli salvati</p>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="relative">
              <Input
                className="pl-10"
                placeholder="Cerca moduli..."
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
              {filteredModules.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredModules.map((module: any) => (
                    <Card key={module.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary">
                            Modulo
                          </Badge>
                        </div>
                        <CardDescription>
                          Da: Documento #{module.documentId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-neutral-dark line-clamp-2">
                          {module.description || "Nessuna descrizione disponibile"}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline">
                          <span className="material-icons text-sm mr-1">preview</span>
                          Anteprima
                        </Button>
                        <Button>
                          <span className="material-icons text-sm mr-1">add</span>
                          Usa
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="material-icons text-4xl text-neutral-medium mb-2">view_module</span>
                  <h3 className="text-lg font-medium text-neutral-dark mb-2">Nessun modulo trovato</h3>
                  <p className="text-neutral-medium mb-4">
                    {searchQuery 
                      ? `Nessun risultato per "${searchQuery}"` 
                      : "Salva sezioni come moduli per poterle riutilizzare"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
