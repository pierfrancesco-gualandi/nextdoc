import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TranslationExportImport } from '@/components/translation-export-import';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  TranslationField, 
  SectionTitleField, 
  SectionDescriptionField, 
  ModuleTextField 
} from '@/components/TranslationFieldsManager';
// Queste importazioni non sono più necessarie perché ora usiamo un controllo inline
// import { imageModuleHasCaption, videoModuleHasCaption, pdfModuleHasCaption } from '@/lib/module-utils';
import TranslationEditableField from '@/components/TranslationEditableField';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  FolderIcon, 
  FileTextIcon, 
  GlobeIcon, 
  AlertTriangleIcon, 
  Loader2, 
  SaveIcon,
  FileDownIcon,
  FileIcon,
  DownloadIcon
} from 'lucide-react';
import { exportToHtml, exportToPdf, exportToWord } from '@/lib/document-utils';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [documentTitleTranslation, setDocumentTitleTranslation] = useState<string>('');
  const [documentVersionTranslation, setDocumentVersionTranslation] = useState<string>('');
  const [documentDescriptionTranslation, setDocumentDescriptionTranslation] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [savingTranslation, setSavingTranslation] = useState(false);
  const [savingDocumentInfo, setSavingDocumentInfo] = useState(false);
  
  // Carica il documento
  const { data: document, isLoading: isLoadingDocument } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    enabled: !!documentId,
  });
  
  // Carica le sezioni del documento 
  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: [`/api/documents/${documentId}/sections`],
    enabled: !!documentId,
    // Qui ordiniamo le sezioni in base al campo 'order' per rispettare la struttura originale del documento
    select: (data) => {
      if (!Array.isArray(data)) return [];
      
      // Funzione per ordinare le sezioni ricorsivamente in base alla loro struttura ad albero
      const orderSectionsByHierarchy = (items: any[], parentId: number | null = null): any[] => {
        const result: any[] = [];
        
        // Filtriamo le sezioni che appartengono al livello corrente
        const levelSections = items.filter((item: any) => item.parentId === parentId);
        
        // Ordiniamo per il campo 'order'
        const sortedSections = [...levelSections].sort((a: any, b: any) => a.order - b.order);
        
        // Aggiungiamo ogni sezione e poi ricorsivamente i suoi figli
        sortedSections.forEach((section: any) => {
          result.push(section);
          
          // Aggiungiamo i figli ricorsivamente
          const children = orderSectionsByHierarchy(items, section.id);
          result.push(...children);
        });
        
        return result;
      };
      
      // Chiamiamo la funzione di ordinamento
      return orderSectionsByHierarchy(data);
    }
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
      // Rimuovi il focus dai campi di input dopo il salvataggio
      if (typeof window !== 'undefined' && (window as any).clearFieldFocus) {
        (window as any).clearFieldFocus();
      }
      
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
      // Rimuovi il focus dai campi di input dopo il salvataggio
      if (typeof window !== 'undefined' && (window as any).clearFieldFocus) {
        (window as any).clearFieldFocus();
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/translation-status/${selectedLanguage}`] });
    },
  });
  
  // Carica tutte le traduzioni per la lingua selezionata
  useEffect(() => {
    if (!selectedLanguage || !sections || !document) return;
    
    const loadTranslations = async () => {
      const sectionTrans: Record<string, any> = {};
      const moduleTrans: Record<string, any> = {};
      
      // Carica la traduzione del documento (titolo, versione, descrizione)
      try {
        const docTranslationResponse = await fetch(`/api/document-translations?documentId=${documentId}&languageId=${selectedLanguage}`);
        if (docTranslationResponse.ok) {
          const docTranslationData = await docTranslationResponse.json();
          if (docTranslationData && docTranslationData.length > 0) {
            const docTranslation = docTranslationData[0];
            // Imposta i campi tradotti del documento ESATTAMENTE come sono salvati nel DB
            // Questo garantisce che anche le stringhe vuote vengano preservate
            setDocumentTitleTranslation(docTranslation.title !== undefined ? docTranslation.title : '');
            setDocumentVersionTranslation(docTranslation.version !== undefined ? docTranslation.version : '');
            setDocumentDescriptionTranslation(docTranslation.description !== undefined ? docTranslation.description : '');
            
            console.log("Caricati dati documento dall'API:", {
              titleExact: docTranslation.title,
              versionExact: docTranslation.version,
              descriptionExact: docTranslation.description
            });
          } else {
            // Reset dei campi di traduzione se non esistono
            setDocumentTitleTranslation('');
            setDocumentVersionTranslation('');
            setDocumentDescriptionTranslation('');
          }
        }
      } catch (err) {
        console.warn(`Impossibile caricare la traduzione del documento ${documentId}`, err);
        setDocumentTitleTranslation('');
        setDocumentVersionTranslation('');
        setDocumentDescriptionTranslation('');
      }
      
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
  }, [selectedLanguage, sections, document, documentId]);
  
  // Gestisce il cambio della lingua selezionata
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setSectionTranslations({});
    setModuleTranslations({});
  };
  
  // Salva solo le informazioni del documento (titolo, versione, descrizione)
  const saveDocumentInfo = async (showNotification = true) => {
    if (!selectedLanguage || !document) return;
    
    // Rimuovi il focus dai campi di input per prevenire che si mantenga dopo il salvataggio
    if (typeof window !== 'undefined' && (window as any).clearFieldFocus) {
      (window as any).clearFieldFocus();
    }
    
    if (showNotification) {
      setSavingDocumentInfo(true);
    }
    
    try {
      // Verifica se esiste già una traduzione per questo documento e lingua
      const checkDocumentTranslationResponse = await fetch(`/api/document-translations?documentId=${documentId}&languageId=${selectedLanguage}`);
      const documentTranslations = await checkDocumentTranslationResponse.json();
      const existingDocumentTranslation = documentTranslations.length > 0 ? documentTranslations[0] : null;
      
      const documentTranslationData = {
        documentId: parseInt(documentId),
        languageId: parseInt(selectedLanguage),
        title: documentTitleTranslation,
        version: documentVersionTranslation,
        description: documentDescriptionTranslation,
        status: 'translated'
      };
      
      console.log("Salvando informazioni del documento:", documentTranslationData);
      
      let response;
      
      if (existingDocumentTranslation) {
        // Aggiorna la traduzione esistente
        response = await fetch(`/api/document-translations/${existingDocumentTranslation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(documentTranslationData),
        });
      } else {
        // Crea una nuova traduzione
        response = await fetch('/api/document-translations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(documentTranslationData),
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore nel salvataggio delle informazioni del documento: ${errorText}`);
      }
      
      // Invalida la cache per aggiornare i dati visualizzati
      queryClient.invalidateQueries({ queryKey: [`/api/document-translations`] });
      
      // Ricarica manualmente i dati di traduzione del documento
      const newDocTranslationResponse = await fetch(`/api/document-translations?documentId=${documentId}&languageId=${selectedLanguage}`);
      if (newDocTranslationResponse.ok) {
        const newDocTranslationData = await newDocTranslationResponse.json();
        if (newDocTranslationData && newDocTranslationData.length > 0) {
          const newDocTranslation = newDocTranslationData[0];
          // Aggiorna gli stati con i nuovi valori salvati
          setDocumentTitleTranslation(newDocTranslation.title !== undefined ? newDocTranslation.title : '');
          setDocumentVersionTranslation(newDocTranslation.version !== undefined ? newDocTranslation.version : '');
          setDocumentDescriptionTranslation(newDocTranslation.description !== undefined ? newDocTranslation.description : '');
        }
      }
      
      if (showNotification) {
        toast({
          title: "Informazioni documento salvate",
          description: "Le informazioni del documento sono state salvate con successo.",
        });
      }
      
    } catch (error) {
      console.error('Errore durante il salvataggio delle informazioni del documento:', error);
      
      if (showNotification) {
        toast({
          title: "Errore",
          description: error.message || "Si è verificato un errore durante il salvataggio delle informazioni del documento.",
          variant: "destructive"
        });
      }
    } finally {
      if (showNotification) {
        setSavingDocumentInfo(false);
      }
    }
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
  
  // Salva tutte le traduzioni, incluse le informazioni del documento
  const saveAllTranslations = async () => {
    if (!selectedLanguage) return;
    
    // Rimuovi il focus dai campi di input per prevenire che si mantenga dopo il salvataggio
    if (typeof window !== 'undefined' && (window as any).clearFieldFocus) {
      (window as any).clearFieldFocus();
    }
    
    setSavingTranslation(true);
    
    try {
      // Salva prima la traduzione del documento (titolo, versione, descrizione)
      await saveDocumentInfo(false); // Passa false per non mostrare il toast e non impostare setSavingDocumentInfo
      
      // Salva le traduzioni delle sezioni
      for (const sectionId in sectionTranslations) {
        try {
          const translation = sectionTranslations[sectionId];
          const exists = !!translation.id;
          
          const sectionTranslationData = {
            sectionId: parseInt(sectionId),
            languageId: parseInt(selectedLanguage),
            title: translation.title || '',
            description: translation.description || '',
            status: 'translated'
          };
          
          if (exists) {
            // PUT
            const response = await fetch(`/api/section-translations/${translation.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sectionTranslationData),
            });
            
            if (!response.ok) {
              throw new Error(`Errore HTTP ${response.status} durante l'aggiornamento della traduzione della sezione ${sectionId}`);
            }
          } else {
            // POST
            const response = await fetch('/api/section-translations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sectionTranslationData),
            });
            
            if (!response.ok) {
              throw new Error(`Errore HTTP ${response.status} durante la creazione della traduzione della sezione ${sectionId}`);
            }
          }
        } catch (sectionError) {
          console.error(`Errore nella sezione ${sectionId}:`, sectionError);
          throw sectionError;
        }
      }
      
      // Salva le traduzioni dei moduli
      for (const moduleId in moduleTranslations) {
        try {
          const translation = moduleTranslations[moduleId];
          const exists = !!translation.id;
          
          let moduleContent = translation.content;
          if (typeof moduleContent !== 'string') {
            moduleContent = JSON.stringify(moduleContent);
          }
          
          const moduleTranslationData = {
            moduleId: parseInt(moduleId),
            languageId: parseInt(selectedLanguage),
            content: moduleContent,
            status: 'translated'
          };
          
          if (exists) {
            // PUT
            const response = await fetch(`/api/module-translations/${translation.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(moduleTranslationData),
            });
            
            if (!response.ok) {
              const responseText = await response.text();
              throw new Error(`Errore HTTP ${response.status} durante l'aggiornamento della traduzione del modulo ${moduleId}: ${responseText}`);
            }
          } else {
            // POST
            const response = await fetch('/api/module-translations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(moduleTranslationData),
            });
            
            if (!response.ok) {
              const responseText = await response.text();
              throw new Error(`Errore HTTP ${response.status} durante la creazione della traduzione del modulo ${moduleId}: ${responseText}`);
            }
          }
        } catch (moduleError) {
          console.error(`Errore nel modulo ${moduleId}:`, moduleError);
          throw moduleError;
        }
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
        description: error.message || "Si è verificato un errore durante il salvataggio delle traduzioni.",
        variant: "destructive"
      });
    } finally {
      setSavingTranslation(false);
    }
  };
  
  // Verifica se una sezione ha traduzioni mancanti
  const hasMissingSectionTranslation = (section: any) => {
    // Verifica che esista una traduzione
    if (!sectionTranslations[section.id]) return true;
    
    // Verifica se il titolo è stato tradotto
    const hasTitle = !!sectionTranslations[section.id].title;
    
    // Se la sezione ha una descrizione, verifica anche quella
    const needsDescription = !!section.description;
    const hasDescription = needsDescription ? !!sectionTranslations[section.id].description : true;
    
    // Verifica moduli della sezione
    const modulesIncomplete = hasModulesWithMissingTranslations(section);
    
    // Ottieni lo stato attuale di traduzione completata
    const isComplete = hasTitle && hasDescription && !modulesIncomplete;
    
    // Debug per risoluzione problemi
    console.log(`Sezione ${section.id} - ${section.title}:`, {
      hasTitle,
      needsDescription,
      hasDescription,
      modulesIncomplete,
      isComplete,
    });
    
    return !isComplete;
  };
  
  // Verifica se la sezione ha moduli con traduzioni mancanti
  const hasModulesWithMissingTranslations = (section: any) => {
    if (!section.modules || section.modules.length === 0) return false;
    
    // Controlla tutti i moduli nella sezione
    return section.modules.some((module: any) => {
      // Il modulo deve avere una traduzione
      const moduleTranslation = moduleTranslations[module.id];
      if (!moduleTranslation) return true;
      
      // Se il modulo ha una traduzione, è considerato tradotto
      if (moduleTranslation) {
        // Utilizzare la funzione definita all'interno di ModuleTranslationItem
        const translatedContent = moduleTranslation.content;
        return !translatedContent || translatedContent === '{}';
      }
      
      // Altrimenti, è considerato da tradurre
      return true;
    });
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
    const [isEditing, setIsEditing] = useState(false);
    
    // Aggiungiamo gli stati per la BOM a livello di componente
    const [bomComponents, setBomComponents] = useState<Record<string, any>>({});
    const [isLoadingBomComponents, setIsLoadingBomComponents] = useState(false);
    
    // SOLUZIONE RADICALE: Stato globale per preservare quali moduli sono in editing
    useEffect(() => {
      // Crea un oggetto globale per mantenere lo stato dell'editing tra i render
      if (typeof window !== 'undefined' && !(window as any).editingModuleStates) {
        (window as any).editingModuleStates = {};
      }
      
      // Se il modulo è già in editing in un altro render, ripristina lo stato
      if ((window as any).editingModuleStates && (window as any).editingModuleStates[module.id]) {
        setIsEditing(true);
      }
      
      return () => {
        // Questo evita che lo stato venga pulito immediatamente
        // Il componente può essere desmontato durante il rendering o refresh
        // ma deve mantenere il suo stato
      };
    }, [module.id]);
    
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
    
    // Carica i componenti della BOM di riferimento quando necessario
    useEffect(() => {
      if (moduleContent && module.type === 'bom' && isEditing) {
        try {
          const bomId = moduleContent.bomId || 13; // Ottiene l'ID della BOM di riferimento
          
          setIsLoadingBomComponents(true);
          fetch(`/api/boms/${bomId}/items`)
            .then(res => res.json())
            .then(items => {
              // Crea un dizionario di componenti indicizzato per codice
              const componentsMap: Record<string, any> = {};
              items.forEach((item: any) => {
                if (item.component && item.component.code) {
                  componentsMap[item.component.code] = item.component;
                }
              });
              setBomComponents(componentsMap);
              console.log(`Caricati ${Object.keys(componentsMap).length} componenti dalla BOM ${bomId}`);
            })
            .catch(err => {
              console.error(`Errore nel caricamento dei componenti della BOM:`, err);
            })
            .finally(() => {
              setIsLoadingBomComponents(false);
            });
        } catch (error) {
          console.error("Errore nell'accesso alla BOM:", error);
          setIsLoadingBomComponents(false);
        }
      }
    }, [isEditing, moduleContent, module.type]);
    
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
          
        case 'threeDModel':
          // Verifica titolo, didascalia e etichette per i modelli 3D
          const hasTitle = !moduleContent.title || !!translatedContent.title;
          const hasCaption = !moduleContent.caption || !!translatedContent.caption;
          const hasLabels = !translatedContent.labels || !!translatedContent.labels?.view;
          return !hasTitle || !hasCaption || !hasLabels;
          
        case 'image':
        case 'video':
          // Per immagini e video, solo verifica che ci sia almeno la didascalia
          // Alcuni campi potrebbero non essere sempre necessari
          return !translatedContent.caption;
          
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
          // Prima verifica se tutti gli elementi sono tradotti
          if (Array.isArray(moduleContent?.items)) {
            if (!Array.isArray(translatedContent.items)) return true;
            
            // Verifica se ogni elemento ha una traduzione
            for (let i = 0; i < moduleContent.items.length; i++) {
              if (!translatedContent.items[i] || !translatedContent.items[i].text) {
                console.log(`Checklist elemento ${i} non tradotto`);
                return true;
              }
            }
          }
          
          // Log per debugging
          console.log('Checklist status check:', {
            hasTitle: moduleContent?.title ? !!translatedContent.title : true,
            hasCaption: moduleContent?.caption ? !!translatedContent.caption : true,
            modId: module.id
          });
          
          // Verifica separata per titolo e didascalia, considerando come tradotto se non esistono nell'originale
          const needsTitle = moduleContent?.title && !translatedContent.title;
          const needsCaption = moduleContent?.caption && !translatedContent.caption;
          
          // Un modulo è completamente tradotto solo se tutti i campi richiesti sono tradotti
          return needsTitle || needsCaption;
          
        case 'pdf':
          // Per i PDF, solo la didascalia è necessaria
          return !translatedContent.caption;
          
        case 'link':
          // Verifica testo e descrizione per i link
          return !translatedContent.text || !translatedContent.description;
          
        case 'bom':
          // Verifica se moduleContent è definito
          if (!moduleContent) return true;
          
          // Verifica intestazioni, messaggi e descrizioni componenti
          const hasHeaders = translatedContent.headers && 
            Object.keys(moduleContent.headers || {}).every(key => !!translatedContent.headers[key]);
          
          const hasMessages = translatedContent.messages && 
            Object.keys(moduleContent.messages || {}).every(key => !!translatedContent.messages[key]);
          
          // Ottieni l'elenco dei componenti effettivamente visibili secondo i filtri attivi
          // Usa una verifica di sicurezza per ogni accesso di proprietà
          const descriptions = moduleContent.descriptions || {};
          const visibleComponentCodes = (moduleContent.filteredComponentCodes || 
                                        Object.keys(descriptions));
          
          // Verifica solo le descrizioni dei componenti visibili
          const hasDescriptions = translatedContent.descriptions && 
            visibleComponentCodes.length > 0 &&
            visibleComponentCodes.every((code: string) => {
              // Se il componente non ha una descrizione originale, non considerarlo mancante
              if (!descriptions[code]) return true;
              // Altrimenti, verifica che abbia una traduzione
              return !!translatedContent.descriptions[code];
            });
          
          // Se non ci sono componenti visibili, considera solo headers, messages e title  
          if (visibleComponentCodes.length === 0) {
            return !translatedContent.title || !hasHeaders || !hasMessages;
          }
          
          // Log per debugging
          console.log('BOM translation check:', {
            title: !!translatedContent.title,
            hasHeaders,
            hasMessages,
            hasDescriptions,
            visibleComponentCount: visibleComponentCodes.length
          });
          
          return !translatedContent.title || !hasHeaders || !hasMessages || !hasDescriptions;
          
        case '3d-model':
          // Per modelli 3D, verifica titolo, didascalia ed etichette UI
          if (!moduleContent) return true;
          
          const hasTitle3D = !moduleContent.title || !!translatedContent.title;
          const hasCaption3D = !moduleContent.caption || !!translatedContent.caption;
          const hasLabels3D = !translatedContent.labels || !!translatedContent.labels?.view;
          return !hasTitle3D || !hasCaption3D || !hasLabels3D;
          
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
                  <TranslationEditableField
                    originalValue={moduleContent.text || ''}
                    translatedValue={translatedContent.text || ''}
                    onChange={(value) => handleContentChange({ text: value })}
                    placeholder="Inserisci la traduzione del testo..."
                    errorCondition={!translatedContent.text}
                    isMultiline={true}
                    fieldId={`text-field-${module.id}`}
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
                  <TranslationEditableField
                    originalValue={moduleContent.title || ''}
                    translatedValue={translatedContent.title || ''}
                    onChange={(value) => handleContentChange({ title: value })}
                    placeholder="Inserisci la traduzione del titolo..."
                    errorCondition={!translatedContent.title}
                    rows={1}
                    fieldId={`warning-title-${module.id}`}
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
                  <TranslationEditableField
                    originalValue={moduleContent[messageField] || ''}
                    translatedValue={translatedContent[messageField] || ''}
                    onChange={(value) => {
                      const updates: any = {};
                      updates[messageField] = value;
                      handleContentChange(updates);
                    }}
                    placeholder={`Inserisci la traduzione del ${messageField === 'message' ? 'messaggio' : 'descrizione'}...`}
                    errorCondition={!translatedContent[messageField]}
                    isMultiline={true}
                    fieldId={`warning-message-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.caption}
                      translatedValue={translatedContent.caption || ''}
                      onChange={(value) => handleContentChange({ caption: value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      errorCondition={!translatedContent.caption}
                      rows={2}
                      fieldId={`table-caption-${module.id}`}
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
                                <TranslationEditableField 
                                  originalValue={header}
                                  translatedValue={headers[idx] || ''}
                                  onChange={(value) => {
                                    const newHeaders = [...headers];
                                    newHeaders[idx] = value;
                                    handleContentChange({ headers: newHeaders });
                                  }}
                                  placeholder="Inserisci la traduzione..."
                                  errorCondition={!headers[idx]}
                                  rows={1}
                                  fieldId={`table-header-${module.id}-${idx}`}
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
                                  <TranslationEditableField
                                    originalValue={cell}
                                    translatedValue={currentRow[colIdx] || ''}
                                    onChange={(value) => {
                                      const newRows = [...rows];
                                      if (!newRows[rowIdx]) newRows[rowIdx] = [];
                                      newRows[rowIdx][colIdx] = value;
                                      handleContentChange({ rows: newRows });
                                    }}
                                    placeholder="Inserisci la traduzione..."
                                    errorCondition={!currentRow[colIdx]}
                                    rows={1}
                                    fieldId={`table-cell-${module.id}-${rowIdx}-${colIdx}`}
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
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.title}
                      translatedValue={translatedContent.title || ''}
                      onChange={(value) => handleContentChange({ title: value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      errorCondition={moduleContent.title && !translatedContent.title}
                      rows={1}
                      fieldId={`checklist-title-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.caption}
                      translatedValue={translatedContent.caption || ''}
                      onChange={(value) => handleContentChange({ caption: value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      errorCondition={moduleContent.caption && !translatedContent.caption}
                      rows={2}
                      fieldId={`checklist-caption-${module.id}`}
                    />
                  </div>
                </div>
              )}

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
                            <TranslationEditableField
                              originalValue={item.text}
                              translatedValue={currentItem.text || ''}
                              onChange={(value) => {
                                const newItems = [...items];
                                newItems[idx] = { 
                                  ...currentItem,
                                  text: value 
                                };
                                handleContentChange({ items: newItems });
                              }}
                              placeholder="Inserisci la traduzione..."
                              errorCondition={!currentItem.text}
                              rows={1}
                              fieldId={`checklist-item-${module.id}-${idx}`}
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
          
        // I moduli image e video sono ora gestiti nel case statement sotto (righe 1080+)

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
                    <TranslationEditableField
                      originalValue={moduleContent.title}
                      translatedValue={translatedContent.title || ''}
                      onChange={(value) => handleContentChange({ title: value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      errorCondition={!translatedContent.title}
                      rows={1}
                      fieldId={`testp-title-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.description}
                      translatedValue={translatedContent.description || ''}
                      onChange={(value) => handleContentChange({ description: value })}
                      placeholder="Inserisci la traduzione della descrizione..."
                      errorCondition={!translatedContent.description}
                      rows={6}
                      fieldId={`testp-description-${module.id}`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
          
        case 'threeDModel':
          // Utilizziamo un approccio standard per i moduli 3D dato che abbiamo un editor specifico separato
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.title}
                      translatedValue={translatedContent.title || ''}
                      onChange={(value) => handleContentChange({ title: value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      errorCondition={!translatedContent.title}
                      rows={1}
                      fieldId={`threeDModel-title-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.caption}
                      translatedValue={translatedContent.caption || ''}
                      onChange={(value) => handleContentChange({ caption: value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      errorCondition={!translatedContent.caption}
                      rows={2}
                      fieldId={`threeDModel-caption-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {/* Etichette UI per il modulo 3D */}
              <div>
                <Label>Etichette interfaccia utente</Label>
                <div className="p-4 bg-gray-50 rounded-md border mt-2">
                  <div className="mb-4">
                    <Label htmlFor={`module-${module.id}-label-view`}>Pulsante visualizzazione</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        Visualizza in 3D
                      </div>
                      <TranslationEditableField
                        originalValue="Visualizza in 3D"
                        translatedValue={translatedContent.labels?.view || ''}
                        onChange={(value) => {
                          const currentLabels = translatedContent.labels || {};
                          handleContentChange({ 
                            labels: {
                              ...currentLabels,
                              view: value
                            }
                          });
                        }}
                        placeholder="Inserisci la traduzione per il pulsante..."
                        errorCondition={!translatedContent.labels?.view}
                        rows={1}
                        fieldId={`threeDModel-view-label-${module.id}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
          
        case 'pdf':
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.title}
                      translatedValue={translatedContent.title || ''}
                      onChange={(value) => handleContentChange({ title: value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      errorCondition={!translatedContent.title}
                      rows={1}
                      fieldId={`${module.type}-title-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.description}
                      translatedValue={translatedContent.description || ''}
                      onChange={(value) => handleContentChange({ description: value })}
                      placeholder="Inserisci la traduzione della descrizione..."
                      errorCondition={!translatedContent.description}
                      rows={4}
                      fieldId={`${module.type}-description-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {/* Caption/Didascalia */}
              {moduleContent.caption !== undefined && (
                <div>
                  <Label htmlFor={`module-${module.id}-caption`}>Didascalia</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.caption || ''}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.caption || ''}
                      translatedValue={translatedContent.caption || ''}
                      onChange={(value) => handleContentChange({ caption: value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      errorCondition={moduleContent.caption && !translatedContent.caption}
                      rows={2}
                      fieldId={`${module.type}-caption-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {/* Etichette specifiche per PDF */}
              <div>
                <Label>Etichette interfaccia PDF</Label>
                <div className="p-4 bg-gray-50 rounded-md border mt-2">
                  {/* Etichetta per Campo nome file */}
                  <div className="mb-4">
                    <Label htmlFor={`module-${module.id}-label-fileLabel`}>Etichetta "Nome file"</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        Nome file:
                      </div>
                      <TranslationEditableField
                        originalValue="Nome file:"
                        translatedValue={translatedContent.labels?.fileLabel || ''}
                        onChange={(value) => {
                          const currentLabels = translatedContent.labels || {};
                          handleContentChange({ 
                            labels: {
                              ...currentLabels,
                              fileLabel: value
                            }
                          });
                        }}
                        placeholder="Inserisci la traduzione per l'etichetta..."
                        errorCondition={!translatedContent.labels?.fileLabel}
                        rows={1}
                        fieldId={`pdf-fileLabel-${module.id}`}
                      />
                    </div>
                  </div>
                  
                  {/* Testo pulsante download */}
                  <div>
                    <Label htmlFor={`module-${module.id}-label-download`}>Testo pulsante "Scarica file"</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        Scarica file
                      </div>
                      <TranslationEditableField
                        originalValue="Scarica file"
                        translatedValue={translatedContent.labels?.download || ''}
                        onChange={(value) => {
                          const currentLabels = translatedContent.labels || {};
                          handleContentChange({ 
                            labels: {
                              ...currentLabels,
                              download: value
                            }
                          });
                        }}
                        placeholder="Inserisci la traduzione per il pulsante..."
                        errorCondition={!translatedContent.labels?.download}
                        rows={1}
                        fieldId={`pdf-download-${module.id}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
          
        case 'image':
        case 'video':
        case '3d-model':
          return (
            <div className="space-y-4">
              {moduleContent.title && (
                <div>
                  <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.title}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.title}
                      translatedValue={translatedContent.title || ''}
                      onChange={(value) => handleContentChange({ title: value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      errorCondition={!translatedContent.title}
                      rows={1}
                      fieldId={`${module.type}-title-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.description}
                      translatedValue={translatedContent.description || ''}
                      onChange={(value) => handleContentChange({ description: value })}
                      placeholder="Inserisci la traduzione della descrizione..."
                      errorCondition={!translatedContent.description}
                      rows={4}
                      fieldId={`${module.type}-description-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {/* Caption/Didascalia */}
              {moduleContent.caption !== undefined && (
                <div>
                  <Label htmlFor={`module-${module.id}-caption`}>Didascalia</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.caption || ''}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.caption || ''}
                      translatedValue={translatedContent.caption || ''}
                      onChange={(value) => handleContentChange({ caption: value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      errorCondition={moduleContent.caption && !translatedContent.caption}
                      rows={2}
                      fieldId={`${module.type}-caption-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {/* Etichette specifiche per il modello 3D */}
              <div>
                <Label>Etichette interfaccia modello 3D</Label>
                <div className="p-4 bg-gray-50 rounded-md border mt-2">
                  {/* Testo istruzioni modello 3D */}
                  <div className="mb-4">
                    <Label htmlFor={`module-${module.id}-label-3d-instructions`}>Testo istruzioni</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        Questo modello 3D richiede file esterni specifici per funzionare correttamente. Utilizza il pulsante qui sotto per visualizzare il modello con tutti i componenti.
                      </div>
                      <TranslationEditableField
                        originalValue="Questo modello 3D richiede file esterni specifici per funzionare correttamente. Utilizza il pulsante qui sotto per visualizzare il modello con tutti i componenti."
                        translatedValue={translatedContent.labels?.instructions || ''}
                        onChange={(value) => {
                          const currentLabels = translatedContent.labels || {};
                          handleContentChange({ 
                            labels: {
                              ...currentLabels,
                              instructions: value
                            }
                          });
                        }}
                        placeholder="Inserisci la traduzione per le istruzioni..."
                        errorCondition={!translatedContent.labels?.instructions}
                        rows={3}
                        fieldId={`3d-instructions-${module.id}`}
                      />
                    </div>
                  </div>
                  
                  {/* Testo pulsante visualizza modello 3D */}
                  <div className="mb-4">
                    <Label htmlFor={`module-${module.id}-label-3d-view`}>Testo pulsante "Visualizza modello 3D con tutti i componenti"</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        Visualizza modello 3D con tutti i componenti
                      </div>
                      <TranslationEditableField
                        originalValue="Visualizza modello 3D con tutti i componenti"
                        translatedValue={translatedContent.labels?.viewModel || ''}
                        onChange={(value) => {
                          const currentLabels = translatedContent.labels || {};
                          handleContentChange({ 
                            labels: {
                              ...currentLabels,
                              viewModel: value
                            }
                          });
                        }}
                        placeholder="Inserisci la traduzione per il pulsante..."
                        errorCondition={!translatedContent.labels?.viewModel}
                        rows={1}
                        fieldId={`3d-viewModel-${module.id}`}
                      />
                    </div>
                  </div>
                  
                  {/* Testo pulsante scarica modello */}
                  <div>
                    <Label htmlFor={`module-${module.id}-label-3d-download`}>Testo pulsante "Scarica il modello completo (.zip)"</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-neutral-50 rounded border text-sm">
                        Scarica il modello completo (.zip)
                      </div>
                      <TranslationEditableField
                        originalValue="Scarica il modello completo (.zip)"
                        translatedValue={translatedContent.labels?.download || ''}
                        onChange={(value) => {
                          const currentLabels = translatedContent.labels || {};
                          handleContentChange({ 
                            labels: {
                              ...currentLabels,
                              download: value
                            }
                          });
                        }}
                        placeholder="Inserisci la traduzione per il pulsante..."
                        errorCondition={!translatedContent.labels?.download}
                        rows={1}
                        fieldId={`3d-download-${module.id}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
          
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
                    <TranslationEditableField
                      originalValue={moduleContent.title}
                      translatedValue={translatedContent.title || ''}
                      onChange={(value) => handleContentChange({ title: value })}
                      placeholder="Inserisci la traduzione del titolo..."
                      errorCondition={!translatedContent.title}
                      rows={1}
                      fieldId={`${module.type}-title-${module.id}`}
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
                    <TranslationEditableField
                      originalValue={moduleContent.description}
                      translatedValue={translatedContent.description || ''}
                      onChange={(value) => handleContentChange({ description: value })}
                      placeholder="Inserisci la traduzione della descrizione..."
                      errorCondition={!translatedContent.description}
                      rows={4}
                      fieldId={`${module.type}-description-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.text && (
                <div>
                  <Label htmlFor={`module-${module.id}-text`}>Testo del link</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.text}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.text}
                      translatedValue={translatedContent.text || ''}
                      onChange={(value) => handleContentChange({ text: value })}
                      placeholder="Inserisci la traduzione del testo del link..."
                      errorCondition={!translatedContent.text}
                      rows={1}
                      fieldId={`link-text-${module.id}`}
                    />
                  </div>
                </div>
              )}
              
              {moduleContent.caption !== undefined && (
                <div>
                  <Label htmlFor={`module-${module.id}-caption`}>Didascalia</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-neutral-50 rounded border text-sm">
                      {moduleContent.caption || ''}
                    </div>
                    <TranslationEditableField
                      originalValue={moduleContent.caption || ''}
                      translatedValue={translatedContent.caption || ''}
                      onChange={(value) => handleContentChange({ caption: value })}
                      placeholder="Inserisci la traduzione della didascalia..."
                      errorCondition={moduleContent.caption && !translatedContent.caption}
                      rows={2}
                      fieldId={`${module.type}-caption-${module.id}`}
                    />
                  </div>
                </div>
              )}
            </div>
          );

        case 'bom':
          // Assicura che esistano valori predefiniti per tutti i campi
          const defaultTitle = moduleContent.title || "Elenco Componenti";
          const defaultHeaders = {
            code: 'Codice',
            level: 'Livello',
            number: 'N.',
            quantity: 'Quantità',
            description: 'Descrizione',
            ...(moduleContent.headers || {})
          };
          const defaultMessages = {
            loading: 'Caricamento elenco componenti...',
            notFound: 'Elenco componenti non trovato',
            empty: 'Nessun componente disponibile',
            noResults: 'Nessun risultato per i filtri selezionati',
            ...(moduleContent.messages || {})
          };
          const defaultCaption = moduleContent.caption || "";
          
          // Log cosa stiamo visualizzando
          console.log(`Rendering modulo BOM - ID: ${module.id}, Sezione: ${module.sectionId}`, {
            hasTitle: !!defaultTitle,
            hasHeaders: Object.keys(defaultHeaders).length,
            hasMessages: Object.keys(defaultMessages).length,
            hasCaption: !!defaultCaption,
            hasDescriptions: !!(moduleContent.descriptions && Object.keys(moduleContent.descriptions).length > 0)
          });
          
          return (
            <div className="space-y-4">
              {/* Titolo - sempre mostrato */}
              <div>
                <Label htmlFor={`module-${module.id}-title`}>Titolo</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-neutral-50 rounded border text-sm">
                    {defaultTitle}
                  </div>
                  <TranslationEditableField
                    originalValue={defaultTitle}
                    translatedValue={translatedContent.title || ''}
                    onChange={(value) => handleContentChange({ title: value })}
                    placeholder="Inserisci la traduzione del titolo..."
                    errorCondition={!translatedContent.title}
                    rows={1}
                    fieldId={`bom-title-${module.id}`}
                  />
                </div>
              </div>
              
              {/* Intestazioni - sempre mostrate */}
              <div>
                <Label>Intestazioni colonne</Label>
                <div className="mt-2 bg-blue-50 p-4 rounded mb-4 border border-blue-200">
                  <p className="text-sm font-medium mb-2">Traduzioni standard per intestazioni colonne:</p>
                  <ul className="text-sm space-y-1 list-disc pl-5 mb-3">
                    <li><strong>code</strong>: Code</li>
                    <li><strong>level</strong>: Level</li>
                    <li><strong>number</strong>: N.</li>
                    <li><strong>quantity</strong>: Qty</li>
                    <li><strong>description</strong>: Description</li>
                  </ul>
                </div>
                
                <div className="mt-2">
                  {Object.entries(defaultHeaders).map(([key, value]) => {
                    // Inizializza o recupera l'oggetto headers esistente
                    const headers = translatedContent.headers || {};
                    
                    // Definisci le traduzioni predefinite per le intestazioni comuni
                    const defaultTranslations: Record<string, string> = {
                      'code': 'Code',
                      'level': 'Level',
                      'number': 'N.',
                      'quantity': 'Qty',
                      'description': 'Description'
                    };
                    
                    // Usa la traduzione predefinita se esiste, altrimenti usa il valore esistente o vuoto
                    const suggestedTranslation = defaultTranslations[key] || '';
                    const existingTranslation = headers[key] || '';
                    
                    return (
                      <div key={`header-${key}`} className="mt-4">
                        <Label htmlFor={`header-${key}`}>{key}</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="p-3 bg-neutral-50 rounded border text-sm">
                            {value as string}
                          </div>
                          <TranslationEditableField
                            originalValue={value as string}
                            translatedValue={existingTranslation || suggestedTranslation}
                            onChange={(newValue) => {
                              const newHeaders = {
                                ...headers,
                                [key]: newValue
                              };
                              handleContentChange({ headers: newHeaders });
                            }}
                            placeholder={`Suggerito: ${suggestedTranslation || 'Inserisci la traduzione...'}`}
                            errorCondition={!headers[key] && !suggestedTranslation}
                            rows={1}
                            fieldId={`bom-header-${module.id}-${key}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Messaggi - sempre mostrati */}
              <div>
                <Label>Messaggi</Label>
                <div className="mt-2">
                  {Object.entries(defaultMessages).map(([key, value]) => {
                    const messages = translatedContent.messages || {};
                    
                    return (
                      <div key={`message-${key}`} className="mt-4">
                        <Label htmlFor={`message-${key}`}>{key}</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="p-3 bg-neutral-50 rounded border text-sm">
                            {value as string}
                          </div>
                          <TranslationEditableField
                            originalValue={value as string}
                            translatedValue={messages[key] || ''}
                            onChange={(newValue) => {
                              const newMessages = {
                                ...messages,
                                [key]: newValue
                              };
                              handleContentChange({ messages: newMessages });
                            }}
                            placeholder="Inserisci la traduzione..."
                            errorCondition={!messages[key]}
                            rows={1}
                            fieldId={`bom-message-${module.id}-${key}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Didascalia - sempre mostrata */}
              <div>
                <Label htmlFor={`module-${module.id}-caption`}>Didascalia</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-neutral-50 rounded border text-sm">
                    {defaultCaption}
                  </div>
                  <TranslationEditableField
                    originalValue={defaultCaption}
                    translatedValue={translatedContent.caption || ''}
                    onChange={(value) => handleContentChange({ caption: value })}
                    placeholder="Inserisci la traduzione della didascalia..."
                    errorCondition={defaultCaption && !translatedContent.caption}
                    rows={2}
                    fieldId={`bom-caption-${module.id}`}
                  />
                </div>
              </div>
              
              {/* Descrizioni componenti - mostrate se ci sono componenti */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Descrizioni Componenti</Label>
                  <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    Area di traduzione delle descrizioni
                  </div>
                </div>
                
                <div className="mt-4 bg-blue-50 p-4 rounded mb-4 border border-blue-200">
                  <p className="text-sm mb-2">
                    <span className="font-medium">Traduci le descrizioni dei componenti</span> che appaiono nella tabella BOM. 
                    Queste traduzioni saranno utilizzate nell'esportazione del documento nella lingua selezionata.
                  </p>
                </div>
                
                <div className="mt-2">
                  {/* Debug dei filtri applicati */}
                  {moduleContent.filterSettings && (
                    <div className="mb-4 p-3 border rounded bg-blue-50 text-sm">
                      <p className="font-semibold mb-1">Configurazione filtri:</p>
                      <p>Filtro per codice: {moduleContent.filterSettings.codeFilter || 'Nessuno'}</p>
                      <p>Filtro per livello: {moduleContent.filterSettings.levelFilter || 'Tutti'}</p>
                      <p>Filtri attivi: {moduleContent.filterSettings.enableFiltering ? 'Sì' : 'No'}</p>
                      <p>Componenti visibili: {moduleContent.filteredComponentCodes?.length || 0}</p>
                    </div>
                  )}
                  
                  {/* Ottieni l'elenco dei codici componenti effettivamente visibili */}
                  {(() => {
                    // Accesso sicuro alle proprietà
                    const allDescriptions = moduleContent.descriptions || {};
                    const bomId = moduleContent.bomId || 13; // Ottiene l'ID della BOM di riferimento
                    // Passiamo i componenti della BOM caricati a livello superiore
                    
                    // Utilizzeremo gli stati e i dati dai componenti a livello superiore
                    if (isLoadingBomComponents) {
                      return (
                        <div className="p-3 border rounded bg-blue-50 text-sm flex items-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          Caricamento componenti dalla BOM di riferimento...
                        </div>
                      );
                    }
                    
                    // Prima verifichiamo se ci sono componenti filtrati specificati
                    let visibleCodes: string[] = [];
                    
                    // Usa i codici componenti filtrati, se disponibili
                    if (Array.isArray(moduleContent.filteredComponentCodes) && moduleContent.filteredComponentCodes.length > 0) {
                      visibleCodes = moduleContent.filteredComponentCodes;
                      console.log(`Modulo BOM ${module.id}: Usando ${visibleCodes.length} codici componenti filtrati`);
                    } 
                    // Altrimenti usa tutti i codici con descrizioni
                    else if (Object.keys(allDescriptions).length > 0) {
                      visibleCodes = Object.keys(allDescriptions);
                      console.log(`Modulo BOM ${module.id}: Usando ${visibleCodes.length} descrizioni disponibili`);
                    }
                    // Se non ci sono codici filtrati né descrizioni, usa i codici predefiniti in base alla sezione
                    else {
                      const isSecuritySection = module.sectionId === 39;
                      const isDescriptionSection = module.sectionId === 6;
                      
                      if (isSecuritySection) {
                        visibleCodes = ["A8B25040509", "A8C614-31", "A8C624-54", "A8C624-55", "A8C815-45"];
                        console.log(`Modulo BOM ${module.id}: Usando codici predefiniti per sezione sicurezza`);
                      } else if (isDescriptionSection) {
                        visibleCodes = ["A5B03532", "A4B12901"];
                        console.log(`Modulo BOM ${module.id}: Usando codici predefiniti per sezione descrizione`);
                      } else {
                        visibleCodes = ["A5B03509", "A5B03528", "A5B03532", "A5B03539", "A4B12901"];
                        console.log(`Modulo BOM ${module.id}: Usando codici predefiniti generici`);
                      }
                    }
                                       
                    if (isLoadingBomComponents) {
                      return (
                        <div className="p-3 border rounded bg-blue-50 text-sm flex items-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          Caricamento componenti dalla BOM di riferimento...
                        </div>
                      );
                    }
                    
                    if (visibleCodes.length === 0) {
                      return (
                        <div className="p-3 border rounded bg-yellow-50 text-sm">
                          Nessun componente visibile con i filtri correnti.
                        </div>
                      );
                    }
                    
                    // Log quali componenti sono disponibili
                    console.log("Componenti disponibili nella BOM:", Object.keys(bomComponents));
                    console.log("Codici visibili da mostrare:", visibleCodes);
                    
                    const descriptions = translatedContent.descriptions || {};
                    
                    // Filtra i codici per mostrare solo quelli presenti nella BOM di riferimento
                    const validCodes = visibleCodes.filter(code => bomComponents[code] || allDescriptions[code]);
                    
                    if (validCodes.length === 0) {
                      return (
                        <div className="p-3 border rounded bg-yellow-50 text-sm">
                          Nessun componente dalla BOM di riferimento trovato con i codici selezionati.
                        </div>
                      );
                    }
                    
                    // Rendi i campi più evidenti e accessibili
                    return (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-neutral-100">
                                <th className="px-4 py-2 text-left w-1/4">Codice</th>
                                <th className="px-4 py-2 text-left w-2/5">Descrizione originale</th>
                                <th className="px-4 py-2 text-left w-2/5">Descrizione tradotta</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validCodes.map((code: string, index) => {
                                // IMPORTANTE: Usa la descrizione dalla BOM di riferimento se disponibile
                                // Altrimenti usa la descrizione locale se disponibile
                                // Infine, come ultimo caso, usa un valore predefinito
                                const bomComponent = bomComponents[code];
                                const description = bomComponent 
                                  ? bomComponent.description 
                                  : (allDescriptions[code] || `Componente ${code}`);
                                
                                // Stile alternato per le righe
                                const rowClass = index % 2 === 0 ? "bg-white" : "bg-neutral-50";
                                
                                // Badge che indica la fonte della descrizione
                                const descriptionSource = bomComponent 
                                  ? <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full ml-2">BOM Rif.</span>
                                  : (allDescriptions[code] 
                                      ? <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full ml-2">Locale</span>
                                      : <span className="inline-block px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full ml-2">Predefinito</span>);
                                
                                return (
                                  <tr key={`description-${code}`} className={rowClass}>
                                    <td className="px-4 py-3 align-top border-t border-neutral-200">
                                      <span className="font-medium text-blue-700">{code}</span>
                                    </td>
                                    <td className="px-4 py-3 align-top border-t border-neutral-200">
                                      <div className="flex items-start">
                                        <span className="flex-grow">{description}</span>
                                        {descriptionSource}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-top border-t border-neutral-200">
                                      <TranslationEditableField
                                        originalValue={description}
                                        translatedValue={descriptions[code] || ''}
                                        onChange={(newValue) => {
                                          // Crea una copia dello stato esistente
                                          const newDescriptions = {
                                            ...descriptions,
                                            [code]: newValue
                                          };
                                          
                                          // Aggiorna il contenuto con un breve ritardo per prestazioni migliori
                                          clearTimeout((window as any).saveTimeout);
                                          (window as any).saveTimeout = setTimeout(() => {
                                            handleContentChange({ descriptions: newDescriptions });
                                          }, 300);
                                        }}
                                        placeholder="Inserisci la traduzione..."
                                        errorCondition={!descriptions[code]}
                                        rows={2}
                                        fieldId={`bom-description-${module.id}-${code}`}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
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
                      <TranslationEditableField
                        originalValue={field.value}
                        translatedValue={translatedContent[field.key] || ''}
                        onChange={(newValue) => {
                          // Crea un oggetto aggiornamento
                          const update = {};
                          update[field.key] = newValue;
                          
                          // Usa un timer per ritardare l'aggiornamento
                          const fieldKey = `timeout-${field.key}`;
                          clearTimeout((window as any)[fieldKey]);
                          (window as any)[fieldKey] = setTimeout(() => {
                            handleContentChange(update);
                          }, 300);
                        }}
                        placeholder={`Inserisci la traduzione ${field.label.toLowerCase()}...`}
                        errorCondition={!translatedContent[field.key]}
                        rows={3}
                        fieldId={`generic-${module.id}-${field.key}`}
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
          {isEditing ? (
            <div>
              {renderModuleTranslationForm()}
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log(`Chiudendo editing modulo ${module.id} (type: ${module.type})`);
                    
                    // Rimuovi questo modulo dall'elenco globale dei moduli in editing
                    if (typeof window !== 'undefined') {
                      // FORZA la perdita di focus di tutti i textarea
                      (window as any).preventTextareaFocus = true;
                      
                      // Rimuovi lo stato di editing
                      if ((window as any).editingModuleStates) {
                        delete (window as any).editingModuleStates[module.id];
                      }
                      
                      // Forza l'aggiornamento dell'interfaccia
                      setIsEditing(false);
                      
                      // IMPORTANTE: elimina anche eventuali altri stati globali che potrebbero interferire
                      if ((window as any)[`timeout-text-${module.id}`]) {
                        clearTimeout((window as any)[`timeout-text-${module.id}`]);
                        delete (window as any)[`timeout-text-${module.id}`];
                      }
                      
                      // Ripristina il normale comportamento dopo un breve timeout
                      setTimeout(() => {
                        (window as any).preventTextareaFocus = false;
                      }, 100);
                    }
                  }}
                >
                  Chiudi editing
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              <div className="preview">
                {moduleContent && module.type === 'text' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-1">Testo originale:</h4>
                    <p className="p-3 bg-gray-50 rounded border text-sm">{moduleContent.text}</p>
                    
                    <h4 className="text-sm font-medium mb-1 mt-4">Traduzione:</h4>
                    <p className="p-3 bg-neutral-100 rounded border text-sm">
                      {translatedContent.text || <span className="text-red-500">Non tradotto</span>}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Aggiungi questo modulo all'elenco globale dei moduli in editing
                    if (typeof window !== 'undefined') {
                      if (!(window as any).editingModuleStates) {
                        (window as any).editingModuleStates = {};
                      }
                      (window as any).editingModuleStates[module.id] = true;
                    }
                    setIsEditing(true);
                  }}
                  className="ml-auto"
                >
                  ✎ Modifica traduzione
                </Button>
              </div>
            </div>
          )}
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
                    {/* COMPONENTE SPECIALIZZATO PER EVITARE PROBLEMI DI CHIUSURA DEI CAMPI */}
                    <SectionTitleField
                      section={section}
                      translation={sectionTranslations[section.id] || {}}
                      onChange={(value) => {
                        updateSectionTranslation(section.id, 'title', value);
                      }}
                    />
                  </div>
                  
                  {section.description && (
                    <div>
                      {/* NUOVO COMPONENTE SPECIALIZZATO PER DESCRIZIONI */}
                      <SectionDescriptionField
                        section={section}
                        translation={sectionTranslations[section.id] || {}}
                        onChange={(value) => {
                          updateSectionTranslation(section.id, 'description', value);
                        }}
                      />
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
          // Ordiniamo i moduli per il campo 'order' per mantenere l'ordine originale
          const sortedModules = [...modules].sort((a: any, b: any) => a.order - b.order);
          section.modules = sortedModules;
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
          <h1>{documentTitleTranslation || document.title}</h1>
          <p>{document.description}</p>
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
              
              {selectedLanguage && document && (
                <>
                  <div className="flex space-x-2 ml-auto">
                    <Button 
                      variant="default" 
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
                    
                    <div className="relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Esporta documento
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => exportToHtml(documentId, selectedLanguage)}>
                            <FileIcon className="mr-2 h-4 w-4" />
                            Esporta in HTML
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportToPdf(documentId, selectedLanguage)}>
                            <FileIcon className="mr-2 h-4 w-4" />
                            Esporta in PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportToWord(documentId, selectedLanguage)}>
                            <FileIcon className="mr-2 h-4 w-4" />
                            Esporta in Word
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </>
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
          {/* Campo per la traduzione del titolo, versione e descrizione del documento */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Informazioni del documento
              </CardTitle>
              <CardDescription>
                Le informazioni tradotte del documento appariranno in tutte le esportazioni e nell'interfaccia quando questa lingua è selezionata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Titolo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Titolo originale</Label>
                    <div className="mt-2 p-3 bg-neutral-50 rounded border text-base">
                      {document?.title}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="translated-title">Titolo tradotto</Label>
                    <div className="mt-2">
                      <TranslationEditableField
                        originalValue={document?.title || ''}
                        translatedValue={documentTitleTranslation}
                        onChange={(value) => setDocumentTitleTranslation(value)}
                        placeholder="Inserisci la traduzione del titolo del documento..."
                        errorCondition={!documentTitleTranslation}
                        rows={1}
                        fieldId="document-title-translation"
                      />
                    </div>
                  </div>
                </div>

                {/* Versione */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Versione originale</Label>
                    <div className="mt-2 p-3 bg-neutral-50 rounded border text-base">
                      {document?.version}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="translated-version">Versione tradotta</Label>
                    <div className="mt-2">
                      <TranslationEditableField
                        originalValue={document?.version || ''}
                        translatedValue={documentVersionTranslation}
                        onChange={(value) => setDocumentVersionTranslation(value)}
                        placeholder="Inserisci la traduzione della versione del documento..."
                        rows={1}
                        fieldId="document-version-translation"
                      />
                    </div>
                  </div>
                </div>

                {/* Descrizione */}
                {document?.description && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Descrizione originale</Label>
                      <div className="mt-2 p-3 bg-neutral-50 rounded border text-base">
                        {document.description}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="translated-description">Descrizione tradotta</Label>
                      <div className="mt-2">
                        <TranslationEditableField
                          originalValue={document?.description || ''}
                          translatedValue={documentDescriptionTranslation}
                          onChange={(value) => setDocumentDescriptionTranslation(value)}
                          placeholder="Inserisci la traduzione della descrizione del documento..."
                          rows={3}
                          fieldId="document-description-translation"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Pulsante per salvare solo le informazioni del documento */}
                <div className="flex justify-end mt-6">
                  <Button 
                    variant="secondary" 
                    onClick={() => saveDocumentInfo(true)}
                    disabled={savingDocumentInfo}
                  >
                    {savingDocumentInfo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando informazioni...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="mr-2 h-4 w-4" />
                        Salva informazioni documento
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
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