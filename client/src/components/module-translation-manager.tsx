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
  const { data: sections } = useQuery<any[]>({
    queryKey: ['/api/documents', selectedDocument, 'sections'],
    enabled: !!selectedDocument,
  });

  // Fetch languages
  const { data: languages } = useQuery<any[]>({
    queryKey: ['/api/languages'],
  });

  // Fetch modules for selected section
  const { data: modules, isLoading: isLoadingModules } = useQuery<any[]>({
    queryKey: ['/api/sections', selectedSection, 'modules'],
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
      {selectedSection && (
        <Card>
          <CardHeader>
            <CardTitle>Moduli in {getSectionName(selectedSection)}</CardTitle>
            <CardDescription>
              Seleziona un modulo per gestire la sua traduzione.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingModules ? (
              <div className="text-center py-8">Caricamento moduli...</div>
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}