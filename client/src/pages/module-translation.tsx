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
  getOriginalContent?: (code: string) => string;
  isFieldTranslated?: (code: string) => boolean;
}

function BomComponentsDescriptionEditor({ 
  bomId, 
  translatedContent, 
  onUpdateDescriptions,
  originalModule,
  getOriginalContent,
  isFieldTranslated
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
                  placeholder={component.description}
                  className={isFieldTranslated && !isFieldTranslated(component.code) ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
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
            initialTranslatedContent.caption = '';
            initialTranslatedContent.title = '';
          } else if (module.type === 'pdf') {
            // Inizializza campi per moduli PDF
            initialTranslatedContent.title = '';
            initialTranslatedContent.caption = '';
            initialTranslatedContent.description = '';
          } else if (module.type === 'link') {
            // Inizializza campi per moduli Link
            initialTranslatedContent.text = '';  // Il testo del link
            initialTranslatedContent.description = '';
            initialTranslatedContent.caption = '';
          } else if (module.type === 'bom') {
            // Inizializza la struttura per le traduzioni dell'elenco componenti
            initialTranslatedContent.title = '';
            initialTranslatedContent.description = '';
            initialTranslatedContent.caption = '';
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
      
      // Caso speciale per le intestazioni di tabella
      if (field === 'headers' && index !== undefined && module.type === 'table') {
        // Assicuriamoci che headers sia sempre un array
        if (!Array.isArray(updated.headers)) {
          const originalHeaders = Array.isArray(module.content.headers) ? 
            module.content.headers : [];
          // Inizializza l'array headers con stringhe vuote per ogni intestazione originale
          updated.headers = originalHeaders.map(() => '');
        }
        // Aggiorna il valore all'indice specificato
        updated.headers[index] = value;
        console.log(`Aggiornata intestazione tabella[${index}] a: ${value}`, updated.headers);
      }
      else if (field.includes('.')) {
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
    
    // Gestione speciale per i moduli di tipo tabella
    if (module.type === 'table') {
      // Assicurati che headers sia un array, altrimenti convertilo
      if (!Array.isArray(updatedContent.headers)) {
        console.log("Convertendo headers da non-array a array per salvataggio:", updatedContent.headers);
        
        // Se headers è una stringa o altro tipo, inizializza un array vuoto
        // poi prendi i valori originali per sapere quanti elementi creare
        const originalHeaders = Array.isArray(module.content.headers) ? 
          module.content.headers : [];
        
        // Crea un nuovo array di stringhe vuote
        updatedContent.headers = originalHeaders.map(() => '');
      }
    } 
    // Gestione per i moduli BOM (le intestazioni per questi sono oggetti)
    else if (module.type === 'bom') {
      // Garantisci che headers e messages esistano
      if (!updatedContent.headers || typeof updatedContent.headers !== 'object') {
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

  // Funzione per verificare se un campo è stato tradotto
  const isFieldTranslated = (field: string, index?: number, subIndex?: number) => {
    if (!translatedContent) return false;
    
    // Gestione di campi nidificati come 'headers.title'
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (!translatedContent[parent]) return false;
      
      return !!translatedContent[parent][child] && 
             typeof translatedContent[parent][child] === 'string' && 
             translatedContent[parent][child].trim() !== '';
    }
    
    // Gestione di array bidimensionali (tabelle)
    if (field === 'rows' && index !== undefined && subIndex !== undefined) {
      return !!translatedContent.rows && 
             !!translatedContent.rows[index] && 
             !!translatedContent.rows[index][subIndex] && 
             translatedContent.rows[index][subIndex].trim() !== '';
    }
    
    // Gestione di array semplici
    if (index !== undefined && Array.isArray(translatedContent[field])) {
      if (translatedContent[field][index] && typeof translatedContent[field][index] === 'object') {
        // Per elementi di array che sono oggetti (es. checklist items)
        return !!translatedContent[field][index].text && translatedContent[field][index].text.trim() !== '';
      }
      
      return !!translatedContent[field][index] && 
             typeof translatedContent[field][index] === 'string' && 
             translatedContent[field][index].trim() !== '';
    }
    
    // Campi standard
    return !!translatedContent[field] && 
           typeof translatedContent[field] === 'string' && 
           translatedContent[field].trim() !== '';
  };
  
  // Ottiene il contenuto originale del campo per mostrarlo come placeholder
  const getOriginalContent = (field: string, index?: number, subIndex?: number) => {
    if (!module || !module.content) return '';
    
    let content;
    try {
      content = typeof module.content === 'string' ? JSON.parse(module.content) : module.content;
    } catch (e) {
      console.error("Errore nel parsing del contenuto originale:", e);
      return '';
    }
    
    // Gestione di campi nidificati come 'headers.title'
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (!content[parent]) return '';
      return content[parent][child] || '';
    }
    
    // Gestione di array bidimensionali (tabelle)
    if (field === 'rows' && index !== undefined && subIndex !== undefined) {
      return content.rows && content.rows[index] ? content.rows[index][subIndex] || '' : '';
    }
    
    // Gestione di array semplici
    if (index !== undefined && Array.isArray(content[field])) {
      if (content[field][index] && typeof content[field][index] === 'object') {
        // Per elementi di array che sono oggetti (es. checklist items)
        return content[field][index].text || '';
      }
      
      return content[field][index] || '';
    }
    
    // Campi standard
    return content[field] || '';
  };

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
                                placeholder={getOriginalContent('title')}
                                className={!isFieldTranslated('title') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                              />
                            </div>
                            <div>
                              <Label htmlFor="warning-message">Messaggio avvertenza</Label>
                              <Textarea
                                id="warning-message"
                                value={translatedContent.message || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'message')}
                                className={`min-h-[150px] ${!isFieldTranslated('message') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}`}
                                placeholder={getOriginalContent('message')}
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
                                placeholder={getOriginalContent('title')}
                                className={!isFieldTranslated('title') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="testp-description">Descrizione</Label>
                              <Textarea
                                id="testp-description"
                                value={translatedContent.description || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'description')}
                                className={`min-h-[100px] ${!isFieldTranslated('description') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}`}
                                placeholder={getOriginalContent('description')}
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
                        
                        {/* PDF Module */}
                        {module.type === 'pdf' && (
                          <>
                            <div>
                              <Label htmlFor="pdf-title">Titolo del documento PDF</Label>
                              <Input
                                id="pdf-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder={getOriginalContent('title')}
                                className={!isFieldTranslated('title') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                              />
                            </div>
                            <div className="mt-2">
                              <Label htmlFor="pdf-caption">Didascalia</Label>
                              <Input
                                id="pdf-caption"
                                value={translatedContent.caption || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'caption')}
                                placeholder={getOriginalContent('caption')}
                                className={!isFieldTranslated('caption') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                              />
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-dashed border-neutral-light">
                              <div className="flex items-center space-x-2 text-sm text-neutral-medium">
                                <span className="material-icons text-base">info</span>
                                <span>L'URL del documento PDF non è traducibile.</span>
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
                          <div className="space-y-6">
                            <div>
                              <Label htmlFor="table-caption">Didascalia tabella</Label>
                              <Input
                                id="table-caption"
                                value={translatedContent.caption || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'caption')}
                                placeholder={getOriginalContent('caption')}
                                className={isFieldTranslated('caption') ? '' : 'border-red-500'}
                              />
                            </div>
                            
                            <div className="space-y-4">
                              <Label>Intestazioni e Contenuto Tabella</Label>
                              
                              {/* Mostra lo stato dell'intestazione corrente */}
                              <div className="text-sm text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                                <p>Stato intestazioni: {
                                  Array.isArray(translatedContent.headers) 
                                    ? `Array con ${translatedContent.headers.length} elementi`
                                    : typeof translatedContent.headers === 'string'
                                      ? `Stringa: "${translatedContent.headers}"`
                                      : 'Non definito'
                                }</p>
                              </div>
                              
                              <div className="border rounded-md overflow-hidden">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="bg-neutral-lightest border-b">
                                      {Array.isArray(module.content.headers) && module.content.headers.map((header: string, index: number) => {
                                        // Se headers non è un array, assicurati di mostrare un campo vuoto
                                        let headerValue = '';
                                        if (Array.isArray(translatedContent.headers)) {
                                          headerValue = translatedContent.headers[index] || '';
                                        }
                                        
                                        return (
                                          <th key={`header-${index}`} className="p-2 text-left border-r last:border-r-0">
                                            <Input
                                              value={headerValue}
                                              onChange={(e) => handleTextChange(e.target.value, 'headers', index)}
                                              placeholder={header}
                                              className={
                                                Array.isArray(translatedContent.headers) && 
                                                translatedContent.headers[index] ? 
                                                'border-neutral-200' : 'border-red-500'
                                              }
                                            />
                                          </th>
                                        );
                                      })}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.isArray(module.content.rows) && module.content.rows.map((row: string[], rowIndex: number) => (
                                      <tr key={`row-${rowIndex}`} className="border-b last:border-b-0">
                                        {row.map((cell: string, cellIndex: number) => (
                                          <td key={`cell-${rowIndex}-${cellIndex}`} className="p-2 border-r last:border-r-0">
                                            <Input
                                              value={
                                                Array.isArray(translatedContent.rows) && 
                                                translatedContent.rows[rowIndex] &&
                                                translatedContent.rows[rowIndex][cellIndex] || ''
                                              }
                                              onChange={(e) => handleTextChange(e.target.value, 'rows', rowIndex, cellIndex)}
                                              placeholder={cell}
                                              className={
                                                Array.isArray(translatedContent.rows) && 
                                                translatedContent.rows[rowIndex] && 
                                                translatedContent.rows[rowIndex][cellIndex] ? 
                                                'border-neutral-200' : 'border-red-500'
                                              }
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              <div className="text-sm text-neutral-medium mt-2">
                                <p><strong>Nota:</strong> I campi in rosso non sono ancora stati tradotti</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {module.type === 'checklist' && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="checklist-title">Titolo</Label>
                              <Input
                                id="checklist-title"
                                value={translatedContent.title || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'title')}
                                placeholder="Titolo lista di controllo tradotto..."
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="checklist-caption">Didascalia</Label>
                              <Input
                                id="checklist-caption"
                                value={translatedContent.caption || ''}
                                onChange={(e) => handleTextChange(e.target.value, 'caption')}
                                placeholder="Didascalia lista di controllo tradotta..."
                              />
                            </div>
                            
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
                                    placeholder={getOriginalContent('headers.number') || "N°"}
                                    className={!isFieldTranslated('headers.number') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-level" className="text-xs">Livello</Label>
                                  <Input
                                    id="header-level"
                                    value={translatedContent.headers?.level || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.level')}
                                    placeholder={getOriginalContent('headers.level') || "Livello"}
                                    className={!isFieldTranslated('headers.level') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-code" className="text-xs">Codice</Label>
                                  <Input
                                    id="header-code"
                                    value={translatedContent.headers?.code || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.code')}
                                    placeholder={getOriginalContent('headers.code') || "Codice"}
                                    className={!isFieldTranslated('headers.code') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-description" className="text-xs">Descrizione</Label>
                                  <Input
                                    id="header-description"
                                    value={translatedContent.headers?.description || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.description')}
                                    placeholder={getOriginalContent('headers.description') || "Descrizione"}
                                    className={!isFieldTranslated('headers.description') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="header-quantity" className="text-xs">Quantità</Label>
                                  <Input
                                    id="header-quantity"
                                    value={translatedContent.headers?.quantity || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'headers.quantity')}
                                    placeholder={getOriginalContent('headers.quantity') || "Quantità"}
                                    className={!isFieldTranslated('headers.quantity') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
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
                                    placeholder={getOriginalContent('messages.loading') || "Caricamento elenco componenti..."}
                                    className={!isFieldTranslated('messages.loading') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="msg-not-found" className="text-xs">Non trovato</Label>
                                  <Input
                                    id="msg-not-found"
                                    value={translatedContent.messages?.notFound || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.notFound')}
                                    placeholder={getOriginalContent('messages.notFound') || "Elenco componenti non trovato"}
                                    className={!isFieldTranslated('messages.notFound') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="msg-empty" className="text-xs">Vuoto</Label>
                                  <Input
                                    id="msg-empty"
                                    value={translatedContent.messages?.empty || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.empty')}
                                    placeholder={getOriginalContent('messages.empty') || "Nessun componente trovato nell'elenco"}
                                    className={!isFieldTranslated('messages.empty') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="msg-no-results" className="text-xs">Nessun risultato</Label>
                                  <Input
                                    id="msg-no-results"
                                    value={translatedContent.messages?.noResults || ''}
                                    onChange={(e) => handleTextChange(e.target.value, 'messages.noResults')}
                                    placeholder={getOriginalContent('messages.noResults') || "Nessun risultato con i filtri applicati"}
                                    className={!isFieldTranslated('messages.noResults') ? "placeholder:text-red-500 placeholder:font-medium placeholder:bg-red-50" : ""}
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
                                                getOriginalContent={getOriginalContent}
                                                isFieldTranslated={(code) => isFieldTranslated(`descriptions.${code}`)}
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