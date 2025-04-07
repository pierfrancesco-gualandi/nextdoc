import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import TranslationComponentLink from "@/components/translation-component-link";
import ModuleTranslationManager from "@/components/module-translation-manager";

// Componenti interni per organizzare la pagina

// Sezione gestione lingue
function LanguagesManager() {
  const { data: languages = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/languages'],
  });

  const [newLanguage, setNewLanguage] = useState({ name: '', code: '', isActive: true });

  if (isLoading) return <div className="p-8 text-center">Caricamento lingue...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Errore nel caricamento delle lingue</div>;

  const handleAddLanguage = async () => {
    try {
      const response = await fetch('/api/languages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLanguage),
      });

      if (response.ok) {
        setNewLanguage({ name: '', code: '', isActive: true });
        refetch();
      }
    } catch (error) {
      console.error('Errore durante l\'aggiunta della lingua:', error);
    }
  };

  const handleToggleLanguage = async (id: number, isActive: boolean) => {
    try {
      await fetch(`/api/languages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      refetch();
    } catch (error) {
      console.error('Errore durante la modifica della lingua:', error);
    }
  };

  const handleSetDefaultLanguage = async (id: number) => {
    try {
      await fetch(`/api/languages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isDefault: true }),
      });
      refetch();
    } catch (error) {
      console.error('Errore durante l\'impostazione della lingua predefinita:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aggiungi nuova lingua</CardTitle>
          <CardDescription>Inserisci i dettagli della nuova lingua da supportare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                value={newLanguage.name} 
                onChange={(e) => setNewLanguage({...newLanguage, name: e.target.value})} 
                placeholder="es. Italiano" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Codice ISO</Label>
              <Input 
                id="code" 
                value={newLanguage.code} 
                onChange={(e) => setNewLanguage({...newLanguage, code: e.target.value})} 
                placeholder="es. it" 
                maxLength={5}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Switch 
              id="isActive" 
              checked={newLanguage.isActive} 
              onCheckedChange={(checked) => setNewLanguage({...newLanguage, isActive: checked})} 
            />
            <Label htmlFor="isActive">Attiva</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddLanguage} disabled={!newLanguage.name || !newLanguage.code}>
            Aggiungi lingua
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lingue disponibili</CardTitle>
          <CardDescription>Gestisci le lingue supportate dall'applicazione</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lingua</TableHead>
                <TableHead>Codice</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages?.map((language: any) => (
                <TableRow key={language.id}>
                  <TableCell className="font-medium">{language.name}</TableCell>
                  <TableCell>{language.code}</TableCell>
                  <TableCell>
                    <Badge className={language.isActive ? "" : "bg-gray-100 text-gray-800 border-gray-200"}>
                      {language.isActive ? "Attiva" : "Disattivata"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {language.isDefault ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">Predefinita</Badge>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSetDefaultLanguage(language.id)}
                      >
                        Imposta default
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant={language.isActive ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => handleToggleLanguage(language.id, language.isActive)}
                      >
                        {language.isActive ? "Disattiva" : "Attiva"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Sezione assegnazioni traduzioni
function TranslationAssignments() {
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: languages } = useQuery({
    queryKey: ['/api/languages'],
  });
  
  const { data: assignments, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/translation-assignments'],
  });

  const [newAssignment, setNewAssignment] = useState({
    userId: '',
    languageId: '',
    isReviewer: false
  });

  if (isLoading) return <div className="p-8 text-center">Caricamento assegnazioni...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Errore nel caricamento delle assegnazioni</div>;

  const handleAddAssignment = async () => {
    try {
      const response = await fetch('/api/translation-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(newAssignment.userId),
          languageId: parseInt(newAssignment.languageId),
          isReviewer: newAssignment.isReviewer
        }),
      });

      if (response.ok) {
        setNewAssignment({ userId: '', languageId: '', isReviewer: false });
        refetch();
      }
    } catch (error) {
      console.error('Errore durante l\'aggiunta dell\'assegnazione:', error);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      await fetch(`/api/translation-assignments/${id}`, {
        method: 'DELETE',
      });
      refetch();
    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'assegnazione:', error);
    }
  };

  // Funzione per ottenere il nome della lingua dall'ID
  const getLanguageName = (languageId: number) => {
    const language = languages?.find((lang: any) => lang.id === languageId);
    return language ? language.name : 'Sconosciuta';
  };

  // Funzione per ottenere il nome dell'utente dall'ID
  const getUserName = (userId: number) => {
    const user = users?.find((user: any) => user.id === userId);
    return user ? user.name : 'Sconosciuto';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuova assegnazione</CardTitle>
          <CardDescription>Assegna un utente come traduttore o revisore di una lingua</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Utente</Label>
              <select 
                id="userId" 
                className="w-full p-2 border rounded"
                value={newAssignment.userId}
                onChange={(e) => setNewAssignment({...newAssignment, userId: e.target.value})}
              >
                <option value="">Seleziona un utente</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.username})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="languageId">Lingua</Label>
              <select 
                id="languageId" 
                className="w-full p-2 border rounded"
                value={newAssignment.languageId}
                onChange={(e) => setNewAssignment({...newAssignment, languageId: e.target.value})}
              >
                <option value="">Seleziona una lingua</option>
                {languages?.filter((lang: any) => lang.isActive).map((language: any) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Switch 
              id="isReviewer" 
              checked={newAssignment.isReviewer} 
              onCheckedChange={(checked) => setNewAssignment({...newAssignment, isReviewer: checked})} 
            />
            <Label htmlFor="isReviewer">Assegna come revisore</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleAddAssignment} 
            disabled={!newAssignment.userId || !newAssignment.languageId}
          >
            Crea assegnazione
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assegnazioni attuali</CardTitle>
          <CardDescription>Gestisci le assegnazioni di traduzione esistenti</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Lingua</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((assignment: any) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{getUserName(assignment.userId)}</TableCell>
                  <TableCell>{getLanguageName(assignment.languageId)}</TableCell>
                  <TableCell>
                    <Badge className={assignment.isReviewer ? "bg-green-100 text-green-800 border-green-200" : ""}>
                      {assignment.isReviewer ? "Revisore" : "Traduttore"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                    >
                      Rimuovi
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {assignments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nessuna assegnazione disponibile
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Sezione importazione traduzioni
function TranslationImports() {
  const { data: languages } = useQuery({
    queryKey: ['/api/languages'],
  });

  const { data: imports, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/translation-imports'],
  });

  const [importData, setImportData] = useState({
    filename: '',
    format: 'json',
    languageId: '',
    fileContent: ''
  });

  if (isLoading) return <div className="p-8 text-center">Caricamento importazioni...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Errore nel caricamento delle importazioni</div>;

  const handleImport = async () => {
    try {
      // Prima creare l'importazione
      const createResponse = await fetch('/api/translation-imports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: importData.filename,
          format: importData.format,
          languageId: parseInt(importData.languageId),
          importedById: 1, // Utilizzare l'utente corrente
          status: 'pending'
        }),
      });

      if (createResponse.ok) {
        const importRecord = await createResponse.json();
        
        // Quindi processare il file di importazione
        try {
          const fileContent = JSON.parse(importData.fileContent);
          
          await fetch(`/api/translation-imports/${importRecord.id}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fileContent),
          });
          
          setImportData({
            filename: '',
            format: 'json',
            languageId: '',
            fileContent: ''
          });
          
          refetch();
        } catch (parseError) {
          console.error('Errore durante il parsing del contenuto JSON:', parseError);
          // Aggiornare lo stato dell'importazione a 'error'
          await fetch(`/api/translation-imports/${importRecord.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'error',
              details: { error: 'Errore di parsing JSON' }
            }),
          });
          refetch();
        }
      }
    } catch (error) {
      console.error('Errore durante l\'importazione:', error);
    }
  };

  // Funzione per ottenere il nome della lingua dall'ID
  const getLanguageName = (languageId: number) => {
    const language = languages?.find((lang: any) => lang.id === languageId);
    return language ? language.name : 'Sconosciuta';
  };

  // Funzione per formattare la data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importa traduzioni</CardTitle>
          <CardDescription>Carica un file JSON con le traduzioni</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Nome file</Label>
              <Input 
                id="filename" 
                value={importData.filename} 
                onChange={(e) => setImportData({...importData, filename: e.target.value})} 
                placeholder="es. traduzioni_marzo_2023" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="languageId">Lingua</Label>
              <select 
                id="languageId" 
                className="w-full p-2 border rounded"
                value={importData.languageId}
                onChange={(e) => setImportData({...importData, languageId: e.target.value})}
              >
                <option value="">Seleziona una lingua</option>
                {languages?.filter((lang: any) => lang.isActive).map((language: any) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="fileContent">Contenuto JSON</Label>
            <textarea 
              id="fileContent" 
              className="w-full h-32 p-2 border rounded font-mono text-sm"
              value={importData.fileContent} 
              onChange={(e) => setImportData({...importData, fileContent: e.target.value})} 
              placeholder='{ "sections": [...], "modules": [...] }'
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleImport} 
            disabled={!importData.filename || !importData.languageId || !importData.fileContent}
          >
            Importa traduzioni
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importazioni recenti</CardTitle>
          <CardDescription>Storico delle importazioni di traduzioni</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome file</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Lingua</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports?.map((importRecord: any) => (
                <TableRow key={importRecord.id}>
                  <TableCell className="font-medium">{importRecord.filename}</TableCell>
                  <TableCell>{formatDate(importRecord.importedAt)}</TableCell>
                  <TableCell>{getLanguageName(importRecord.languageId)}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        importRecord.status === 'success' ? "bg-green-100 text-green-800 border-green-200" : 
                        importRecord.status === 'error' ? "bg-red-100 text-red-800 border-red-200" : 
                        ""
                      }
                    >
                      {importRecord.status === 'success' ? "Completato" : 
                       importRecord.status === 'error' ? "Errore" : 
                       importRecord.status === 'partial' ? "Parziale" : 
                       "In corso"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!imports || imports.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nessuna importazione disponibile
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente per gestire le traduzioni delle sezioni con i componenti BOM associati
function SectionTranslationManager() {
  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });
  
  const { data: languages } = useQuery({
    queryKey: ['/api/languages'],
  });
  
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [translation, setTranslation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  
  // Carica le sezioni quando viene selezionato un documento
  const loadSections = async (documentId: string) => {
    if (!documentId) return;
    
    try {
      const response = await fetch(`/api/documents/${documentId}/sections`);
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle sezioni:', error);
    }
  };
  
  // Carica la traduzione quando viene selezionata una sezione e una lingua
  const loadTranslation = async () => {
    if (!selectedSection || !selectedLanguage) return;
    
    setLoading(true);
    setSaved(false);
    
    try {
      // Prima verifica se esiste già una traduzione
      const response = await fetch(`/api/section-translations?sectionId=${selectedSection}&languageId=${selectedLanguage}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setTranslation(data[0]);
        } else {
          // Se non esiste, crea un oggetto vuoto per una nuova traduzione
          const section = sections.length > 0 ? sections.find((s: any) => s.id === parseInt(selectedSection)) : null;
          setTranslation({
            sectionId: parseInt(selectedSection),
            languageId: parseInt(selectedLanguage),
            title: section?.title || '',
            description: section?.description || '',
            status: 'draft',
            translatedById: 1, // Utilizzare l'utente corrente
            reviewedById: null,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento della traduzione:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Gestisce il cambio di documento
  const handleDocumentChange = (documentId: string) => {
    setSelectedDocument(documentId);
    setSelectedSection('');
    setTranslation(null);
    setSections([]);
    if (documentId) {
      loadSections(documentId);
    }
  };
  
  // Salva la traduzione
  const handleSaveTranslation = async () => {
    if (!translation) return;
    
    setLoading(true);
    try {
      let response;
      
      if (translation.id) {
        // Aggiorna traduzione esistente
        response = await fetch(`/api/section-translations/${translation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: translation.title,
            description: translation.description,
            status: translation.status,
            translatedById: translation.translatedById,
            reviewedById: translation.reviewedById
          }),
        });
      } else {
        // Crea nuova traduzione
        response = await fetch('/api/section-translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(translation),
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        setTranslation(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Errore durante il salvataggio della traduzione:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Ottieni il nome della sezione
  const getSectionName = (sectionId: number) => {
    const section = sections.find((s: any) => s.id === sectionId);
    return section ? section.title : 'Sezione non trovata';
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestione Traduzioni Sezioni</CardTitle>
          <CardDescription>Traduci le sezioni e gestisci i componenti BOM associati</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="document">Documento</Label>
              <select 
                id="document" 
                className="w-full p-2 border rounded"
                value={selectedDocument}
                onChange={(e) => handleDocumentChange(e.target.value)}
              >
                <option value="">Seleziona un documento</option>
                {documents?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="section">Sezione</Label>
              <select 
                id="section" 
                className="w-full p-2 border rounded"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedDocument || sections.length === 0}
              >
                <option value="">Seleziona una sezione</option>
                {sections.map((section: any) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Lingua</Label>
              <select 
                id="language" 
                className="w-full p-2 border rounded"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="">Seleziona una lingua</option>
                {languages?.filter((lang: any) => lang.isActive && !lang.isDefault).map((language: any) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-center mb-6">
            <Button 
              onClick={loadTranslation}
              disabled={!selectedDocument || !selectedSection || !selectedLanguage}
            >
              Carica Traduzione
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Caricamento in corso...</p>
            </div>
          )}
          
          {!loading && translation && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titolo</Label>
                  <Input 
                    id="title" 
                    value={translation.title} 
                    onChange={(e) => setTranslation({...translation, title: e.target.value})} 
                    placeholder="Inserisci il titolo tradotto" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <textarea 
                    id="description" 
                    className="w-full p-2 border rounded min-h-24"
                    value={translation.description || ''} 
                    onChange={(e) => setTranslation({...translation, description: e.target.value})} 
                    placeholder="Inserisci la descrizione tradotta"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Stato</Label>
                  <select 
                    id="status" 
                    className="w-full p-2 border rounded"
                    value={translation.status}
                    onChange={(e) => setTranslation({...translation, status: e.target.value})}
                  >
                    <option value="draft">Bozza</option>
                    <option value="in_progress">In corso</option>
                    <option value="review">In revisione</option>
                    <option value="completed">Completata</option>
                  </select>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Componenti BOM associati</h3>
                {translation.id && (
                  <TranslationComponentLink 
                    translationId={translation.id} 
                    languageId={parseInt(selectedLanguage)} 
                  />
                )}
                {!translation.id && (
                  <p className="text-center py-4 text-gray-500 italic">
                    Salva la traduzione per gestire i componenti BOM associati
                  </p>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <Button 
                  onClick={handleSaveTranslation}
                  disabled={!translation.title}
                >
                  {translation.id ? 'Aggiorna traduzione' : 'Crea traduzione'}
                </Button>
                
                {saved && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Traduzione salvata con successo
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sezione stato traduzioni
function TranslationStatus() {
  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });

  const { data: languages } = useQuery({
    queryKey: ['/api/languages'],
  });

  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTranslationStatus = async () => {
    if (!selectedDocument || !selectedLanguage) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/documents/${selectedDocument}/translation-status/${selectedLanguage}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento dello stato di traduzione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stato traduzioni</CardTitle>
          <CardDescription>Verifica lo stato di traduzione per un documento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="document">Documento</Label>
              <select 
                id="document" 
                className="w-full p-2 border rounded"
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
              >
                <option value="">Seleziona un documento</option>
                {documents?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Lingua</Label>
              <select 
                id="language" 
                className="w-full p-2 border rounded"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="">Seleziona una lingua</option>
                {languages?.filter((lang: any) => lang.isActive && !lang.isDefault).map((language: any) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button 
            onClick={loadTranslationStatus} 
            disabled={!selectedDocument || !selectedLanguage || isLoading}
          >
            {isLoading ? "Caricamento..." : "Verifica stato"}
          </Button>

          {status && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Sezioni tradotte</Label>
                  <span className="text-sm font-medium">{status.translatedSections}/{status.totalSections}</span>
                </div>
                <Progress value={(status.translatedSections / status.totalSections) * 100} />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Moduli tradotti</Label>
                  <span className="text-sm font-medium">{status.translatedModules}/{status.totalModules}</span>
                </div>
                <Progress value={(status.translatedModules / status.totalModules) * 100} />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Sezioni revisionate</Label>
                  <span className="text-sm font-medium">{status.reviewedSections}/{status.totalSections}</span>
                </div>
                <Progress value={(status.reviewedSections / status.totalSections) * 100} />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <Label>Moduli revisionati</Label>
                  <span className="text-sm font-medium">{status.reviewedModules}/{status.totalModules}</span>
                </div>
                <Progress value={(status.reviewedModules / status.totalModules) * 100} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sezione AI Traduzione
function AITranslation() {
  const { data: languages } = useQuery({
    queryKey: ['/api/languages'],
  });

  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });

  const { data: aiRequests, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/translation-ai-requests'],
  });

  const [sections, setSections] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  const [requestData, setRequestData] = useState({
    documentId: '',
    sectionId: '',
    moduleId: '',
    sourceLanguageId: '',
    targetLanguageId: '',
    requestType: 'document' // document, section, module
  });

  // Carica le sezioni quando viene selezionato un documento
  const loadSections = async (documentId: string) => {
    if (!documentId) return;
    
    try {
      const response = await fetch(`/api/documents/${documentId}/sections`);
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle sezioni:', error);
    }
  };

  // Carica i moduli quando viene selezionata una sezione
  const loadModules = async (sectionId: string) => {
    if (!sectionId) return;
    
    try {
      const response = await fetch(`/api/sections/${sectionId}/modules`);
      if (response.ok) {
        const data = await response.json();
        setModules(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei moduli:', error);
    }
  };

  // Gestisce il cambio di documento
  const handleDocumentChange = (documentId: string) => {
    setRequestData({
      ...requestData,
      documentId,
      sectionId: '',
      moduleId: ''
    });
    setSections([]);
    setModules([]);
    if (documentId) {
      loadSections(documentId);
    }
  };

  // Gestisce il cambio di sezione
  const handleSectionChange = (sectionId: string) => {
    setRequestData({
      ...requestData,
      sectionId,
      moduleId: ''
    });
    setModules([]);
    if (sectionId) {
      loadModules(sectionId);
    }
  };

  // Gestisce il cambio di tipo di richiesta
  const handleRequestTypeChange = (requestType: string) => {
    setRequestData({
      ...requestData,
      requestType,
      sectionId: requestType === 'document' ? '' : requestData.sectionId,
      moduleId: requestType === 'document' || requestType === 'section' ? '' : requestData.moduleId
    });
  };

  const handleCreateAIRequest = async () => {
    try {
      // Determina l'ID dell'elemento da tradurre in base al tipo di richiesta
      let sourceId;
      switch (requestData.requestType) {
        case 'document':
          sourceId = parseInt(requestData.documentId);
          break;
        case 'section':
          sourceId = parseInt(requestData.sectionId);
          break;
        case 'module':
          sourceId = parseInt(requestData.moduleId);
          break;
      }

      if (!sourceId) {
        console.error('ID sorgente non valido');
        return;
      }

      const response = await fetch('/api/translation-ai-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceLanguageId: parseInt(requestData.sourceLanguageId),
          targetLanguageId: parseInt(requestData.targetLanguageId),
          requestedById: 1, // Utilizzare l'utente corrente
          requestType: requestData.requestType,
          sourceId: sourceId
        }),
      });

      if (response.ok) {
        // Resetta il form
        setRequestData({
          documentId: '',
          sectionId: '',
          moduleId: '',
          sourceLanguageId: '',
          targetLanguageId: '',
          requestType: 'document'
        });
        setSections([]);
        setModules([]);
        refetch();
      }
    } catch (error) {
      console.error('Errore durante la creazione della richiesta AI:', error);
    }
  };

  // Funzione per ottenere il nome della lingua dall'ID
  const getLanguageName = (languageId: number) => {
    const language = languages?.find((lang: any) => lang.id === languageId);
    return language ? language.name : 'Sconosciuta';
  };

  // Funzione per formattare la data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  if (isLoading) return <div className="p-8 text-center">Caricamento richieste AI...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Errore nel caricamento delle richieste AI</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Richiedi traduzione AI</CardTitle>
          <CardDescription>Genera traduzioni preliminari usando l'AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo di traduzione</Label>
              <div className="flex space-x-2">
                <Button 
                  variant={requestData.requestType === 'document' ? "default" : "outline"}
                  onClick={() => handleRequestTypeChange('document')}
                >
                  Documento completo
                </Button>
                <Button 
                  variant={requestData.requestType === 'section' ? "default" : "outline"}
                  onClick={() => handleRequestTypeChange('section')}
                >
                  Sezione
                </Button>
                <Button 
                  variant={requestData.requestType === 'module' ? "default" : "outline"}
                  onClick={() => handleRequestTypeChange('module')}
                >
                  Modulo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceLanguageId">Lingua originale</Label>
                <select 
                  id="sourceLanguageId" 
                  className="w-full p-2 border rounded"
                  value={requestData.sourceLanguageId}
                  onChange={(e) => setRequestData({...requestData, sourceLanguageId: e.target.value})}
                >
                  <option value="">Seleziona una lingua</option>
                  {languages?.filter((lang: any) => lang.isActive).map((language: any) => (
                    <option key={language.id} value={language.id}>
                      {language.name} ({language.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetLanguageId">Lingua di destinazione</Label>
                <select 
                  id="targetLanguageId" 
                  className="w-full p-2 border rounded"
                  value={requestData.targetLanguageId}
                  onChange={(e) => setRequestData({...requestData, targetLanguageId: e.target.value})}
                >
                  <option value="">Seleziona una lingua</option>
                  {languages?.filter((lang: any) => lang.isActive).map((language: any) => (
                    <option 
                      key={language.id} 
                      value={language.id} 
                      disabled={language.id.toString() === requestData.sourceLanguageId}
                    >
                      {language.name} ({language.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentId">Documento</Label>
              <select 
                id="documentId" 
                className="w-full p-2 border rounded"
                value={requestData.documentId}
                onChange={(e) => handleDocumentChange(e.target.value)}
              >
                <option value="">Seleziona un documento</option>
                {documents?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>

            {requestData.requestType !== 'document' && requestData.documentId && (
              <div className="space-y-2">
                <Label htmlFor="sectionId">Sezione</Label>
                <select 
                  id="sectionId" 
                  className="w-full p-2 border rounded"
                  value={requestData.sectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  disabled={!requestData.documentId || sections.length === 0}
                >
                  <option value="">Seleziona una sezione</option>
                  {sections.map((section: any) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {requestData.requestType === 'module' && requestData.sectionId && (
              <div className="space-y-2">
                <Label htmlFor="moduleId">Modulo</Label>
                <select 
                  id="moduleId" 
                  className="w-full p-2 border rounded"
                  value={requestData.moduleId}
                  onChange={(e) => setRequestData({...requestData, moduleId: e.target.value})}
                  disabled={!requestData.sectionId || modules.length === 0}
                >
                  <option value="">Seleziona un modulo</option>
                  {modules.map((module: any) => (
                    <option key={module.id} value={module.id}>
                      {module.type}: {module.content.text ? module.content.text.substring(0, 30) + '...' : 'Contenuto non testuale'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCreateAIRequest} 
            disabled={
              !requestData.sourceLanguageId || 
              !requestData.targetLanguageId || 
              !requestData.documentId ||
              (requestData.requestType === 'section' && !requestData.sectionId) ||
              (requestData.requestType === 'module' && (!requestData.sectionId || !requestData.moduleId))
            }
          >
            Richiedi traduzione AI
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Richieste di traduzione AI recenti</CardTitle>
          <CardDescription>Storico delle richieste di traduzione automatica</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Da</TableHead>
                <TableHead>A</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiRequests?.map((request: any) => (
                <TableRow key={request.id}>
                  <TableCell>{formatDate(request.requestedAt)}</TableCell>
                  <TableCell>
                    <Badge>
                      {request.requestType === 'document' ? 'Documento' : 
                       request.requestType === 'section' ? 'Sezione' : 
                       'Modulo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getLanguageName(request.sourceLanguageId)}</TableCell>
                  <TableCell>{getLanguageName(request.targetLanguageId)}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        request.status === 'completed' ? "bg-green-100 text-green-800 border-green-200" : 
                        request.status === 'error' ? "bg-red-100 text-red-800 border-red-200" : 
                        ""
                      }
                    >
                      {request.status === 'completed' ? "Completato" : 
                       request.status === 'error' ? "Errore" : 
                       "In corso"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!aiRequests || aiRequests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Nessuna richiesta AI disponibile
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principale della pagina
export default function Translations({ toggleSidebar }: { toggleSidebar: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-white border-b border-neutral-light p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="mr-4 md:hidden">
            <span className="material-icons">menu</span>
          </button>
          <h1 className="text-2xl font-semibold text-neutral-dark">Gestione Traduzioni</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 bg-neutral-lightest">
        <Tabs defaultValue="languages" className="w-full">
          <TabsList className="grid grid-cols-7 w-full max-w-5xl mx-auto mb-8">
            <TabsTrigger value="languages">Lingue</TabsTrigger>
            <TabsTrigger value="assignments">Assegnazioni</TabsTrigger>
            <TabsTrigger value="section-edit">Traduci Sezioni</TabsTrigger>
            <TabsTrigger value="module-edit">Traduzioni Moduli</TabsTrigger>
            <TabsTrigger value="imports">Importazioni</TabsTrigger>
            <TabsTrigger value="status">Stato</TabsTrigger>
            <TabsTrigger value="ai">AI Traduzioni</TabsTrigger>
          </TabsList>
          
          <div className="max-w-5xl mx-auto">
            <TabsContent value="languages">
              <LanguagesManager />
            </TabsContent>
            
            <TabsContent value="assignments">
              <TranslationAssignments />
            </TabsContent>
            
            <TabsContent value="section-edit">
              <SectionTranslationManager />
            </TabsContent>
            
            <TabsContent value="module-edit">
              <ModuleTranslationManager />
            </TabsContent>
            
            <TabsContent value="imports">
              <TranslationImports />
            </TabsContent>
            
            <TabsContent value="status">
              <TranslationStatus />
            </TabsContent>
            
            <TabsContent value="ai">
              <AITranslation />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}