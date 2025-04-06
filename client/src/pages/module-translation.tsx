import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from 'wouter';
import Header from "@/components/header";
import ContentModule from "@/components/content-module";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModuleTranslationProps {
  toggleSidebar?: () => void;
}

export default function ModuleTranslation({ toggleSidebar }: ModuleTranslationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const moduleId = parseInt(params.id || "0");

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [translatedContent, setTranslatedContent] = useState<any>({});
  const [existingTranslation, setExistingTranslation] = useState<any>(null);

  // Fetch the original module
  const { data: module, isLoading: isLoadingModule } = useQuery<any>({
    queryKey: [`/api/modules/${moduleId}`],
    enabled: !isNaN(moduleId),
  });

  // Fetch section to get document ID
  const { data: section } = useQuery<any>({
    queryKey: [`/api/sections/${module?.sectionId}`],
    enabled: !!module?.sectionId,
  });

  // Fetch languages
  const { data: languages } = useQuery<any[]>({
    queryKey: ['/api/languages'],
  });

  // Fetch existing translation when language changes
  const { data: translation, isLoading: isLoadingTranslation } = useQuery<any>({
    queryKey: [`/api/content-module-translations`, moduleId, selectedLanguage],
    enabled: !!moduleId && !!selectedLanguage,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/content-module-translations?moduleId=${moduleId}&languageId=${selectedLanguage}`);
        if (!response.ok) {
          throw new Error("Errore nel caricamento della traduzione");
        }
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
      } catch (error) {
        console.error("Errore:", error);
        return null;
      }
    }
  });

  // Save or update translation mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = existingTranslation ? 'PUT' : 'POST';
      const endpoint = existingTranslation 
        ? `/api/content-module-translations/${existingTranslation.id}` 
        : '/api/content-module-translations';
      
      const response = await apiRequest(method, endpoint, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-module-translations`, moduleId, selectedLanguage] });
      toast({
        title: "Traduzione salvata",
        description: "La traduzione del modulo è stata salvata con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante il salvataggio: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Update translation state when module or language changes
  useEffect(() => {
    if (module && module.content) {
      if (typeof module.content === 'string') {
        try {
          const parsedContent = JSON.parse(module.content);
          // Initialize translated content with empty structure
          const initialTranslatedContent = { ...parsedContent };
          
          // Clear text-based content
          if (module.type === 'text' && initialTranslatedContent.text) {
            initialTranslatedContent.text = '';
          } else if (module.type === 'warning') {
            initialTranslatedContent.title = '';
            initialTranslatedContent.message = '';
          } else if (module.type === 'image' || module.type === 'video') {
            initialTranslatedContent.caption = '';
            initialTranslatedContent.alt = initialTranslatedContent.alt || '';
          } else if (module.type === 'table') {
            initialTranslatedContent.headers = initialTranslatedContent.headers.map(() => '');
            initialTranslatedContent.rows = initialTranslatedContent.rows.map((row: any[]) => row.map(() => ''));
            initialTranslatedContent.caption = '';
          } else if (module.type === 'checklist') {
            initialTranslatedContent.items = initialTranslatedContent.items.map((item: any) => ({ ...item, text: '' }));
          }
          
          setTranslatedContent(initialTranslatedContent);
        } catch (e) {
          console.error("Errore nel parsing del contenuto del modulo:", e);
        }
      }
    }
  }, [module]);

  // Update form with existing translation if available
  useEffect(() => {
    if (translation) {
      setExistingTranslation(translation);
      
      if (translation.content && typeof translation.content === 'string') {
        try {
          const parsedContent = JSON.parse(translation.content);
          setTranslatedContent(parsedContent);
        } catch (e) {
          console.error("Errore nel parsing della traduzione:", e);
        }
      }
    } else {
      setExistingTranslation(null);
    }
  }, [translation]);

  // Handle language selection
  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId);
  };

  // Handle text input change for different module types
  const handleTextChange = (value: string, field: string, index?: number, subIndex?: number) => {
    setTranslatedContent(prev => {
      const updated = { ...prev };
      
      if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        if (index !== undefined && subIndex !== undefined && Array.isArray(updated[parentField]) && updated[parentField][index]) {
          updated[parentField][index][childField] = value;
        } else if (index !== undefined && Array.isArray(updated[parentField])) {
          updated[parentField][index] = { ...updated[parentField][index], [childField]: value };
        } else if (updated[parentField]) {
          updated[parentField] = { ...updated[parentField], [childField]: value };
        }
      } else if (index !== undefined && subIndex !== undefined && field === 'rows') {
        updated.rows[index][subIndex] = value;
      } else if (index !== undefined && Array.isArray(updated[field])) {
        updated[field][index] = value;
      } else {
        updated[field] = value;
      }
      
      return updated;
    });
  };

  // Save translation
  const handleSaveTranslation = () => {
    if (!selectedLanguage || !module) return;
    
    const data = {
      moduleId: moduleId,
      languageId: parseInt(selectedLanguage),
      content: JSON.stringify(translatedContent),
      status: 'completed',
    };
    
    saveMutation.mutate(data);
  };

  if (isLoadingModule) {
    return (
      <>
        <Header title="Caricamento..." />
        <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
          <div className="text-center">Caricamento modulo...</div>
        </main>
      </>
    );
  }

  if (!module) {
    return (
      <>
        <Header title="Modulo non trovato" />
        <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
          <div className="text-center">Il modulo richiesto non è stato trovato.</div>
        </main>
      </>
    );
  }

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

  return (
    <>
      <Header 
        title={`Traduzione Modulo: ${getModuleTypeName(module.type)}`} 
        documentId={section?.documentId.toString()}
        toggleSidebar={toggleSidebar}
      />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest">
        <div className="container mx-auto py-6">
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="edit">Modifica Traduzione</TabsTrigger>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonna originale */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contenuto Originale</CardTitle>
                    <CardDescription>
                      Tipo: {getModuleTypeName(module.type)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-neutral-light rounded-lg p-4 mb-4">
                      <ContentModule
                        module={module}
                        onDelete={() => {}}
                        onUpdate={() => {}}
                        documentId={section?.documentId.toString() || ""}
                        isPreview={true}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Colonna traduzione */}
                <Card>
                  <CardHeader>
                    <CardTitle>Traduzione</CardTitle>
                    <div className="mt-2">
                      <Label htmlFor="language-select">Seleziona lingua</Label>
                      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                        <SelectTrigger id="language-select" className="w-full">
                          <SelectValue placeholder="Seleziona una lingua" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages?.map((language) => (
                            <SelectItem key={language.id} value={language.id.toString()}>
                              {language.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {!selectedLanguage ? (
                      <div className="text-center text-neutral-medium py-4">
                        Seleziona una lingua per iniziare la traduzione
                      </div>
                    ) : isLoadingTranslation ? (
                      <div className="text-center py-4">
                        Caricamento traduzione...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Form di traduzione in base al tipo di modulo */}
                        {module.type === 'text' && (
                          <div>
                            <Label htmlFor="text-content">Contenuto testuale</Label>
                            <Textarea
                              id="text-content"
                              value={translatedContent.text || ''}
                              onChange={(e) => handleTextChange(e.target.value, 'text')}
                              className="min-h-[200px]"
                              placeholder="Inserisci il testo tradotto..."
                            />
                          </div>
                        )}
                        
                        {module.type === 'warning' && (
                          <>
                            <div>
                              <Label htmlFor="warning-title">Titolo avvertenza</Label>
                              <Input
                                id="warning-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo dell'avvertenza tradotto..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="warning-message">Messaggio avvertenza</Label>
                              <Textarea
                                id="warning-message"
                                value={translatedContent.message || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'message')}
                                className="min-h-[150px]"
                                placeholder="Messaggio dell'avvertenza tradotto..."
                              />
                            </div>
                          </>
                        )}
                        
                        {(module.type === 'image' || module.type === 'video') && (
                          <>
                            {module.type === 'image' && (
                              <div>
                                <Label htmlFor="alt-text">Testo alternativo (alt)</Label>
                                <Input
                                  id="alt-text"
                                  value={translatedContent.alt || ''}
                                  onChange={(e) => handleTextChange(e.target.value, 'alt')}
                                  placeholder="Descrizione alternativa dell'immagine..."
                                />
                              </div>
                            )}
                            <div>
                              <Label htmlFor="caption">Didascalia</Label>
                              <Input
                                id="caption"
                                value={translatedContent.caption || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'caption')}
                                placeholder="Didascalia tradotta..."
                              />
                            </div>
                          </>
                        )}
                        
                        {module.type === 'table' && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="table-caption">Didascalia tabella</Label>
                              <Input
                                id="table-caption"
                                value={translatedContent.caption || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'caption')}
                                placeholder="Didascalia della tabella tradotta..."
                              />
                            </div>
                            
                            <div>
                              <Label>Intestazioni</Label>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                {translatedContent.headers && translatedContent.headers.map((header: string, index: number) => (
                                  <Input
                                    key={`header-${index}`}
                                    value={header}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers', index)}
                                    placeholder={`Intestazione ${index + 1}`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <Label>Righe</Label>
                              {translatedContent.rows && translatedContent.rows.map((row: string[], rowIndex: number) => (
                                <div key={`row-${rowIndex}`} className="grid grid-cols-2 gap-2 mb-2 sm:grid-cols-3 md:grid-cols-4">
                                  {row.map((cell: string, cellIndex: number) => (
                                    <Input
                                      key={`cell-${rowIndex}-${cellIndex}`}
                                      value={cell}
                                      onChange={(e) => handleTextChange(e.target.value, 'rows', rowIndex, cellIndex)}
                                      placeholder={`Cella ${rowIndex + 1}x${cellIndex + 1}`}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {module.type === 'checklist' && (
                          <div>
                            <Label>Elementi checklist</Label>
                            {translatedContent.items && translatedContent.items.map((item: any, index: number) => (
                              <div key={`item-${index}`} className="mb-2">
                                <Input
                                  value={item.text || ''}
                                  onChange={(e) => handleTextChange(e.target.value, 'items.text', index)}
                                  placeholder={`Elemento ${index + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {module.type === 'link' && (
                          <>
                            <div>
                              <Label htmlFor="link-text">Testo del link</Label>
                              <Input
                                id="link-text"
                                value={translatedContent.text || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'text')}
                                placeholder="Testo del link tradotto..."
                              />
                            </div>
                            {translatedContent.description && (
                              <div>
                                <Label htmlFor="link-description">Descrizione</Label>
                                <Textarea
                                  id="link-description"
                                  value={translatedContent.description || ''}
                                  onChange={(e) => handleTextChange(e.target.value, 'description')}
                                  placeholder="Descrizione del link tradotta..."
                                />
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Placeholder per altri tipi di moduli non traducibili */}
                        {['3d-model', 'pdf', 'component', 'bom'].includes(module.type) && (
                          <div className="text-center py-4 text-neutral-medium">
                            Questo tipo di modulo non richiede traduzione del contenuto.
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={handleSaveTranslation}
                      disabled={!selectedLanguage || saveMutation.isPending}
                    >
                      {saveMutation.isPending ? 'Salvataggio...' : 'Salva traduzione'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Anteprima traduzione</CardTitle>
                  <CardDescription>
                    Visualizzazione della traduzione selezionata
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedLanguage ? (
                    <div className="text-center py-8 text-neutral-medium">
                      Seleziona una lingua per visualizzare l'anteprima della traduzione
                    </div>
                  ) : (
                    <div className="border border-neutral-light rounded-lg p-4">
                      {/* Creazione di un modulo virtuale con i contenuti tradotti */}
                      <ContentModule
                        module={{
                          ...module,
                          content: JSON.stringify(translatedContent)
                        }}
                        onDelete={() => {}}
                        onUpdate={() => {}}
                        documentId={section?.documentId.toString() || ""}
                        isPreview={true}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}