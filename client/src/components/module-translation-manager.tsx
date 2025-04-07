import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ModuleTranslationManager() {
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch documents
  const { data: documents } = useQuery<any[]>({
    queryKey: ['/api/documents'],
  });

  // Fetch sections for selected document
  const { data: sections, isLoading: isLoadingSections } = useQuery<any[]>({
    queryKey: ['/api/documents', selectedDocument, 'sections'],
    queryFn: async () => {
      if (!selectedDocument) return [];
      const response = await fetch(`/api/documents/${selectedDocument}/sections`);
      if (!response.ok) {
        throw new Error(`Errore nel caricamento delle sezioni: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedDocument,
  });

  // Fetch languages
  const { data: languages } = useQuery<any[]>({
    queryKey: ['/api/languages'],
  });

  // Fetch all modules from the selected document
  const { data: allModules, isLoading: isLoadingAllModules } = useQuery<any[]>({
    queryKey: ['/api/modules'],
    enabled: !!selectedDocument,
    queryFn: async () => {
      const modulesData = [];
      if (sections && sections.length > 0) {
        for (const section of sections) {
          try {
            const response = await fetch(`/api/sections/${section.id}/modules`);
            if (response.ok) {
              const sectionModules = await response.json();
              // Aggiungiamo informazioni sulla sezione per poterle visualizzare
              const modulesWithSection = sectionModules.map((module: any) => ({
                ...module,
                sectionInfo: {
                  id: section.id,
                  title: section.title
                }
              }));
              modulesData.push(...modulesWithSection);
            }
          } catch (error) {
            console.error(`Errore nel caricamento dei moduli per la sezione ${section.id}:`, error);
          }
        }
      }
      return modulesData;
    }
  });

  // Fetch modules for selected section
  const { data: modules, isLoading: isLoadingModules } = useQuery<any[]>({
    queryKey: ['/api/sections', selectedSection, 'modules'],
    queryFn: async () => {
      if (!selectedSection) return [];
      const response = await fetch(`/api/sections/${selectedSection}/modules`);
      if (!response.ok) {
        throw new Error(`Errore nel caricamento dei moduli: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedSection,
  });

  // Funzione per filtrare i moduli per tipo e query di ricerca
  const filteredModules = modules?.filter(module => {
    const matchesQuery = searchQuery ? 
      (module.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       JSON.stringify(module.content).toLowerCase().includes(searchQuery.toLowerCase())) : 
      true;
    
    return matchesQuery;
  });

  // Funzione per ottenere il nome del tipo di modulo in italiano
  const getModuleTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      'text': 'Testo',
      'image': 'Immagine',
      'video': 'Video',
      'table': 'Tabella',
      'checklist': 'Checklist',
      'warning': 'Avvertenza',
      '3d-model': 'Modello 3D',
      'pdf': 'PDF',
      'link': 'Link',
      'component': 'Componente',
      'bom': 'Elenco Componenti'
    };
    return types[type] || type;
  };

  // Funzione per ottenere il nome della sezione
  const getSectionName = (sectionId: number) => {
    const section = sections?.find(s => s.id === sectionId);
    return section ? section.title : 'Sezione sconosciuta';
  };

  // Funzione per ottenere lo stato di traduzione di un modulo
  const getTranslationStatus = (moduleId: number, languageId: number) => {
    // Qui dovresti fare una query per verificare lo stato della traduzione
    // Per ora ritorniamo un valore statico
    return 'Non tradotto';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Traduzioni Moduli</CardTitle>
          <CardDescription>
            Gestisci le traduzioni di moduli individuali, inclusi testi, tabelle ed elenchi componenti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document-select">Seleziona documento</Label>
              <Select
                value={selectedDocument?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedDocument(parseInt(value));
                  setSelectedSection(null);
                }}
              >
                <SelectTrigger id="document-select">
                  <SelectValue placeholder="Seleziona un documento" />
                </SelectTrigger>
                <SelectContent>
                  {documents?.map(doc => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-select">Seleziona sezione</Label>
              <Select
                value={selectedSection?.toString() || ''}
                onValueChange={(value) => setSelectedSection(parseInt(value))}
                disabled={!selectedDocument}
              >
                <SelectTrigger id="section-select">
                  <SelectValue placeholder={selectedDocument ? "Seleziona una sezione" : "Prima seleziona un documento"} />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map(section => (
                    <SelectItem key={section.id} value={section.id.toString()}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language-select">Lingua di destinazione</Label>
              <Select
                value={selectedLanguage?.toString() || ''}
                onValueChange={(value) => setSelectedLanguage(parseInt(value))}
              >
                <SelectTrigger id="language-select">
                  <SelectValue placeholder="Seleziona una lingua" />
                </SelectTrigger>
                <SelectContent>
                  {languages?.filter(lang => lang.isActive).map(language => (
                    <SelectItem key={language.id} value={language.id.toString()}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="search-modules">Cerca moduli</Label>
            <Input
              id="search-modules"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per tipo o contenuto..."
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabella dei moduli disponibili */}
      {isLoadingSections ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="mb-2">Caricamento sezioni...</div>
            <Progress value={20} className="w-1/2 mx-auto" />
          </CardContent>
        </Card>
      ) : selectedDocument ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSection ? `Moduli in ${getSectionName(selectedSection)}` : 'Tutti i moduli nel documento'}
            </CardTitle>
            <CardDescription>
              {selectedSection ? 'Moduli specifici della sezione selezionata.' : 'Seleziona una sezione specifica per filtrare i moduli, o gestisci direttamente tutti i moduli del documento.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSection ? (
              isLoadingModules ? (
                <div className="text-center py-8">
                  <div className="mb-2">Caricamento moduli...</div>
                  <Progress value={60} className="w-1/2 mx-auto" />
                </div>
              ) : filteredModules && filteredModules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Anteprima Contenuto</TableHead>
                      <TableHead>Stato Traduzione</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModules.map(module => (
                      <TableRow key={module.id}>
                        <TableCell>
                          <Badge className={module.type === 'bom' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>
                            {getModuleTypeName(module.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {module.type === 'text' ? (
                            <div className="max-w-xs truncate">
                              {(() => {
                                try {
                                  const content = JSON.parse(module.content);
                                  return content.text?.slice(0, 50) + (content.text?.length > 50 ? '...' : '');
                                } catch (e) {
                                  return 'Errore nel parsing del contenuto';
                                }
                              })()}
                            </div>
                          ) : module.type === 'bom' ? (
                            <div className="font-medium text-blue-600">Elenco Componenti (BOM)</div>
                          ) : (
                            <div className="italic text-neutral-medium">Contenuto non testuale</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {selectedLanguage ? (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                              {getTranslationStatus(module.id, selectedLanguage)}
                            </Badge>
                          ) : (
                            <span className="text-neutral-medium">Seleziona una lingua</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            asChild
                            disabled={!selectedLanguage}
                          >
                            <Link href={`/module-translation/${module.id}`}>
                              Traduci
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-neutral-medium">
                  {modules?.length === 0 ? 
                    "Nessun modulo trovato in questa sezione" : 
                    "Nessun modulo corrisponde alla ricerca"}
                </div>
              )
            ) : (
              // Se nessuna sezione è selezionata, mostra tutti i moduli di tutte le sezioni
              isLoadingAllModules ? (
                <div className="text-center py-8">
                  <div className="mb-2">Caricamento di tutti i moduli...</div>
                  <Progress value={40} className="w-1/2 mx-auto" />
                </div>
              ) : allModules && allModules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sezione</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Anteprima Contenuto</TableHead>
                      <TableHead>Stato Traduzione</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allModules
                      .filter(module => {
                        // Filtra in base alla query di ricerca
                        if (!searchQuery) return true;
                        
                        return module.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          JSON.stringify(module.content).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          module.sectionInfo?.title.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map(module => (
                        <TableRow key={module.id}>
                          <TableCell>
                            <div className="font-medium">
                              {module.sectionInfo?.title || 'Sezione sconosciuta'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={module.type === 'bom' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>
                              {getModuleTypeName(module.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {module.type === 'text' ? (
                              <div className="max-w-xs truncate">
                                {(() => {
                                  try {
                                    const content = JSON.parse(module.content);
                                    return content.text?.slice(0, 50) + (content.text?.length > 50 ? '...' : '');
                                  } catch (e) {
                                    return 'Errore nel parsing del contenuto';
                                  }
                                })()}
                              </div>
                            ) : module.type === 'bom' ? (
                              <div className="font-medium text-blue-600">Elenco Componenti (BOM)</div>
                            ) : (
                              <div className="italic text-neutral-medium">Contenuto non testuale</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {selectedLanguage ? (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                {getTranslationStatus(module.id, selectedLanguage)}
                              </Badge>
                            ) : (
                              <span className="text-neutral-medium">Seleziona una lingua</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              asChild
                              disabled={!selectedLanguage}
                            >
                              <Link href={`/module-translation/${module.id}`}>
                                Traduci
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-neutral-medium">
                  {!allModules ? 
                    "Errore nel caricamento dei moduli" :
                    allModules.length === 0 ? 
                      "Nessun modulo trovato in questo documento" : 
                      "Nessun modulo corrisponde alla ricerca"}
                </div>
              )
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8 text-neutral-medium">
            Seleziona un documento per visualizzare i suoi moduli
          </CardContent>
        </Card>
      )}
    </div>
  );
}