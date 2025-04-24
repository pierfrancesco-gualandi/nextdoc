import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TranslationExportImport } from '@/components/translation-export-import';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  FolderIcon, 
  FileTextIcon, 
  GlobeIcon, 
  AlertTriangleIcon, 
  Loader2, 
  SaveIcon 
} from 'lucide-react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import TranslatedContentModule from '@/components/TranslatedContentModule';
import ContentModule from '@/components/content-module';

interface DocumentTranslationManagerProps {
  documentId: string;
}

export default function DocumentTranslationManager({ documentId }: DocumentTranslationManagerProps) {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [moduleTranslations, setModuleTranslations] = useState<Record<string, any>>({});
  const [sectionTranslations, setSectionTranslations] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [savingTranslation, setSavingTranslation] = useState(false);
  
  // Carica il documento
  const { data: document, isLoading: isLoadingDocument } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    enabled: !!documentId,
  });
  
  // Carica le sezioni del documento
  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: [`/api/documents/${documentId}/sections`],
    enabled: !!documentId,
  });
  
  // Carica le lingue disponibili
  const { data: languages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ['/api/languages'],
    select: (data) => data.filter((lang: any) => lang.isActive),
  });
  
  // Carica lo stato delle traduzioni per la lingua selezionata
  const { data: translationStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: [`/api/documents/${documentId}/translation-status/${selectedLanguage}`],
    enabled: !!documentId && !!selectedLanguage,
  });
  
  // Mutazione per salvare la traduzione di una sezione
  const saveSectionTranslation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/section-translations/${data.id}`, {
        method: data.exists ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.translation),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio della traduzione della sezione');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/translation-status/${selectedLanguage}`] });
    },
  });
  
  // Mutazione per salvare la traduzione di un modulo
  const saveModuleTranslation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/module-translations/${data.id}`, {
        method: data.exists ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.translation),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio della traduzione del modulo');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/translation-status/${selectedLanguage}`] });
    },
  });
  
  // Carica tutte le traduzioni per la lingua selezionata
  useEffect(() => {
    if (!selectedLanguage || !sections) return;
    
    const loadTranslations = async () => {
      const sectionTrans: Record<string, any> = {};
      const moduleTrans: Record<string, any> = {};
      
      // Carica le traduzioni delle sezioni
      for (const section of sections) {
        try {
          const response = await fetch(`/api/section-translations?sectionId=${section.id}&languageId=${selectedLanguage}`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              sectionTrans[section.id] = data[0];
            }
          }
        } catch (err) {
          console.warn(`Impossibile caricare la traduzione per la sezione ${section.id}`, err);
        }
        
        // Carica i moduli della sezione
        try {
          const modulesResponse = await fetch(`/api/sections/${section.id}/modules`);
          if (modulesResponse.ok) {
            const modules = await modulesResponse.json();
            
            // Carica le traduzioni dei moduli
            for (const module of modules) {
              try {
                const moduleTransResponse = await fetch(`/api/module-translations?moduleId=${module.id}&languageId=${selectedLanguage}`);
                if (moduleTransResponse.ok) {
                  const moduleTransData = await moduleTransResponse.json();
                  if (moduleTransData && moduleTransData.length > 0) {
                    moduleTrans[module.id] = moduleTransData[0];
                  }
                }
              } catch (err) {
                console.warn(`Impossibile caricare la traduzione per il modulo ${module.id}`, err);
              }
            }
          }
        } catch (err) {
          console.warn(`Impossibile caricare i moduli per la sezione ${section.id}`, err);
        }
      }
      
      setSectionTranslations(sectionTrans);
      setModuleTranslations(moduleTrans);
    };
    
    loadTranslations();
  }, [selectedLanguage, sections]);
  
  // Gestisce il cambio della lingua selezionata
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setSectionTranslations({});
    setModuleTranslations({});
  };
  
  // Gestisce l'espansione/contrazione delle sezioni
  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections({
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId]
    });
  };
  
  // Aggiorna il valore di una traduzione di sezione
  const updateSectionTranslation = (sectionId: number, field: string, value: string) => {
    setSectionTranslations((prev) => {
      const sectionTrans = prev[sectionId] || {
        sectionId,
        languageId: parseInt(selectedLanguage || '0'),
        status: 'in_progress'
      };
      
      return {
        ...prev,
        [sectionId]: {
          ...sectionTrans,
          [field]: value
        }
      };
    });
  };
  
  // Aggiorna il valore di una traduzione di modulo
  const updateModuleTranslation = (moduleId: number, contentUpdates: any) => {
    setModuleTranslations((prev) => {
      const moduleTrans = prev[moduleId] || {
        moduleId,
        languageId: parseInt(selectedLanguage || '0'),
        content: '{}',
        status: 'in_progress'
      };
      
      let currentContent;
      try {
        currentContent = typeof moduleTrans.content === 'string' 
          ? JSON.parse(moduleTrans.content) 
          : moduleTrans.content;
      } catch (e) {
        currentContent = {};
      }
      
      const updatedContent = {
        ...currentContent,
        ...contentUpdates
      };
      
      return {
        ...prev,
        [moduleId]: {
          ...moduleTrans,
          content: typeof moduleTrans.content === 'string' 
            ? JSON.stringify(updatedContent) 
            : updatedContent
        }
      };
    });
  };
  
  // Salva tutte le traduzioni modificate
  const saveAllTranslations = async () => {
    if (!selectedLanguage) return;
    
    setSavingTranslation(true);
    
    try {
      // Salva le traduzioni delle sezioni
      for (const sectionId in sectionTranslations) {
        const translation = sectionTranslations[sectionId];
        const exists = !!translation.id;
        
        await saveSectionTranslation.mutateAsync({
          exists,
          id: translation.id,
          translation: {
            sectionId: parseInt(sectionId),
            languageId: parseInt(selectedLanguage),
            title: translation.title || '',
            description: translation.description || '',
            status: 'translated'
          }
        });
      }
      
      // Salva le traduzioni dei moduli
      for (const moduleId in moduleTranslations) {
        const translation = moduleTranslations[moduleId];
        const exists = !!translation.id;
        
        await saveModuleTranslation.mutateAsync({
          exists,
          id: translation.id,
          translation: {
            moduleId: parseInt(moduleId),
            languageId: parseInt(selectedLanguage),
            content: typeof translation.content === 'string' 
              ? translation.content 
              : JSON.stringify(translation.content),
            status: 'translated'
          }
        });
      }
      
      toast({
        title: "Traduzioni salvate",
        description: "Tutte le traduzioni sono state salvate con successo.",
      });
      
      // Aggiorna lo stato delle traduzioni
      refetchStatus();
    } catch (error) {
      console.error('Errore durante il salvataggio delle traduzioni:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle traduzioni.",
        variant: "destructive"
      });
    } finally {
      setSavingTranslation(false);
    }
  };
  
  // Verifica se una sezione ha traduzioni mancanti
  const hasMissingSectionTranslation = (section: any) => {
    if (!sectionTranslations[section.id]) return true;
    
    // Verifica se il titolo è stato tradotto
    const hasTitle = !!sectionTranslations[section.id].title;
    
    // Se la sezione ha una descrizione, verifica anche quella
    const needsDescription = !!section.description;
    const hasDescription = !!sectionTranslations[section.id].description;
    
    return !hasTitle || (needsDescription && !hasDescription);
  };
  
  // Carica lo stato di completamento della traduzione
  const getTranslationProgress = () => {
    if (!translationStatus) return 0;
    
    // Estrai i conteggi dallo stato di traduzione
    const totalSections = translationStatus.totalSections || 0;
    const translatedSections = translationStatus.translatedSections || 0;
    
    const totalModules = translationStatus.totalModules || 0;
    const translatedModules = translationStatus.translatedModules || 0;
    
    // Calcola la percentuale totale
    const total = totalSections + totalModules;
    const translated = translatedSections + translatedModules;
    
    return total === 0 ? 0 : Math.round((translated / total) * 100);
  };
  
  // Componente per visualizzare un modulo in modalità traduzione
  const ModuleTranslationItem = ({ module, section }: { module: any, section: any }) => {
    const [moduleContent, setModuleContent] = useState<any>(null);
    const [isLoadingModule, setIsLoadingModule] = useState(false);
    
    // Carica il contenuto del modulo se necessario
    useEffect(() => {
      if (!module || moduleContent) return;
      
      const parseContent = () => {
        try {
          if (typeof module.content === 'string') {
            return JSON.parse(module.content);
          }
          return module.content;
        } catch (e) {
          console.error(`Errore nel parsing del contenuto del modulo ${module.id}:`, e);
          return {};
        }
      };
      
      setModuleContent(parseContent());
    }, [module, moduleContent]);
    
    // Carica la traduzione esistente del modulo
    const translation = moduleTranslations[module.id];
    
    // Analizza il contenuto tradotto
    const getTranslatedContent = () => {
      if (!translation) return {};
      
      try {
        if (typeof translation.content === 'string') {
          return JSON.parse(translation.content);
        }
        return translation.content;
      } catch (e) {
        console.error(`Errore nel parsing della traduzione del modulo ${module.id}:`, e);
        return {};
      }
    };
    
    const translatedContent = getTranslatedContent();
    
    // Determina se il modulo ha campi non tradotti
    const hasMissingTranslation = () => {
      if (!translation) return true;
      
      // A seconda del tipo di modulo, verifica i campi richiesti
      switch (module.type) {
        case 'text':
          return !translatedContent.text;
        
        case 'testp':
          // Verifica i campi di testo per i file di testo
          return !translatedContent.title || !translatedContent.description;
          
        case 'image':
        case 'video':
          // Per immagini e video, verifica titolo, didascalia e testo alternativo
          return !translatedContent.caption || !translatedContent.alt || !translatedContent.title;
          
        case 'warning':
        case 'danger':
        case 'warning-alert':
        case 'caution':
        case 'note':
        case 'safety-instructions':
          const messageField = module.type === 'warning' ? 'message' : 'description';
          return !translatedContent.title || !translatedContent[messageField];
        
        case 'table':
          // Verifica intestazioni e righe della tabella
          if (Array.isArray(moduleContent?.headers) && (!Array.isArray(translatedContent.headers) || translatedContent.headers.some((h: string) => !h))) {
            return true;
          }
          
          if (Array.isArray(moduleContent?.rows)) {
            if (!Array.isArray(translatedContent.rows)) return true;
            
            for (let i = 0; i < moduleContent.rows.length; i++) {
              if (!translatedContent.rows[i] || translatedContent.rows[i].some((cell: string) => !cell)) {
                return true;
              }
            }
          }
          
          return !translatedContent.caption && moduleContent?.caption;
          
        case 'checklist':
          if (Array.isArray(moduleContent?.items)) {
            if (!Array.isArray(translatedContent.items)) return true;
            
            for (let i = 0; i < moduleContent.items.length; i++) {
              if (!translatedContent.items[i] || !translatedContent.items[i].text) {
                return true;
              }
            }
          }
          
          return !translatedContent.title && moduleContent?.title;
          
        case 'pdf':
          // Verifica titolo e descrizione per i PDF
          return !translatedContent.title || !translatedContent.description;
          
        case 'link':
          // Verifica testo e descrizione per i link
          return !translatedContent.text || !translatedContent.description;
          
        case 'bom':
          // Verifica intestazioni, messaggi e descrizioni componenti
          const hasHeaders = translatedContent.headers && 
            Object.keys(moduleContent?.headers || {}).every(key => !!translatedContent.headers[key]);
          
          const hasMessages = translatedContent.messages && 
            Object.keys(moduleContent?.messages || {}).every(key => !!translatedContent.messages[key]);
            
          // Verifica che tutte le descrizioni dei componenti siano tradotte
          const hasDescriptions = translatedContent.descriptions && 
            Object.keys(moduleContent?.descriptions || {}).every(key => !!translatedContent.descriptions[key]);
          
          return !translatedContent.title || !hasHeaders || !hasMessages || !hasDescriptions;
          
        case '3d-model':
          // Per modelli 3D, verifica titolo e descrizione
          return !translatedContent.title || !translatedContent.description;
          
        default:
          // Per qualsiasi altro tipo di modulo, verifica se ha un titolo
          if (moduleContent?.title && !translatedContent.title) return true;
          // O una descrizione
          if (moduleContent?.description && !translatedContent.description) return true;
          // O qualsiasi altro campo di testo che dovrebbe essere tradotto
          return false;
      }
    };
    
    // Nome tipo modulo formattato per la visualizzazione
    const getModuleTypeName = (type: string) => {
      const types: Record<string, string> = {
        'text': 'Testo',
        'testp': 'File di testo',
        'image': 'Immagine',
        'video': 'Video',
        'table': 'Tabella',
        'checklist': 'Checklist',
        'warning': 'Avvertenza',
        'danger': 'PERICOLO',
        'warning-alert': 'AVVERTENZA',
        'caution': 'ATTENZIONE',
        'note': 'NOTA',
        'safety-instructions': 'Istruzioni di sicurezza',
        '3d-model': 'Modello 3D',
        'pdf': 'PDF',
        'link': 'Link',
        'component': 'Componente',
        'bom': 'Elenco Componenti'
      };
      
      return types[type] || type;
    };
    
    // Interfaccia di traduzione specifica per il tipo di modulo
    const renderModuleTranslationForm = () => {
      if (!moduleContent) return null;
      
      const handleContentChange = (updates: any) => {
        updateModuleTranslation(module.id, updates);
      };
      
      switch (module.type) {
        case 'text':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`module-${module.id}-text`}>Testo</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-neutral-50 rounded border text-sm">
                    {moduleContent.text || ''}
                  </div>
                  <Textarea
                    id={`module-${module.id}-text`}
                    value={translatedContent.text || ''}
                    onChange={(e) => handleContentChange({ text: e.target.value })}
                    placeholder="Inserisci la traduzione del testo..."
                    className={!translatedContent.text ? "border-red-300" : ""}
                  />
                </div>
              </div>
            </div>
          );
          
        case 'warning':
        case 'danger':
        case 'warning-alert':
        case 'caution':
        case 'note':
        case 'safety-instructions':
          const messageField = module.type === 'warning' ? 'message' : 'description';
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-neutral-50 rounded border text-sm">
                    {moduleContent.title || ''}
                  </div>
                  <Input
                    id={`module-${module.id}-title`}
                    value={translatedContent.title || ''}
                    onChange={(e) => handleContentChange({ title: e.target.value })}
                    placeholder="Inserisci la traduzione del titolo..."
                    className={!translatedContent.title ? "border-red-300" : ""}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor={`module-${module.id}-message`}>
                  {messageField === 'message' ? 'Messaggio' : 'Descrizione'}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-neutral-50 rounded border text-sm">
                    {moduleContent[messageField] || ''}
                  </div>
                  <Textarea
                    id={`module-${module.id}-message`}
                    value={translatedContent[messageField] || ''}
                    onChange={(e) => {
                      const updates: any = {};
                      updates[messageField] = e.target.value;
                      handleContentChange(updates);
                    }}
                    placeholder={`Inserisci la traduzione del ${messageField === 'message' ? 'messaggio' : 'descrizione'}...`}
                    className={!translatedContent[messageField] ? "border-red-300" : ""}
                  />
                </div>
              </div>
            </div>
          );
          
        case 'table':
          return (
            <div className="space-y-4">
              {moduleContent.caption && (
                <div>
                  <Label htmlFor={`module-${module.id}-caption`}>Didascalia</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.caption}
                    </div>
                    <Input
                      id={`module-${module.id}-caption`}
                      value={translatedContent.caption || ''}
                      onChange={(e) => handleContentChange({ caption: e.target.value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                    />
                  </div>
                </div>
              )}
              
              {Array.isArray(moduleContent.headers) && (
                <div>
                  <Label>Intestazioni della tabella</Label>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border bg-neutral-100 text-sm text-center">Colonna</th>
                          <th className="p-2 border bg-neutral-100 text-sm">Originale</th>
                          <th className="p-2 border bg-neutral-100 text-sm">Traduzione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleContent.headers.map((header: string, idx: number) => {
                          // Assicurati che headers sia un array nell'oggetto tradotto
                          const headers = Array.isArray(translatedContent.headers) 
                            ? translatedContent.headers 
                            : [];
                            
                          return (
                            <tr key={`header-${idx}`}>
                              <td className="p-2 border text-center">{idx + 1}</td>
                              <td className="p-2 border">{header}</td>
                              <td className="p-2 border">
                                <Input 
                                  value={headers[idx] || ''}
                                  onChange={(e) => {
                                    const newHeaders = [...headers];
                                    newHeaders[idx] = e.target.value;
                                    handleContentChange({ headers: newHeaders });
                                  }}
                                  placeholder="Inserisci la traduzione..."
                                  className={!headers[idx] ? "border-red-300" : ""}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {Array.isArray(moduleContent.rows) && moduleContent.rows.length > 0 && (
                <div>
                  <Label>Contenuto della tabella</Label>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border bg-neutral-100 text-sm text-center">Riga,Col</th>
                          <th className="p-2 border bg-neutral-100 text-sm">Originale</th>
                          <th className="p-2 border bg-neutral-100 text-sm">Traduzione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleContent.rows.map((row: string[], rowIdx: number) => (
                          row.map((cell: string, colIdx: number) => {
                            // Assicurati che rows sia un array nell'oggetto tradotto e inizializza le sottorighe necessarie
                            const rows = Array.isArray(translatedContent.rows) ? translatedContent.rows : [];
                            const currentRow = Array.isArray(rows[rowIdx]) ? rows[rowIdx] : [];
                            
                            return (
                              <tr key={`cell-${rowIdx}-${colIdx}`}>
                                <td className="p-2 border text-center">{rowIdx + 1},{colIdx + 1}</td>
                                <td className="p-2 border">{cell}</td>
                                <td className="p-2 border">
                                  <Input 
                                    value={currentRow[colIdx] || ''}
                                    onChange={(e) => {
                                      const newRows = [...rows];
                                      if (!newRows[rowIdx]) newRows[rowIdx] = [];
                                      newRows[rowIdx][colIdx] = e.target.value;
                                      handleContentChange({ rows: newRows });
                                    }}
                                    placeholder="Inserisci la traduzione..."
                                    className={!currentRow[colIdx] ? "border-red-300" : ""}
                                  />
                                </td>
                              </tr>
                            );
                          })
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
          
        case 'checklist':
          return (
            <div className="space-y-4">
              {Array.isArray(moduleContent.items) && (
                <div>
                  <Label>Elementi della checklist</Label>
                  <div className="mt-2">
                    {moduleContent.items.map((item: any, idx: number) => {
                      // Assicurati che items sia un array nell'oggetto tradotto
                      const items = Array.isArray(translatedContent.items) 
                        ? translatedContent.items 
                        : [];
                      
                      const currentItem = items[idx] || {};
                      
                      return (
                        <div key={`item-${idx}`} className="mt-4">
                          <Label htmlFor={`checklist-item-${idx}`}>Elemento {idx + 1}</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-neutral-50 rounded border text-sm">
                              {item.text}
                            </div>
                            <Input
                              id={`checklist-item-${idx}`}
                              value={currentItem.text || ''}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx] = { 
                                  ...currentItem,
                                  text: e.target.value 
                                };
                                handleContentChange({ items: newItems });
                              }}
                              placeholder="Inserisci la traduzione..."
                              className={!currentItem.text ? "border-red-300" : ""}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
          
        case 'image':
        case 'video':
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <Input
                      id={`module-${module.id}-title`}
                      value={translatedContent.title || ''}
                      onChange={(e) => handleContentChange({ title: e.target.value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      className={!translatedContent.title ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.caption && (
                <div>
                  <Label htmlFor={`module-${module.id}-caption`}>Didascalia</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.caption}
                    </div>
                    <Input
                      id={`module-${module.id}-caption`}
                      value={translatedContent.caption || ''}
                      onChange={(e) => handleContentChange({ caption: e.target.value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      className={!translatedContent.caption ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.alt && (
                <div>
                  <Label htmlFor={`module-${module.id}-alt`}>Testo alternativo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.alt}
                    </div>
                    <Input
                      id={`module-${module.id}-alt`}
                      value={translatedContent.alt || ''}
                      onChange={(e) => handleContentChange({ alt: e.target.value })}
                      placeholder="Inserisci la traduzione del testo alternativo..."
                      className={!translatedContent.alt ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
            </div>
          );

        case 'testp':
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <Input
                      id={`module-${module.id}-title`}
                      value={translatedContent.title || ''}
                      onChange={(e) => handleContentChange({ title: e.target.value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      className={!translatedContent.title ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.description && (
                <div>
                  <Label htmlFor={`module-${module.id}-description`}>Descrizione</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.description}
                    </div>
                    <Textarea
                      id={`module-${module.id}-description`}
                      value={translatedContent.description || ''}
                      onChange={(e) => handleContentChange({ description: e.target.value })}
                      placeholder="Inserisci la traduzione della descrizione..."
                      className={!translatedContent.description ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
            </div>
          );
          
        case 'pdf':
        case '3d-model':
        case 'link':
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <Input
                      id={`module-${module.id}-title`}
                      value={translatedContent.title || ''}
                      onChange={(e) => handleContentChange({ title: e.target.value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      className={!translatedContent.title ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.description && (
                <div>
                  <Label htmlFor={`module-${module.id}-description`}>Descrizione</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.description}
                    </div>
                    <Textarea
                      id={`module-${module.id}-description`}
                      value={translatedContent.description || ''}
                      onChange={(e) => handleContentChange({ description: e.target.value })}
                      placeholder="Inserisci la traduzione della descrizione..."
                      className={!translatedContent.description ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
              
              {module.type === 'link' && moduleContent.text && (
                <div>
                  <Label htmlFor={`module-${module.id}-text`}>Testo del link</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.text}
                    </div>
                    <Input
                      id={`module-${module.id}-text`}
                      value={translatedContent.text || ''}
                      onChange={(e) => handleContentChange({ text: e.target.value })}
                      placeholder="Inserisci la traduzione del testo del link..."
                      className={!translatedContent.text ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
            </div>
          );

        case 'bom':
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <Input
                      id={`module-${module.id}-title`}
                      value={translatedContent.title || ''}
                      onChange={(e) => handleContentChange({ title: e.target.value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      className={!translatedContent.title ? "border-red-300" : ""}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.headers && (
                <div>
                  <Label>Intestazioni colonne</Label>
                  <div className="mt-2">
                    {Object.entries(moduleContent.headers).map(([key, value]) => {
                      const headers = translatedContent.headers || {};
                      
                      return (
                        <div key={`header-${key}`} className="mt-4">
                          <Label htmlFor={`header-${key}`}>{key}</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-neutral-50 rounded border text-sm">
                              {value as string}
                            </div>
                            <Input
                              id={`header-${key}`}
                              value={headers[key] || ''}
                              onChange={(e) => {
                                const newHeaders = {
                                  ...headers,
                                  [key]: e.target.value
                                };
                                handleContentChange({ headers: newHeaders });
                              }}
                              placeholder="Inserisci la traduzione..."
                              className={!headers[key] ? "border-red-300" : ""}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {moduleContent.messages && (
                <div>
                  <Label>Messaggi</Label>
                  <div className="mt-2">
                    {Object.entries(moduleContent.messages).map(([key, value]) => {
                      const messages = translatedContent.messages || {};
                      
                      return (
                        <div key={`message-${key}`} className="mt-4">
                          <Label htmlFor={`message-${key}`}>{key}</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-neutral-50 rounded border text-sm">
                              {value as string}
                            </div>
                            <Input
                              id={`message-${key}`}
                              value={messages[key] || ''}
                              onChange={(e) => {
                                const newMessages = {
                                  ...messages,
                                  [key]: e.target.value
                                };
                                handleContentChange({ messages: newMessages });
                              }}
                              placeholder="Inserisci la traduzione..."
                              className={!messages[key] ? "border-red-300" : ""}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {moduleContent.descriptions && (
                <div>
                  <Label>Descrizioni Componenti</Label>
                  <div className="mt-2">
                    {Object.entries(moduleContent.descriptions).map(([code, description]) => {
                      const descriptions = translatedContent.descriptions || {};
                      
                      return (
                        <div key={`description-${code}`} className="mt-4">
                          <Label htmlFor={`description-${code}`}>{code}</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="p-3 bg-neutral-50 rounded border text-sm">
                              {description as string}
                            </div>
                            <Input
                              id={`description-${code}`}
                              value={descriptions[code] || ''}
                              onChange={(e) => {
                                const newDescriptions = {
                                  ...descriptions,
                                  [code]: e.target.value
                                };
                                handleContentChange({ descriptions: newDescriptions });
                              }}
                              placeholder="Inserisci la traduzione..."
                              className={!descriptions[code] ? "border-red-300" : ""}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
          
        default:
          // Trova qualsiasi elemento testuale nel modulo che potrebbe richiedere traduzione
          const textFields = [];
          
          if (moduleContent.title) {
            textFields.push({
              key: 'title',
              label: 'Titolo',
              value: moduleContent.title
            });
          }
          
          if (moduleContent.description) {
            textFields.push({
              key: 'description',
              label: 'Descrizione',
              value: moduleContent.description
            });
          }
          
          if (moduleContent.text) {
            textFields.push({
              key: 'text',
              label: 'Testo',
              value: moduleContent.text
            });
          }
          
          if (moduleContent.caption) {
            textFields.push({
              key: 'caption',
              label: 'Didascalia',
              value: moduleContent.caption
            });
          }
          
          if (textFields.length > 0) {
            return (
              <div className="space-y-4">
                {textFields.map(field => (
                  <div key={`field-${field.key}`}>
                    <Label htmlFor={`module-${module.id}-${field.key}`}>{field.label}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        {field.value}
                      </div>
                      <Textarea
                        id={`module-${module.id}-${field.key}`}
                        value={translatedContent[field.key] || ''}
                        onChange={(e) => {
                          const update = {};
                          update[field.key] = e.target.value;
                          handleContentChange(update);
                        }}
                        placeholder={`Inserisci la traduzione ${field.label.toLowerCase()}...`}
                        className={!translatedContent[field.key] ? "border-red-300" : ""}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          
          return (
            <div className="p-4 border rounded bg-neutral-50 text-sm">
              Questo tipo di modulo ({module.type}) non contiene campi testuali da tradurre.
            </div>
          );
      }
    };
    
    return (
      <div className="mb-4 border rounded bg-white shadow-sm">
        <div className="flex items-center p-4 border-b">
          <FileTextIcon size={16} className="text-primary/70 mr-2" />
          <span className="font-medium mr-2">
            {getModuleTypeName(module.type)}
          </span>
          {hasMissingTranslation() && (
            <Badge variant="outline" className="ml-auto border-red-300 text-red-600">
              <AlertTriangleIcon size={14} className="mr-1" /> Da tradurre
            </Badge>
          )}
        </div>
        <div className="p-4">
          {renderModuleTranslationForm()}
        </div>
      </div>
    );
  };
  
  // Renderizza la struttura di un documento con le sezioni
  const renderDocumentStructure = () => {
    if (!sections || sections.length === 0) {
      return (
        <div className="text-center py-10 text-neutral-500">
          Nessuna sezione trovata per questo documento.
        </div>
      );
    }
    
    return (
      <div className="mb-6">
        <div className="flex justify-end mb-4 space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Espandi tutte le sezioni
              if (sections) {
                const allExpanded = {};
                sections.forEach((section: any) => {
                  allExpanded[section.id] = true;
                });
                setExpandedSections(allExpanded);
              }
            }}
          >
            ▼ Espandi tutto
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Comprimi tutte le sezioni
              setExpandedSections({});
            }}
          >
            ▲ Comprimi tutto
          </Button>
        </div>
        {sections.map((section: any) => (
          <Accordion
            key={section.id}
            type="single"
            collapsible
            value={expandedSections[section.id] ? section.id.toString() : undefined}
            onValueChange={(value) => setExpandedSections({...expandedSections, [section.id]: value === section.id.toString()})}
            className="mb-4"
          >
            <AccordionItem value={section.id.toString()} className="border rounded shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center">
                  <FolderIcon size={16} className="text-primary/70 mr-2" />
                  <span className={`font-medium ${hasMissingSectionTranslation(section) ? 'text-red-600' : ''}`}>
                    {section.title}
                  </span>
                  {hasMissingSectionTranslation(section) && (
                    <Badge variant="outline" className="ml-4 border-red-300 text-red-600">
                      <AlertTriangleIcon size={14} className="mr-1" /> Da tradurre
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4">
                {/* Form di traduzione della sezione */}
                <div className="mb-6 space-y-4 p-4 border rounded bg-neutral-50">
                  <div>
                    <Label htmlFor={`section-${section.id}-title`} className="font-medium">Titolo della sezione</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-white rounded border text-sm">
                        {section.title}
                      </div>
                      <Input
                        id={`section-${section.id}-title`}
                        value={(sectionTranslations[section.id]?.title) || ''}
                        onChange={(e) => updateSectionTranslation(section.id, 'title', e.target.value)}
                        placeholder="Inserisci la traduzione del titolo..."
                        className={!sectionTranslations[section.id]?.title ? "border-red-300" : ""}
                      />
                    </div>
                  </div>
                  
                  {section.description && (
                    <div>
                      <Label htmlFor={`section-${section.id}-description`} className="font-medium">Descrizione della sezione</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="p-3 bg-white rounded border text-sm">
                          {section.description}
                        </div>
                        <Textarea
                          id={`section-${section.id}-description`}
                          value={(sectionTranslations[section.id]?.description) || ''}
                          onChange={(e) => updateSectionTranslation(section.id, 'description', e.target.value)}
                          placeholder="Inserisci la traduzione della descrizione..."
                          className={section.description && !sectionTranslations[section.id]?.description ? "border-red-300" : ""}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Elenco dei moduli nella sezione */}
                <Label className="font-medium mb-4 block">Moduli in questa sezione</Label>
                <div className="ml-4">
                  {section.modules ? (
                    section.modules.map((module: any) => (
                      <ModuleTranslationItem 
                        key={module.id} 
                        module={module} 
                        section={section} 
                      />
                    ))
                  ) : (
                    <div className="text-center py-4 text-neutral-500">
                      <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />
                      Caricamento moduli...
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    );
  };
  
  // Carica i moduli per ciascuna sezione
  useEffect(() => {
    if (!sections) return;
    
    // Per ogni sezione, carica i moduli
    sections.forEach(async (section: any) => {
      try {
        const response = await fetch(`/api/sections/${section.id}/modules`);
        if (response.ok) {
          const modules = await response.json();
          section.modules = modules;
        }
      } catch (err) {
        console.warn(`Impossibile caricare i moduli per la sezione ${section.id}`, err);
      }
    });
  }, [sections]);
  
  // Renderizza l'anteprima della traduzione
  const renderPreview = () => {
    if (!document || !sections || !selectedLanguage) return null;
    
    return (
      <div className="space-y-8">
        <div className="prose prose-primary max-w-none">
          <h1>{sectionTranslations[document.id]?.title || document.title}</h1>
          <p>{sectionTranslations[document.id]?.description || document.description}</p>
        </div>
        
        {sections.map((section: any) => (
          <div key={section.id} className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">
              {sectionTranslations[section.id]?.title || section.title}
            </h2>
            
            {section.description && (
              <p className="text-neutral-700">
                {sectionTranslations[section.id]?.description || section.description}
              </p>
            )}
            
            {section.modules && section.modules.map((module: any) => (
              <div key={module.id} className="my-6">
                {moduleTranslations[module.id] ? (
                  <TranslatedContentModule 
                    module={module}
                    translation={moduleTranslations[module.id]}
                    documentId={documentId}
                    isPreview={true}
                  />
                ) : (
                  <ContentModule
                    module={module}
                    onDelete={() => {}}
                    onUpdate={() => {}}
                    documentId={documentId}
                    isPreview={true}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  // Stato di caricamento iniziale
  if (isLoadingDocument || isLoadingSections || isLoadingLanguages) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin h-8 w-8 mr-2 text-primary" />
        <span>Caricamento documento e lingue...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <GlobeIcon className="mr-2 h-6 w-6 text-primary/70" />
            Traduzione Documento: {document?.title}
          </CardTitle>
          <CardDescription>
            Traduci questo documento selezionando una lingua di destinazione. Le sezioni e i moduli non tradotti saranno evidenziati in rosso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-full md:w-64">
                <Label htmlFor="language-select">Seleziona lingua di destinazione</Label>
                <Select value={selectedLanguage || ''} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language-select" className="w-full">
                    <SelectValue placeholder="Seleziona una lingua" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages?.map((language: any) => (
                      <SelectItem key={language.id} value={language.id.toString()}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedLanguage && (
                <Button 
                  variant="default" 
                  className="ml-auto" 
                  onClick={saveAllTranslations}
                  disabled={savingTranslation}
                >
                  {savingTranslation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="mr-2 h-4 w-4" />
                      Salva tutte le traduzioni
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {selectedLanguage && translationStatus && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Stato traduzione</Label>
                  <span className="text-sm font-medium">
                    {getTranslationProgress()}% completato
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${getTranslationProgress()}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {selectedLanguage ? (
        <>
          <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="edit">Modifica Traduzione</TabsTrigger>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
              <TabsTrigger value="export">Esporta/Importa</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="space-y-6">
              {renderDocumentStructure()}
            </TabsContent>
            
            <TabsContent value="preview">
              <Card>
                <CardContent className="p-6">
                  {renderPreview()}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="export">
              <TranslationExportImport 
                documentId={documentId} 
                languages={languages || []}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center p-12 border rounded-lg bg-neutral-50">
          <GlobeIcon className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-xl font-medium mb-2">Seleziona una lingua per iniziare</h3>
          <p className="text-neutral-500">
            Per tradurre questo documento, seleziona prima una lingua di destinazione dal menu a tendina.
          </p>
        </div>
      )}
    </div>
  );
}