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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
// Rimuoviamo le importazioni che causano errori

interface ModuleTranslationProps {
  toggleSidebar?: () => void;
}

// Componente per tradurre le descrizioni dei componenti BOM
interface BomComponentsDescriptionEditorProps {
  bomId: number;
  translatedContent: any;
  onUpdateDescriptions: (descriptions: Record<string, string>) => void;
  originalModule?: any; // Aggiungiamo il modulo originale come prop
}

function BomComponentsDescriptionEditor({ 
  bomId, 
  translatedContent, 
  onUpdateDescriptions,
  originalModule
}: BomComponentsDescriptionEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [components, setComponents] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  
  // Stato per tenere traccia delle descrizioni dei componenti
  const [componentDescriptions, setComponentDescriptions] = useState<Record<string, string>>({});
  
  // Recupera gli elementi della BOM
  const { data: bomItems, isLoading: isLoadingItems, error } = useQuery({
    queryKey: ['/api/boms', bomId, 'items'],
    enabled: !!bomId,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/boms/${bomId}/items`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Errore nel caricamento degli elementi della distinta base: ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Errore API:", error);
        toast({
          title: "Errore di caricamento",
          description: `Non è stato possibile caricare i componenti: ${error}`,
          variant: "destructive"
        });
        return [];
      }
    }
  });
  
  // Inizializza le descrizioni dai dati della traduzione
  useEffect(() => {
    if (translatedContent && translatedContent.descriptions) {
      console.log("Inizializzazione descrizioni tradotte:", translatedContent.descriptions);
      setComponentDescriptions(translatedContent.descriptions);
    }
  }, [translatedContent]);

  // Aggiorna i componenti quando arrivano i dati
  useEffect(() => {
    if (!bomItems || !Array.isArray(bomItems)) {
      if (bomItems) {
        console.error("Formato BOM non valido:", bomItems);
        toast({
          title: "Formato non valido",
          description: "Il formato dei dati ricevuti non è valido",
          variant: "destructive"
        });
      }
      setIsLoading(false);
      return;
    }
    
    try {
      // Assicurati che ci siano solo componenti visibili nella traduzione
      // Inizia con l'ottenere tutti i componenti dalla BOM
      const allComponents = Array.from(
        new Map(
          bomItems
            .map((item: any) => item.component)
            .filter(Boolean)
            .map((comp: any) => [comp.code, comp])
        ).values()
      );
      
      console.log("Tutti i componenti disponibili:", allComponents.map(c => c.code));
      
      // Determina quali componenti devono essere mostrati nella traduzione
      let visibleComponents = [];
      
      // Ottieni l'elenco dei componenti dalla tabella originale
      // Questo ci dà solo i componenti che sono effettivamente mostrati (filtrati)
      const originalContent = typeof originalModule?.content === 'string' 
        ? JSON.parse(originalModule.content) 
        : originalModule?.content || {};
        
      // Estrai direttamente i codici visibili dai componenti filtrati
      if (originalContent?.filterSettings?.filteredComponentCodes && Array.isArray(originalContent.filterSettings.filteredComponentCodes)) {
        console.log("Usando i codici componenti filtrati direttamente dal modulo originale", originalContent.filterSettings.filteredComponentCodes);
        
        const filteredCodes = originalContent.filterSettings.filteredComponentCodes;
        if (filteredCodes.length > 0) {
          // Filtra i componenti in base ai codici identificati
          visibleComponents = bomItems
            .filter((item: any) => item.component && filteredCodes.includes(item.component.code))
            .map((item: any) => item.component);
          
          // Elimina duplicati
          visibleComponents = Array.from(
            new Map(visibleComponents.map((comp: any) => [comp.code, comp])).values()
          );
          
          console.log("Componenti filtrati estratti direttamente:", visibleComponents.map((c:any) => c.code));
        }
      }
      
      // Se non abbiamo componenti filtrati diretti, prova a ricostruirli usando i filtri
      if (visibleComponents.length === 0 && originalContent?.filterSettings?.enableFiltering) {
        const bomId = originalContent.bomId || translatedContent.bomId;
        
        // Applica gli stessi filtri che sono stati applicati nella tabella originale
        // In questo modo vedremo solo i componenti che appaiono nella tabella
        if (bomId && bomItems.length > 0) {
          // Prendi direttamente i componenti filtrati dal modulo originale
          const filterSettings = originalContent.filterSettings;
          
          // Filtra gli elementi della BOM usando le stesse impostazioni di filtro
          // dell'originale, per vedere esattamente ciò che vedrebbe l'utente
          const filteredBomItems = bomItems.filter((item: any) => {
            if (!item || !item.component) return false;
            
            const code = item.component.code || '';
            const description = item.component.description || '';
            let match = true;
            
            // Applica filtro per codice
            if (filterSettings.codeFilter) {
              switch (filterSettings.codeFilterType) {
                case 'equals':
                  match = match && code.toLowerCase() === filterSettings.codeFilter.toLowerCase();
                  break;
                case 'startsWith':
                  match = match && code.toLowerCase().startsWith(filterSettings.codeFilter.toLowerCase());
                  break;
                case 'contains':
                default:
                  match = match && code.toLowerCase().includes(filterSettings.codeFilter.toLowerCase());
                  break;
              }
            }
            
            // Applica filtro per descrizione
            if (filterSettings.descriptionFilter) {
              switch (filterSettings.descriptionFilterType) {
                case 'equals':
                  match = match && description.toLowerCase() === filterSettings.descriptionFilter.toLowerCase();
                  break;
                case 'startsWith':
                  match = match && description.toLowerCase().startsWith(filterSettings.descriptionFilter.toLowerCase());
                  break;
                case 'contains':
                default:
                  match = match && description.toLowerCase().includes(filterSettings.descriptionFilter.toLowerCase());
                  break;
              }
            }
            
            // Applica filtro per livello
            if (filterSettings.levelFilter !== undefined) {
              match = match && item.level === filterSettings.levelFilter;
            }
            
            return match;
          });
          
          // Estrai solo i componenti dai dati filtrati
          const filteredComponents = Array.from(
            new Map(
              filteredBomItems
                .map((item: any) => item.component)
                .filter(Boolean)
                .map((comp: any) => [comp.code, comp])
            ).values()
          );
          
          visibleComponents = filteredComponents;
          console.log("Componenti filtrati dagli stessi filtri dell'originale:", visibleComponents.map(c => c.code));
        }
      } 
      
      // Se non abbiamo trovato componenti filtrati o non era attivato il filtro nell'originale,
      // proviamo altri metodi per determinare i componenti visibili
      if (visibleComponents.length === 0) {
        // Prima controlla se ci sono componenti specificatamente filtrati nel contenuto tradotto
        if (translatedContent.filteredComponentCodes && Array.isArray(translatedContent.filteredComponentCodes)) {
          console.log("Usando i componenti filtrati dal contenuto tradotto (filteredComponentCodes)");
          const filteredCodes = translatedContent.filteredComponentCodes.filter(Boolean);
              
          if (filteredCodes.length > 0) {
            visibleComponents = allComponents.filter(comp => filteredCodes.includes(comp.code));
          }
        }
        // Prova con il filtro delle impostazioni
        else if (translatedContent.filterSettings?.filteredComponentCodes && 
                 Array.isArray(translatedContent.filterSettings.filteredComponentCodes)) {
          console.log("Usando i componenti dalle impostazioni di filtro");
          const filteredCodes = translatedContent.filterSettings.filteredComponentCodes.filter(Boolean);
            
          if (filteredCodes.length > 0) {
            visibleComponents = allComponents.filter(comp => filteredCodes.includes(comp.code));
          }
        }
        // Verifica se ci sono elementi filtrati nell'array filteredItems
        else if (translatedContent.filteredItems && Array.isArray(translatedContent.filteredItems)) {
          console.log("Usando i componenti filtrati dal contenuto tradotto (filteredItems)");
          const filteredCodes = translatedContent.filteredItems
            .map((item: any) => typeof item === 'string' ? item : item.code || item.componentCode)
            .filter(Boolean);
              
          if (filteredCodes.length > 0) {
            visibleComponents = allComponents.filter(comp => filteredCodes.includes(comp.code));
          }
        }
        // Se non sono stati trovati componenti filtrati, controlla se esistono nelle proprietà del modulo originale
        else if (translatedContent.bomId && translatedContent.visibleComponents) {
          console.log("Usando i componenti visibili dal modulo originale");
          const visibleCodes = Array.isArray(translatedContent.visibleComponents) 
            ? translatedContent.visibleComponents
            : [];
              
          if (visibleCodes.length > 0) {
            visibleComponents = allComponents.filter(comp => visibleCodes.includes(comp.code));
          }
        }
      }
      
      console.log("Componenti finali filtrati:", visibleComponents.map(c => c.code));
      
      // Se abbiamo trovato componenti visibili, usa quelli, altrimenti usa i primi 5 componenti
      // come fallback invece di mostrare tutti i componenti (per evitare di sovraccaricare l'interfaccia)
      if (visibleComponents.length > 0) {
        setComponents(visibleComponents);
      } else {
        // Limitiamo a 5 componenti invece di mostrarli tutti
        const limitedComponents = allComponents.slice(0, 5);
        console.log("Nessun componente filtrato trovato, limitando a 5 componenti:", limitedComponents.map(c => c.code));
        setComponents(limitedComponents);
      }
    } catch (err) {
      console.error("Errore durante il filtraggio dei componenti:", err);
      // In caso di errore, mostra i primi 5 componenti (per limitare)
      const allComponents = Array.from(
        new Map(
          bomItems
            .map((item: any) => item.component)
            .filter(Boolean)
            .map((comp: any) => [comp.code, comp])
        ).values()
      );
      setComponents(allComponents.slice(0, 5));
    }
    
    setIsLoading(false);
  }, [bomItems, translatedContent, toast, originalModule]);
  
  // Gestisce il cambiamento della descrizione di un componente
  const handleDescriptionChange = (code: string, description: string) => {
    // Aggiorna lo stato locale
    setComponentDescriptions(prev => {
      const updated = { ...prev, [code]: description };
      
      // Aggiorna anche lo stato nel componente padre
      onUpdateDescriptions(updated);
      
      return updated;
    });
  };
  
  // Sincronizza le descrizioni nel componente padre quando cambiano quelle locali
  useEffect(() => {
    // Solo se ci sono descrizioni da sincronizzare
    if (Object.keys(componentDescriptions).length > 0) {
      console.log("Sincronizzazione descrizioni con il componente padre:", componentDescriptions);
      onUpdateDescriptions(componentDescriptions);
    }
  }, [componentDescriptions, onUpdateDescriptions]);
  
  // Filtra i componenti in base alla ricerca
  const filteredComponents = searchText
    ? components.filter(component => 
        component.code.toLowerCase().includes(searchText.toLowerCase()) || 
        component.description.toLowerCase().includes(searchText.toLowerCase())
      )
    : components;
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
        <h3 className="font-medium">Errore</h3>
        <p className="text-sm">
          Si è verificato un errore nel caricamento dei componenti. 
          Verifica che l'ID della BOM sia corretto.
        </p>
      </div>
    );
  }
  
  if (isLoading || isLoadingItems) {
    return <div className="p-4 text-center">Caricamento componenti...</div>;
  }
  
  if (!components || components.length === 0) {
    return <div className="p-4 text-center">Nessun componente trovato per questa BOM</div>;
  }
  
  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div>
        <div className="flex items-center border rounded-md px-3 py-2">
          <span className="mr-2 text-neutral-medium">🔍</span>
          <Input
            type="text"
            placeholder="Cerca per codice o descrizione..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchText && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchText("")}
              className="h-4 w-4 p-0"
            >
              <span>✕</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Component list */}
      <div className="space-y-3">
        {filteredComponents.length === 0 ? (
          <div className="text-center p-4 border rounded-md">
            Nessun componente corrisponde alla ricerca
          </div>
        ) : (
          filteredComponents.map(component => (
            <div key={component.code} className="grid grid-cols-1 md:grid-cols-3 gap-3 border p-3 rounded-md">
              <div className="flex flex-col">
                <span className="text-xs text-neutral-medium">Codice</span>
                <span className="font-medium">{component.code}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-medium">Descrizione originale</span>
                <span>{component.description}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-medium">Descrizione tradotta</span>
                <Input
                  value={(componentDescriptions[component.code]) || 
                         (translatedContent.descriptions && translatedContent.descriptions[component.code]) || 
                         ''}
                  onChange={(e) => handleDescriptionChange(component.code, e.target.value)}
                  placeholder="Inserisci traduzione..."
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ModuleTranslation({ toggleSidebar }: ModuleTranslationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const moduleId = parseInt(params.id || "0");

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [translatedContent, setTranslatedContent] = useState<any>({
    headers: {},
    messages: {},
    descriptions: {}
  });
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
    queryKey: [`/api/module-translations`, moduleId, selectedLanguage],
    enabled: !!moduleId && !!selectedLanguage,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/module-translations?moduleId=${moduleId}&languageId=${selectedLanguage}`);
        if (!response.ok) {
          throw new Error("Errore nel caricamento della traduzione");
        }
        const data = await response.json();
        // Registra i dati della traduzione per debug
        if (data.length > 0) {
          console.log("Traduzione esistente trovata:", data[0]);
        }
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
      // Assicurati che lo stato sia impostato a "translated" per aggiornare correttamente lo stato della traduzione
      const dataWithStatus = {
        ...data,
        status: "translated" // Imposta lo stato a "translated" invece di "not_translated"
      };
      
      console.log("Salvando traduzione:", dataWithStatus);
      
      const method = existingTranslation ? 'PUT' : 'POST';
      const endpoint = existingTranslation 
        ? `/api/module-translations/${existingTranslation.id}` 
        : '/api/module-translations';
      
      try {
        const response = await apiRequest(method, endpoint, dataWithStatus);
        
        // Verifica se la risposta è valida prima di provare a fare il parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          // Se la risposta non è JSON, gestisci l'errore
          const text = await response.text();
          console.error("Risposta non valida dal server:", text);
          throw new Error("Il server ha restituito una risposta non valida");
        }
      } catch (err) {
        console.error("Errore durante la richiesta:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/module-translations`, moduleId, selectedLanguage] });
      // Invalida anche le query dello stato di traduzione per aggiornare la UI
      queryClient.invalidateQueries({ queryKey: [`/api/documents`, section?.documentId, 'translation-status'] });
      toast({
        title: "Traduzione salvata",
        description: "La traduzione del modulo è stata salvata con successo",
      });
    },
    onError: (error) => {
      console.error("Errore di mutazione:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante il salvataggio: ${error instanceof Error ? error.message : String(error)}`,
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
          } else if (module.type === 'danger' || module.type === 'warning-alert' || 
                     module.type === 'caution' || module.type === 'note' || 
                     module.type === 'safety-instructions') {
            initialTranslatedContent.title = '';
            initialTranslatedContent.description = '';
          } else if (module.type === 'testp') {
            initialTranslatedContent.title = '';
            initialTranslatedContent.description = '';
            // Preserva il contenuto del testo e l'URL del file, ma inizializza i campi traducibili
            initialTranslatedContent.savedTextContent = initialTranslatedContent.savedTextContent || '';
            initialTranslatedContent.textFileUrl = initialTranslatedContent.textFileUrl || '';
          } else if (module.type === 'image' || module.type === 'video') {
            initialTranslatedContent.caption = '';
            initialTranslatedContent.alt = initialTranslatedContent.alt || '';
          } else if (module.type === 'table') {
            initialTranslatedContent.headers = initialTranslatedContent.headers.map(() => '');
            initialTranslatedContent.rows = initialTranslatedContent.rows.map((row: any[]) => row.map(() => ''));
            initialTranslatedContent.caption = '';
          } else if (module.type === 'checklist') {
            initialTranslatedContent.items = initialTranslatedContent.items.map((item: any) => ({ ...item, text: '' }));
          } else if (module.type === 'bom') {
            // Inizializza la struttura per le traduzioni dell'elenco componenti
            initialTranslatedContent.title = '';
            initialTranslatedContent.headers = {
              number: '', 
              level: '',
              code: '',
              description: '',
              quantity: ''
            };
            initialTranslatedContent.messages = {
              loading: '',
              notFound: '',
              empty: '',
              noResults: ''
            };
            initialTranslatedContent.descriptions = {};
            
            // Ottieni i componenti che vengono effettivamente mostrati nel modulo BOM
            // Cerca eventuali filteredItems o componenti specifici
            try {
              // Verifica se ci sono componenti filtrati nella proprietà filteredComponentCodes
              if (parsedContent.filteredComponentCodes && Array.isArray(parsedContent.filteredComponentCodes)) {
                console.log("Trasferendo filteredComponentCodes alla traduzione", parsedContent.filteredComponentCodes);
                // Usa i codici dei componenti filtrati
                initialTranslatedContent.filteredComponentCodes = parsedContent.filteredComponentCodes;
              }
              // Se abbiamo impostazioni di filtro con componenti filtrati
              else if (parsedContent.filterSettings?.filteredComponentCodes && 
                Array.isArray(parsedContent.filterSettings.filteredComponentCodes)) {
                console.log("Trasferendo filterSettings.filteredComponentCodes alla traduzione", 
                  parsedContent.filterSettings.filteredComponentCodes);
                // Usa i codici estratti dalle impostazioni di filtro
                initialTranslatedContent.filteredComponentCodes = parsedContent.filterSettings.filteredComponentCodes;
              }
              // Mantieni la compatibilità con le versioni precedenti
              else if (parsedContent.filteredComponents && Array.isArray(parsedContent.filteredComponents)) {
                initialTranslatedContent.filteredItems = parsedContent.filteredComponents;
              } else if (parsedContent.items && Array.isArray(parsedContent.items)) {
                initialTranslatedContent.filteredItems = parsedContent.items;
              } else if (parsedContent.filteredItems && Array.isArray(parsedContent.filteredItems)) {
                initialTranslatedContent.filteredItems = parsedContent.filteredItems;
              }
              
              // Aggiungi anche le impostazioni filtro originali
              if (parsedContent.filterSettings) {
                initialTranslatedContent.filterSettings = parsedContent.filterSettings;
              }
            } catch (err) {
              console.error("Errore nell'estrazione dei filtri BOM:", err);
            }
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
      
      if (translation.content) {
        try {
          // Gestisce sia il caso in cui content sia già un oggetto che il caso in cui sia una stringa
          const parsedContent = typeof translation.content === 'string' 
            ? JSON.parse(translation.content) 
            : translation.content;
          
          console.log("Caricamento traduzione esistente:", parsedContent);
          
          // Assicuriamoci che tutte le proprietà necessarie esistano
          if (module.type === 'bom') {
            // Assicurati che la struttura delle traduzioni BOM sia completa
            if (!parsedContent.headers) {
              parsedContent.headers = {
                number: '', 
                level: '',
                code: '',
                description: '',
                quantity: ''
              };
            }
            
            if (!parsedContent.messages) {
              parsedContent.messages = {
                loading: '',
                notFound: '',
                empty: '',
                noResults: ''
              };
            }
            
            if (!parsedContent.descriptions) {
              parsedContent.descriptions = {};
            }
            
            // Preserva filteredComponentCodes dall'originale se non presente nella traduzione
            if (!parsedContent.filteredComponentCodes && module.content) {
              const originalContent = typeof module.content === 'string' 
                ? JSON.parse(module.content) 
                : module.content;
              
              if (originalContent.filteredComponentCodes) {
                parsedContent.filteredComponentCodes = originalContent.filteredComponentCodes;
              } else if (originalContent.filterSettings?.filteredComponentCodes) {
                parsedContent.filteredComponentCodes = originalContent.filterSettings.filteredComponentCodes;
              }
            }
          }
          
          setTranslatedContent(parsedContent);
        } catch (e) {
          console.error("Errore nel parsing della traduzione:", e);
        }
      }
    } else {
      setExistingTranslation(null);
    }
  }, [translation, module]);

  // Handle language selection
  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId);
  };

  // Handle text input change for different module types
  const handleTextChange = (value: string, field: string, index?: number, subIndex?: number) => {
    setTranslatedContent((prev: any) => {
      const updated = { ...prev };
      
      if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        // Assicuriamoci che updated[parentField] esista sempre
        if (!updated[parentField]) {
          updated[parentField] = {};
        }
        
        if (index !== undefined && subIndex !== undefined && Array.isArray(updated[parentField]) && updated[parentField][index]) {
          updated[parentField][index][childField] = value;
        } else if (index !== undefined && Array.isArray(updated[parentField])) {
          updated[parentField][index] = { ...updated[parentField][index], [childField]: value };
        } else {
          // Ora che abbiamo garantito che updated[parentField] esiste, possiamo assegnare il childField
          updated[parentField][childField] = value;
        }
      } else if (index !== undefined && subIndex !== undefined && field === 'rows') {
        if (!updated.rows) updated.rows = [];
        if (!updated.rows[index]) updated.rows[index] = [];
        updated.rows[index][subIndex] = value;
      } else if (index !== undefined && Array.isArray(updated[field])) {
        updated[field][index] = value;
      } else {
        updated[field] = value;
      }
      
      console.log('Aggiornamento contenuto tradotto:', updated);
      return updated;
    });
  };

  // Save translation
  const handleSaveTranslation = () => {
    if (!selectedLanguage || !module) return;
    
    // Assicuriamoci che le strutture dei messaggi e delle intestazioni esistano
    const updatedContent = { ...translatedContent };
    
    // Garantisci che headers e messages esistano
    if (!updatedContent.headers) {
      updatedContent.headers = {
        number: '', 
        level: '',
        code: '',
        description: '',
        quantity: ''
      };
    }
    
    if (!updatedContent.messages) {
      updatedContent.messages = {
        loading: '',
        notFound: '',
        empty: '',
        noResults: ''
      };
    }
    
    // Garantisci che descriptions esista
    if (!updatedContent.descriptions) {
      updatedContent.descriptions = {};
    }
    
    console.log('Salvando traduzione:', updatedContent);
    
    const data = {
      moduleId: moduleId,
      languageId: parseInt(selectedLanguage),
      content: JSON.stringify(updatedContent),
      status: 'translated', // Imposta lo stato a "translated" per indicare che è stato tradotto
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
                        
                        {/* PERICOLO Module */}
                        {module.type === 'danger' && (
                          <>
                            <div>
                              <Label htmlFor="danger-title">Titolo PERICOLO</Label>
                              <Input
                                id="danger-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo PERICOLO tradotto..."
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="danger-description">Descrizione</Label>
                              <Textarea
                                id="danger-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className="min-h-[150px]"
                                placeholder="Descrizione PERICOLO tradotta..."
                              />
                            </div>
                          </>
                        )}
                        
                        {/* AVVERTENZA Module */}
                        {module.type === 'warning-alert' && (
                          <>
                            <div>
                              <Label htmlFor="warning-alert-title">Titolo AVVERTENZA</Label>
                              <Input
                                id="warning-alert-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo AVVERTENZA tradotto..."
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="warning-alert-description">Descrizione</Label>
                              <Textarea
                                id="warning-alert-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className="min-h-[150px]"
                                placeholder="Descrizione AVVERTENZA tradotta..."
                              />
                            </div>
                          </>
                        )}
                        
                        {/* ATTENZIONE Module */}
                        {module.type === 'caution' && (
                          <>
                            <div>
                              <Label htmlFor="caution-title">Titolo ATTENZIONE</Label>
                              <Input
                                id="caution-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo ATTENZIONE tradotto..."
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="caution-description">Descrizione</Label>
                              <Textarea
                                id="caution-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className="min-h-[150px]"
                                placeholder="Descrizione ATTENZIONE tradotta..."
                              />
                            </div>
                          </>
                        )}
                        
                        {/* NOTA Module */}
                        {module.type === 'note' && (
                          <>
                            <div>
                              <Label htmlFor="note-title">Titolo NOTA</Label>
                              <Input
                                id="note-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo NOTA tradotto..."
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="note-description">Descrizione</Label>
                              <Textarea
                                id="note-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className="min-h-[150px]"
                                placeholder="Descrizione NOTA tradotta..."
                              />
                            </div>
                          </>
                        )}
                        
                        {/* Istruzioni di sicurezza Module */}
                        {module.type === 'safety-instructions' && (
                          <>
                            <div>
                              <Label htmlFor="safety-title">Titolo Istruzioni di sicurezza</Label>
                              <Input
                                id="safety-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo Istruzioni di sicurezza tradotto..."
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="safety-description">Descrizione</Label>
                              <Textarea
                                id="safety-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className="min-h-[150px]"
                                placeholder="Descrizione Istruzioni di sicurezza tradotta..."
                              />
                            </div>
                          </>
                        )}
                        
                        {/* File di testo Module */}
                        {module.type === 'testp' && (
                          <>
                            <div>
                              <Label htmlFor="testp-title">Titolo del file di testo</Label>
                              <Input
                                id="testp-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo del file di testo tradotto..."
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="testp-description">Descrizione</Label>
                              <Textarea
                                id="testp-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className="min-h-[100px]"
                                placeholder="Descrizione del file di testo tradotta..."
                              />
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-dashed border-neutral-light">
                              <div className="flex items-center space-x-2 text-sm text-neutral-medium">
                                <span className="material-icons text-base">info</span>
                                <span>Il contenuto del file di testo e l'URL non sono traducibili.</span>
                              </div>
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
                                {Array.isArray(translatedContent.headers) ? (
                                  // Se headers è un array, utilizziamo map per renderizzare gli input
                                  translatedContent.headers.map((header: string, index: number) => (
                                    <Input
                                      key={`header-${index}`}
                                      value={header}
                                      onChange={(e) => handleTextChange(e.target.value, 'headers', index)}
                                      placeholder={`Intestazione ${index + 1}`}
                                    />
                                  ))
                                ) : (
                                  // Se headers è un oggetto o non è definito, mostriamo un messaggio
                                  <div className="col-span-4 text-red-500">
                                    Impossibile visualizzare le intestazioni in questo formato.
                                    Controlla il tipo di tabella.
                                  </div>
                                )}
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
                        {['3d-model', 'pdf', 'component'].includes(module.type) && (
                          <div className="text-center py-4 text-neutral-medium">
                            Questo tipo di modulo non richiede traduzione del contenuto.
                          </div>
                        )}
                        
                        {/* Traduzione per moduli BOM (Elenco Componenti) */}
                        {module.type === 'bom' && (
                          <div className="space-y-4">
                            <div>
                              <Label>Titolo</Label>
                              <Input
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo Elenco Componenti tradotto"
                              />
                            </div>
                            
                            <div>
                              <Label>Intestazioni delle colonne</Label>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                                <div>
                                  <Label htmlFor="header-number" className="text-xs">Numero</Label>
                                  <Input
                                    id="header-number"
                                    value={translatedContent.headers?.number || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.number')}
                                    placeholder="N°"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-level" className="text-xs">Livello</Label>
                                  <Input
                                    id="header-level"
                                    value={translatedContent.headers?.level || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.level')}
                                    placeholder="Livello"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-code" className="text-xs">Codice</Label>
                                  <Input
                                    id="header-code"
                                    value={translatedContent.headers?.code || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.code')}
                                    placeholder="Codice"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-description" className="text-xs">Descrizione</Label>
                                  <Input
                                    id="header-description"
                                    value={translatedContent.headers?.description || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.description')}
                                    placeholder="Descrizione"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-quantity" className="text-xs">Quantità</Label>
                                  <Input
                                    id="header-quantity"
                                    value={translatedContent.headers?.quantity || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.quantity')}
                                    placeholder="Quantità"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <Label>Messaggi</Label>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div>
                                  <Label htmlFor="msg-loading" className="text-xs">Caricamento</Label>
                                  <Input
                                    id="msg-loading"
                                    value={translatedContent.messages?.loading || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.loading')}
                                    placeholder="Caricamento elenco componenti..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="msg-not-found" className="text-xs">Non trovato</Label>
                                  <Input
                                    id="msg-not-found"
                                    value={translatedContent.messages?.notFound || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.notFound')}
                                    placeholder="Elenco componenti non trovato"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="msg-empty" className="text-xs">Vuoto</Label>
                                  <Input
                                    id="msg-empty"
                                    value={translatedContent.messages?.empty || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.empty')}
                                    placeholder="Nessun componente trovato nell'elenco"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="msg-no-results" className="text-xs">Nessun risultato</Label>
                                  <Input
                                    id="msg-no-results"
                                    value={translatedContent.messages?.noResults || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.noResults')}
                                    placeholder="Nessun risultato con i filtri applicati"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Traduzioni delle descrizioni dei componenti */}
                            <div>
                              <Accordion type="single" collapsible className="mt-4">
                                <AccordionItem value="descriptions">
                                  <AccordionTrigger>
                                    <Label className="cursor-pointer">Traduzioni descrizioni componenti</Label>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-4 pt-2">
                                      <p className="text-sm text-neutral-medium">
                                        Aggiungi le traduzioni delle descrizioni dei componenti presenti nella tabella.
                                      </p>
                                      
                                      {/* Carica i componenti della BOM usando l'API */}
                                      <div className="grid grid-cols-1 gap-3">
                                        {module.content && (() => {
                                          try {
                                            const bomContent = typeof module.content === 'string' ? JSON.parse(module.content) : module.content;
                                            
                                            if (!bomContent || !bomContent.bomId) {
                                              return (
                                                <div className="p-4 text-orange-700 bg-orange-50 border border-orange-200 rounded-md">
                                                  <h3 className="font-medium">Dati BOM mancanti</h3>
                                                  <p className="text-sm">
                                                    Il modulo non contiene un ID di BOM valido. Verifica che l'elenco componenti sia stato configurato correttamente.
                                                  </p>
                                                </div>
                                              );
                                            }
                                            
                                            return (
                                              <BomComponentsDescriptionEditor 
                                                bomId={bomContent.bomId}
                                                translatedContent={translatedContent}
                                                originalModule={module}
                                                onUpdateDescriptions={(descriptions: Record<string, string>) => {
                                                  setTranslatedContent((prev: any) => ({
                                                    ...prev,
                                                    descriptions: descriptions || {}
                                                  }));
                                                }}
                                              />
                                            );
                                          } catch (e) {
                                            console.error("Errore nel parsing del contenuto BOM:", e);
                                            return (
                                              <div className="p-4 text-red-700 bg-red-50 border border-red-200 rounded-md">
                                                <h3 className="font-medium">Errore nel caricamento dei componenti</h3>
                                                <p className="text-sm">
                                                  Si è verificato un errore nell'analisi del contenuto del modulo BOM. 
                                                  Dettaglio: {String(e)}
                                                </p>
                                              </div>
                                            );
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
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