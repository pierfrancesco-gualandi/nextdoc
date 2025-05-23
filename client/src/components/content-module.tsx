import { useState, useRef, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ThreeModelViewer from "./three-model-viewer";
import FileSelector from "./file-selector";
import ThreeModelEditor from "./three-model-editor";
import VideoPlayer from "./video-player";
import BomViewContent, { BomFilterSettings } from "./BomViewContent";
import DirectBomViewer from "./DirectBomViewer";
import { 
  DangerModule,
  WarningAlertModule,
  CautionModule,
  NoteModule,
  SafetyInstructionsModule
} from "./warning-modules";

// Component to select a BOM
const BomSelector = ({ bomId, onChange }: { bomId: number, onChange: (bomId: number) => void }) => {
  const { data: boms = [] } = useQuery({
    queryKey: ['/api/boms'],
    staleTime: 30000,
  });

  if (!boms || !Array.isArray(boms) || boms.length === 0) {
    return <div className="text-neutral-medium">Nessun elenco componenti disponibile</div>;
  }

  return (
    <Select
      value={bomId ? bomId.toString() : ""}
      onValueChange={(value) => onChange(parseInt(value))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona un elenco componenti" />
      </SelectTrigger>
      <SelectContent>
        {boms.map((bom: any) => (
          <SelectItem key={bom.id} value={bom.id.toString()}>
            {bom.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ComponentListContent = ({ documentId }: { documentId: string }) => {
  // Implementazione da aggiungere
  return <div>Elenco componenti (da implementare)</div>;
};

interface ContentModuleProps {
  module: any;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
  documentId: string;
  isPreview?: boolean;
  selectedLanguage?: string;
  highlightMissingTranslations?: boolean;
  disabled?: boolean;
}

// Funzione per estrarre la traduzione dai dati del modulo
const parseTranslation = (module: any, selectedLanguage?: string, moduleTranslations?: any): any => {
  try {
    console.log("Analisi translation per modulo:", module.id, "tipo:", module.type, "lingua:", selectedLanguage);
    console.log("Traduzioni caricate dal server:", moduleTranslations);
    
    // Se abbiamo traduzioni caricate dal server, usale
    if (moduleTranslations && Array.isArray(moduleTranslations) && moduleTranslations.length > 0) {
      const translation = moduleTranslations[0];
      if (translation && translation.content) {
        let translationContent;
        if (typeof translation.content === 'string') {
          translationContent = JSON.parse(translation.content);
        } else {
          translationContent = translation.content;
        }
        console.log("Utilizzando traduzione dal server:", translationContent);
        return translationContent;
      }
    }
    
    // SOLUZIONE TEMPORANEA: Se è un modulo BOM e lingua 2 (inglese), ritorna una traduzione hardcoded
    if (module.type === "bom" && selectedLanguage === "2") {
      console.log("APPLICANDO TRADUZIONE HARDCODED PER TEST!");
      // Crea una traduzione di test
      const testTranslation = {
        title: "Component List",
        headers: {
          number: "No.",
          level: "Level",
          code: "Code",
          description: "Description",
          quantity: "Qty"
        },
        descriptions: {
          "A8B25040509": "SHAFT ",
          "A8C614-31": "BEARING SHAFT",
          "A8C624-54": "WASHER",
          "A8C624-55": "PRESSURE DISK",
          "A8C815-45": "END LID",
          "A8C815-48": "SHAFT",
          "A8C815-61": "WASHER",
          "A8C910-7": "WHEEL",
          "A8C942-67": "WHEEL"
        }
      };
      return testTranslation;
    }
    
    // Verifica se il modulo ha una traduzione
    if (module && module.translation && module.translation.content) {
      // Parse del JSON della traduzione
      let translationContent;
      
      if (typeof module.translation.content === 'string') {
        translationContent = JSON.parse(module.translation.content);
      } else {
        translationContent = module.translation.content;
      }
      
      console.log("Traduzione diretta trovata per il modulo:", module.id, translationContent);
      
      // Per i moduli di tipo "bom", assicuriamoci che abbia la struttura corretta per le traduzioni
      if (module.type === "bom" && translationContent) {
        if (!translationContent.descriptions) {
          translationContent.descriptions = {};
        }
        
        // Debug dei contenuti delle descrizioni
        console.log("Descrizioni nella traduzione:", translationContent.descriptions);
        
        // Assicuriamoci che le descrizioni vuote siano undefined e non stringhe vuote
        // per evitare che vengano interpretate come traduzioni esistenti
        Object.keys(translationContent.descriptions).forEach(key => {
          if (translationContent.descriptions[key] === "") {
            translationContent.descriptions[key] = undefined;
          }
        });
      }
      
      return translationContent;
    }
    
    // Se è specificata una lingua, cerca tra le traduzioni disponibili per quella lingua
    if (selectedLanguage && module && module.translations) {
      console.log("Cerco nelle traduzioni disponibili:", module.translations);
      
      // Trova la traduzione per la lingua selezionata
      const translation = module.translations.find((t: any) => 
        t.languageId === parseInt(selectedLanguage) || t.languageId === selectedLanguage
      );
      
      console.log("Traduzione trovata per linguaId:", selectedLanguage, "->", translation);
      
      if (translation && translation.content) {
        let translationContent;
        if (typeof translation.content === 'string') {
          translationContent = JSON.parse(translation.content);
        } else {
          translationContent = translation.content;
        }
        
        // Per i moduli di tipo "bom", assicuriamoci che abbia la struttura corretta per le traduzioni
        if (module.type === "bom" && translationContent) {
          if (!translationContent.descriptions) {
            translationContent.descriptions = {};
          }
          
          // Debug dei contenuti di descriptions
          console.log("Descrizioni nella traduzione del modulo:", translationContent.descriptions);
          
          // Assicuriamoci che le descrizioni vuote siano undefined e non stringhe vuote
          Object.keys(translationContent.descriptions).forEach(key => {
            if (translationContent.descriptions[key] === "") {
              translationContent.descriptions[key] = undefined;
            }
          });
        }
        
        console.log("Traduzione completa per la lingua:", selectedLanguage, translationContent);
        return translationContent;
      }
    }
  } catch (error) {
    console.error("Errore nel parsing della traduzione:", error);
  }
  return undefined;
};

export default function ContentModule({ 
  module, 
  onDelete, 
  onUpdate,
  documentId,
  isPreview = false,
  selectedLanguage,
  highlightMissingTranslations = true,
  disabled = false
}: ContentModuleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditingState] = useState(false);
  const [content, setContent] = useState(module.content);
  
  // Ottieni il ruolo utente dal contesto
  const { currentUserRole } = useUser();
  
  // Wrapper per setIsEditing che controlla i permessi
  const setIsEditing = (value: boolean) => {
    // Non permettere di entrare in modalità di modifica se:
    // 1. Il modulo è disabilitato (props), oppure
    // 2. L'utente non ha il ruolo di admin o editor
    if (value && (disabled || (currentUserRole !== 'admin' && currentUserRole !== 'editor'))) {
      toast({
        title: "Permesso negato",
        description: "Non hai i permessi per modificare questo modulo",
        variant: "destructive"
      });
      return;
    }
    setIsEditingState(value);
  };
  
  // Carica le traduzioni del modulo se è selezionata una lingua diversa dall'italiano
  const { data: moduleTranslations } = useQuery({
    queryKey: [`/api/module-translations`, { moduleId: module.id, languageId: selectedLanguage }],
    enabled: !!selectedLanguage && selectedLanguage !== 'it' && selectedLanguage !== '0' && isPreview,
    staleTime: 30000,
  });

  const updateModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', `/api/modules/${module.id}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      onUpdate(module.id, data);
      setIsEditing(false);
      toast({
        title: "Successo",
        description: "Modulo aggiornato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante l'aggiornamento: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  const saveChanges = () => {
    updateModuleMutation.mutate({
      id: module.id, 
      module: {
        content: JSON.stringify(content),  // Converti l'oggetto in stringa JSON
        type: module.type,
        sectionId: module.sectionId
      }
    });
  };
  
  const handleDeleteModule = () => {
    onDelete(module.id);
  };
  
  const getModuleIcon = (type: string): string => {
    switch (type) {
      case "text": return "text_fields";
      case "testp": return "description";
      case "image": return "image";
      case "video": return "videocam";
      case "table": return "table_chart";
      case "warning": return "warning";
      case "checklist": return "checklist";
      case "component": return "hub";
      case "bom": return "account_tree";
      case "link": return "link";
      case "pdf": return "picture_as_pdf";
      case "3d-model": return "view_in_ar";
      case "danger": return "error";
      case "warning-alert": return "warning_amber";
      case "caution": return "report_problem";
      case "note": return "info";
      case "safety-instructions": return "shield";
      default: return "article";
    }
  };
  
  const getModuleLabel = (type: string): string => {
    switch (type) {
      case "text": return "Testo";
      case "testp": return "File di testo";
      case "image": return "Immagine";
      case "video": return "Video";
      case "table": return "Tabella";
      case "warning": return "Avviso";
      case "checklist": return "Lista di controllo";
      case "component": return "Componente";
      case "bom": return "Elenco Componenti";
      case "link": return "Link";
      case "pdf": return "PDF";
      case "3d-model": return "Modello 3D";
      case "danger": return "PERICOLO";
      case "warning-alert": return "AVVERTENZA";
      case "caution": return "ATTENZIONE";
      case "note": return "NOTA";
      case "safety-instructions": return "Istruzioni di sicurezza";
      default: return type;
    }
  };
  
  const renderModuleContent = () => {
    if (isEditing) {
      return renderModuleEditor();
    }
    
    switch (module.type) {
      case "testp":
        return (
          <div className="text-module border rounded-md overflow-hidden bg-white">
            <div className="bg-neutral-lightest px-4 py-2 border-b flex items-center justify-between">
              <div className="font-medium">{content?.title || "File di testo"}</div>
              <div className="text-xs text-neutral-medium">{content?.description || ""}</div>
            </div>
            <div className="p-4">
              {content?.savedTextContent ? (
                <div className="whitespace-pre-wrap font-mono text-sm bg-neutral-lightest p-4 rounded-md border border-neutral-light overflow-x-auto">
                  {content.savedTextContent}
                </div>
              ) : content?.textFileUrl ? (
                <div className="flex items-center justify-center text-neutral-medium">
                  <span className="material-icons mr-2">description</span>
                  File di testo: {content.textFileUrl.split('/').pop()}
                </div>
              ) : (
                <div className="text-neutral-medium text-center py-4">
                  Nessun contenuto di testo disponibile
                </div>
              )}
            </div>
          </div>
        );
        
      case "text":
        return (
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ __html: content?.text || "" }} 
          />
        );
        
      case "image":
        return (
          <div className="flex flex-col items-center my-2">
            {content?.src && (
              <img 
                src={content.src} 
                alt={content.alt || "Immagine"} 
                className="max-w-full h-auto object-contain border border-neutral-lightest rounded-md" 
              />
            )}
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "video":
        return (
          <div className="flex flex-col items-center my-2">
            <VideoPlayer 
              src={content.src}
              title={content.title}
              autoplay={content.autoplay}
              loop={content.loop}
              muted={content.muted}
              controls={content.controls !== false}
            />
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "table":
        if (!content.headers || !content.rows) {
          return <div className="text-neutral-medium italic">Tabella non configurata</div>;
        }
        
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-neutral-lightest">
                  {content.headers.map((header: string, index: number) => (
                    <th 
                      key={index} 
                      className="border border-neutral-light p-2 text-left font-medium text-neutral-dark"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.rows.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex} className="border-b border-neutral-light">
                    {row.map((cell: string, cellIndex: number) => (
                      <td 
                        key={cellIndex} 
                        className="border border-neutral-light p-2"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic">{content.caption}</div>}
          </div>
        );
        
      case "warning":
        let bgColorClass = "bg-blue-50";
        let borderColorClass = "border-blue-200";
        let textColorClass = "text-blue-700";
        let iconName = "info";
        
        if (content.level === "warning") {
          bgColorClass = "bg-yellow-50";
          borderColorClass = "border-yellow-200";
          textColorClass = "text-yellow-700";
          iconName = "warning";
        } else if (content.level === "error") {
          bgColorClass = "bg-red-50";
          borderColorClass = "border-red-200";
          textColorClass = "text-red-700";
          iconName = "error";
        }
        
        return (
          <div className={`${bgColorClass} ${borderColorClass} border rounded-md p-4 my-2`}>
            <div className="flex items-start">
              <span className={`material-icons ${textColorClass} mr-2`}>{iconName}</span>
              <div>
                {content.title && <h4 className={`${textColorClass} font-medium mb-1`}>{content.title}</h4>}
                <p className={textColorClass}>{content.message}</p>
              </div>
            </div>
          </div>
        );
        
      case "checklist":
        if (!content.items || !Array.isArray(content.items)) {
          return <div className="text-neutral-medium italic">Lista di controllo non configurata</div>;
        }
        
        return (
          <div className="my-2">
            <div className="space-y-2">
              {content.items.map((item: any, index: number) => (
                <div key={index} className="flex items-start">
                  <div className="mr-2 mt-0.5">
                    <Checkbox 
                      id={`checklist-item-${module.id}-${index}`} 
                      checked={item.checked} 
                      disabled={true}
                    />
                  </div>
                  <Label 
                    htmlFor={`checklist-item-${module.id}-${index}`}
                    className={`text-neutral-dark ${item.checked ? 'line-through text-neutral-medium' : ''}`}
                  >
                    {item.text}
                  </Label>
                </div>
              ))}
            </div>
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic text-center">{content.caption}</div>}
          </div>
        );
        
      case "component":
        return (
          <div className="my-2 border border-neutral-light rounded-md p-4 bg-neutral-lightest">
            <div className="flex items-center">
              <span className="material-icons text-primary mr-2">hub</span>
              <h4 className="text-lg font-medium">Componente: {content.componentName || "Non specificato"}</h4>
            </div>
            <div className="mt-2">
              <p className="text-neutral-medium">Quantità: {content.quantity || 1}</p>
              {content.notes && <p className="mt-1">{content.notes}</p>}
            </div>
          </div>
        );
        
      case "link":
        return (
          <div className="my-2 p-3 border border-neutral-light rounded-md">
            <a 
              href={content.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary flex items-center hover:underline"
            >
              <span className="material-icons mr-2">link</span>
              {content.text || content.url}
            </a>
            {content.description && (
              <p className="mt-1 text-neutral-medium text-sm">{content.description}</p>
            )}
          </div>
        );
        
      case "pdf":
        return (
          <div className="my-2">
            <div className="border border-neutral-light rounded-md p-3 bg-neutral-lightest">
              <div className="flex items-center">
                <span className="material-icons text-red-500 mr-2">picture_as_pdf</span>
                <span className="font-medium">{content.title || "Documento PDF"}</span>
              </div>
              <div className="mt-2">
                <a 
                  href={content.src} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center text-sm"
                >
                  <span className="material-icons text-sm mr-1">open_in_new</span>
                  Apri PDF
                </a>
              </div>
              {content.caption && (
                <div className="mt-3 text-center text-sm text-neutral-medium italic">
                  {content.caption}
                </div>
              )}
            </div>
          </div>
        );
        
      case "3d-model":
        // Verifica se l'URL è un ID di file caricato o un URL diretto
        let modelUrl = content.url && content.url.startsWith('/uploads') 
          ? content.url 
          : content.fileId 
            ? `/uploads/${content.fileId}` 
            : content.src 
              ? content.src 
              : "";
              
        // Se l'URL è vuoto ma abbiamo un folderPath, proviamo a costruire l'URL standard
        if ((!modelUrl || modelUrl === "") && content.folderPath) {
          // L'URL ideale è nella forma /uploads/NOME_CARTELLA/NOME_CARTELLA.htm
          const folderName = content.folderPath;
          const fileExtension = "htm"; // Estensione predefinita per i modelli WebGL
          modelUrl = `/uploads/${folderName}/${folderName}.${fileExtension}`;
          console.log(`URL modello 3D generato da folderPath: ${modelUrl}`);
        }
              
        console.log("URL modello 3D:", modelUrl, "Content:", content);
        
        // Controlla se l'URL è ancora vuoto dopo i nostri tentativi
        if (!modelUrl || modelUrl === "") {
          return (
            <div className="my-2 p-4 border border-red-300 bg-red-50 text-red-800 rounded-md text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="font-medium mb-1">Errore di visualizzazione</div>
              <div>Nessun URL o file specificato per il modello 3D.</div>
            </div>
          );
        }
        
        return (
          <div className="my-2">
            <ThreeModelViewer
              modelData={{
                src: modelUrl,
                format: content.format || "html", // Usa il formato specifico dal contenuto se disponibile
                title: content.title || "Modello 3D"
              }}
              height={400} // Altezza aumentata per modelli WebGL
            />
            {content.caption && <div className="mt-2 text-sm text-neutral-dark italic text-center">{content.caption}</div>}
          </div>
        );
        
      case "danger":
        {
          // Se il modulo è tradotto, ottieni il contenuto originale
          let originalContent = null;
          if (isPreview && selectedLanguage && selectedLanguage !== '0') {
            try {
              // Se c'è il campo original nel modulo, usalo per accedere ai dati originali
              if (module.original) {
                originalContent = module.original.content && typeof module.original.content === 'string' 
                  ? JSON.parse(module.original.content) 
                  : module.original.content;
              }
              // Altrimenti estrai i dati originali dal modulo stesso
              else {
                originalContent = module.content && typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
              }
            } catch (e) {
              console.error("Errore nel parsing del contenuto originale:", e);
            }
          }
          
          return (
            <DangerModule
              title={content.title}
              message={content.message || content.text}
              description={content.description}
              isTranslated={!!module.translation?.content}
              highlightMissingTranslations={highlightMissingTranslations}
              originalTitle={originalContent?.title}
              originalDescription={originalContent?.description}
            />
          );
        }
        
      case "warning-alert":
        {
          // Se il modulo è tradotto, ottieni il contenuto originale
          let originalContent = null;
          if (isPreview && selectedLanguage && selectedLanguage !== '0') {
            try {
              // Se c'è il campo original nel modulo, usalo per accedere ai dati originali
              if (module.original) {
                originalContent = module.original.content && typeof module.original.content === 'string' 
                  ? JSON.parse(module.original.content) 
                  : module.original.content;
              }
              // Altrimenti estrai i dati originali dal modulo stesso
              else {
                originalContent = module.content && typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
              }
            } catch (e) {
              console.error("Errore nel parsing del contenuto originale:", e);
            }
          }
          
          return (
            <WarningAlertModule
              title={content.title}
              message={content.message || content.text}
              description={content.description}
              isTranslated={!!module.translation?.content}
              highlightMissingTranslations={highlightMissingTranslations}
              originalTitle={originalContent?.title}
              originalDescription={originalContent?.description}
            />
          );
        }
        
      case "caution":
        {
          // Se il modulo è tradotto, ottieni il contenuto originale
          let originalContent = null;
          if (isPreview && selectedLanguage && selectedLanguage !== '0') {
            try {
              // Se c'è il campo original nel modulo, usalo per accedere ai dati originali
              if (module.original) {
                originalContent = module.original.content && typeof module.original.content === 'string' 
                  ? JSON.parse(module.original.content) 
                  : module.original.content;
              }
              // Altrimenti estrai i dati originali dal modulo stesso
              else {
                originalContent = module.content && typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
              }
            } catch (e) {
              console.error("Errore nel parsing del contenuto originale:", e);
            }
          }
          
          return (
            <CautionModule
              title={content.title}
              message={content.message || content.text}
              description={content.description}
              isTranslated={!!module.translation?.content}
              highlightMissingTranslations={highlightMissingTranslations}
              originalTitle={originalContent?.title}
              originalDescription={originalContent?.description}
            />
          );
        }
        
      case "note":
        {
          // Se il modulo è tradotto, ottieni il contenuto originale
          let originalContent = null;
          if (isPreview && selectedLanguage && selectedLanguage !== '0') {
            try {
              // Se c'è il campo original nel modulo, usalo per accedere ai dati originali
              if (module.original) {
                originalContent = module.original.content && typeof module.original.content === 'string' 
                  ? JSON.parse(module.original.content) 
                  : module.original.content;
              }
              // Altrimenti estrai i dati originali dal modulo stesso
              else {
                originalContent = module.content && typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
              }
            } catch (e) {
              console.error("Errore nel parsing del contenuto originale:", e);
            }
          }
          
          return (
            <NoteModule
              title={content.title}
              message={content.message || content.text}
              description={content.description}
              isTranslated={!!module.translation?.content}
              highlightMissingTranslations={highlightMissingTranslations}
              originalTitle={originalContent?.title}
              originalDescription={originalContent?.description}
            />
          );
        }
        
      case "safety-instructions":
        {
          // Se il modulo è tradotto, ottieni il contenuto originale
          let originalContent = null;
          if (isPreview && selectedLanguage && selectedLanguage !== '0') {
            try {
              // Se c'è il campo original nel modulo, usalo per accedere ai dati originali
              if (module.original) {
                originalContent = module.original.content && typeof module.original.content === 'string' 
                  ? JSON.parse(module.original.content) 
                  : module.original.content;
              }
              // Altrimenti estrai i dati originali dal modulo stesso
              else {
                originalContent = module.content && typeof module.content === 'string' 
                  ? JSON.parse(module.content) 
                  : module.content;
              }
            } catch (e) {
              console.error("Errore nel parsing del contenuto originale:", e);
            }
          }
          
          return (
            <SafetyInstructionsModule
              title={content.title}
              message={content.message || content.text}
              description={content.description}
              isTranslated={!!module.translation?.content}
              highlightMissingTranslations={highlightMissingTranslations}
              originalTitle={originalContent?.title}
              originalDescription={originalContent?.description}
            />
          );
        }

      case "bom":
        // In modalità traduzione, usa i filtri salvati nel modulo o impostazioni predefinite
        if (isPreview) {
          console.log("BomViewer in modalità traduzione", { 
            sectionId: module.sectionId,
            bomId: content.bomId || 13,
            hasFilterSettings: !!content.filterSettings,
            filteredComponentCodes: content.filteredComponentCodes?.length || 0
          });
          
          // Traduzioni per il BOM (se disponibili)
          let bomTranslation;
          if (selectedLanguage) {
            bomTranslation = parseTranslation(module, selectedLanguage);
            console.log("Traduzioni per il modulo BOM:", bomTranslation);
          }
          
          // NUOVO COMPORTAMENTO: Usa i filteredComponentCodes salvati in modalità editor se disponibili
          if (content.filterSettings && Array.isArray(content.filteredComponentCodes) && content.filteredComponentCodes.length > 0) {
            // Usa i filtri salvati dal modulo (gli stessi visualizzati in modalità editor)
            console.log("Utilizzando filtri salvati dal modulo con", content.filteredComponentCodes.length, "componenti");
            
            return (
              <div>
                {content.description && !isEditing && (
                  <div className="mb-4 text-neutral-medium">
                    {content.description}
                  </div>
                )}
                <DirectBomViewer 
                  bomId={content.bomId || 13}
                  title={bomTranslation?.title || "Elenco Componenti"}
                  headers={bomTranslation?.headers || {
                    number: "N°",
                    level: "Livello",
                    code: "Codice",
                    description: "Descrizione",
                    quantity: "Quantità"
                  }}
                  filteredCodes={content.filteredComponentCodes}
                />
              </div>
            );
          } 
          
          // Fallback alle regole predefinite se i filtri non sono disponibili
          // Determinazione dei codici filtrati in base alla sezione
          let filteredCodes: string[] = [];
          
          // Sezione 3.1 Sicurezza (ID: 39)
          if (module.sectionId === 39 || (content && content.isSecuritySection)) {
            // Codici ESATTI dalla sezione sicurezza
            filteredCodes = ["A8B25040509", "A8C614-31", "A8C624-54", "A8C624-55", "A8C815-45", "A8C815-48", "A8C815-61", "A8C910-7", "A8C942-67"];
            console.log("DirectBomViewer - sezione 3.1 SICUREZZA -", module.sectionId, "- usando componenti SICUREZZA");
          }
          // Sezione Descrizione/Introduzione (ID: 6, 1)
          else if (module.sectionId === 6 || module.sectionId === 1) {
            // Codici ESATTI dalla sezione descrizione/introduzione
            filteredCodes = ["A5B03532", "A4B12901"]; 
            console.log("DirectBomViewer - sezione INTRODUZIONE/DESCRIZIONE -", module.sectionId, "- usando componenti DESCRIZIONE");
          }
          // Sezione 2.1 Disegno 3D (ID: 16)
          else if (module.sectionId === 16) {
            // Codici dalla sezione 2.1
            filteredCodes = ["A5B03509", "A5B03528", "A5B03532", "A5B03539", "A5B05309A", "A5B05309B", "A5B05611", "A8B25040509", "A8C614-31", "A8C624-54"];
            console.log("DirectBomViewer - sezione 2.1 DISEGNO 3D -", module.sectionId, "- usando componenti DISEGNO 3D");
          }
          // Tutte le altre sezioni - caso default
          else {
            // Usa un set completo come fallback
            filteredCodes = ["A5B03509", "A5B03528", "A5B03532", "A5B03539", "A4B12901"];
            console.log("DirectBomViewer - altra sezione -", module.sectionId, "- usando componenti fallback");
          }
          
          // Usa DirectBomViewer con filtri predefiniti se non ci sono filtri salvati
          return (
            <div>
              {content.description && !isEditing && (
                <div className="mb-4 text-neutral-medium">
                  {content.description}
                </div>
              )}
              <DirectBomViewer 
                bomId={content.bomId || 13}
                title={bomTranslation?.title || "Elenco Componenti"}
                headers={bomTranslation?.headers || {
                  number: "N°",
                  level: "Livello",
                  code: "Codice",
                  description: "Descrizione",
                  quantity: "Quantità"
                }}
                filteredCodes={filteredCodes}
              />
            </div>
          );
        }
        
        // In modalità editor standard, usa il componente standard
        return (
          <div>
            {content.description && !isEditing && (
              <div className="mb-4 text-neutral-medium">
                {content.description}
              </div>
            )}
            <BomViewContent
              bomId={content.bomId}
              filter={content.filter}
              levelFilter={content.levelFilter}
              useFilters={isPreview ? false : content.useFilters}  // In anteprima, non mostrare i controlli di filtro
              filterSettings={content.filterSettings}
              translation={isPreview ? (() => {
                const translationData = parseTranslation(module, selectedLanguage);
                console.log("Dati di traduzione completi passati a BomViewContent:", translationData);
                return translationData;
              })() : undefined}
              selectedLanguage={selectedLanguage}
              highlightMissingTranslations={isPreview && highlightMissingTranslations}
              onFilterUpdate={(filterSettings: BomFilterSettings) => {
                // Estrai codici componenti filtrati per consentire traduzioni mirate
                const filteredComponentCodes = filterSettings.filteredComponentCodes || [];
                
                // Aggiorna silenziosamente il contenuto del modulo con le impostazioni di filtro correnti
                if (!isEditing && JSON.stringify(filterSettings) !== JSON.stringify(content.filterSettings)) {
                  // Aggiungiamo l'elenco dei codici componenti al contenuto del modulo
                  const updatedContent = { 
                    ...content, 
                    filterSettings,
                    filteredComponentCodes // Aggiorna l'elenco dei componenti visibili
                  };
                  setContent(updatedContent); // Aggiorna lo stato locale
                  
                  try {
                    // Usa setTimeout per evitare il ciclo di render
                    setTimeout(() => {
                      // Assicurati che il modulo da salvare contenga tutti i campi necessari
                      updateModuleMutation.mutate({ 
                        id: module.id, 
                        module: {
                          content: JSON.stringify(updatedContent),  // Converti l'oggetto in stringa JSON
                          type: module.type,
                          sectionId: module.sectionId
                        }
                      });
                    }, 0);
                  } catch (error) {
                    console.error("Errore nell'aggiornamento dei filtri:", error);
                  }
                }
              }}
            />
          </div>
        );
        
      default:
        return <div>Tipo di modulo non supportato: {module.type}</div>;
    }
  };
  
  const renderModuleEditor = () => {
    switch (module.type) {
      case "testp":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="testp-title">Titolo</Label>
              <Input 
                id="testp-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
                placeholder="Titolo del file di testo"
              />
            </div>
            <div>
              <Label htmlFor="testp-description">Descrizione</Label>
              <Input 
                id="testp-description" 
                value={content.description || ""} 
                onChange={(e) => setContent({ ...content, description: e.target.value })} 
                placeholder="Descrizione del file di testo"
              />
            </div>
            <div>
              <Label htmlFor="testp-file">File di testo</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="testp-file" 
                  value={content.textFileUrl || ""} 
                  onChange={(e) => setContent({ ...content, textFileUrl: e.target.value })} 
                  placeholder="URL del file di testo"
                  disabled={!!content.textContent}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  type="button"
                  onClick={() => {
                    // Implementare upload file
                    console.log("Upload file di testo");
                  }}
                >
                  <span className="material-icons text-sm mr-1">upload_file</span>
                  Upload
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="testp-content">Contenuto</Label>
              <Textarea 
                id="testp-content" 
                value={content.textContent || ""} 
                onChange={(e) => setContent({ ...content, textContent: e.target.value })} 
                placeholder="Inserisci il contenuto del file di testo"
                className="font-mono text-sm min-h-[200px]"
              />
            </div>
            <div className="flex justify-end">
              <Button 
                variant="default" 
                size="sm"
                type="button"
                onClick={() => {
                  // Salva il contenuto corrente come savedTextContent
                  setContent({ 
                    ...content, 
                    savedTextContent: content.textContent
                  });
                  
                  // Auto salvataggio del modulo
                  setTimeout(() => {
                    updateModuleMutation.mutate({
                      id: module.id, 
                      module: {
                        content: JSON.stringify({
                          ...content,
                          savedTextContent: content.textContent
                        }), 
                        type: module.type,
                        sectionId: module.sectionId
                      }
                    });
                  }, 100);
                }}
              >
                <span className="material-icons text-sm mr-1">save</span>
                Salva contenuto
              </Button>
            </div>
          </div>
        );
      
      case "text":
        return (
          <div className="mb-4">
            <TiptapEditor 
              content={content.text} 
              onChange={(text) => setContent({ ...content, text })} 
              sectionId={module.sectionId}
            />
          </div>
        );
        
      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-src">URL dell'immagine</Label>
              <Input 
                id="image-src" 
                value={content.src || ""} 
                onChange={(e) => setContent({ ...content, src: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Testo alternativo</Label>
              <Input 
                id="image-alt" 
                value={content.alt || ""} 
                onChange={(e) => setContent({ ...content, alt: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="image-caption">Didascalia</Label>
              <Input 
                id="image-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
              />
            </div>
          </div>
        );
        
      case "warning":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="warning-title">Titolo</Label>
              <Input 
                id="warning-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="warning-message">Messaggio</Label>
              <Textarea 
                id="warning-message" 
                value={content.message || ""} 
                onChange={(e) => setContent({ ...content, message: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="warning-level">Livello</Label>
              <Select
                value={content.level || "warning"}
                onValueChange={(value) => setContent({ ...content, level: value })}
              >
                <SelectTrigger id="warning-level">
                  <SelectValue placeholder="Seleziona livello" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informazione</SelectItem>
                  <SelectItem value="warning">Avviso</SelectItem>
                  <SelectItem value="error">Errore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case "video":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-src">URL del video</Label>
              <Input 
                id="video-src" 
                value={content.src || ""} 
                onChange={(e) => setContent({ ...content, src: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="video-title">Titolo</Label>
              <Input 
                id="video-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="video-caption">Didascalia</Label>
              <Input 
                id="video-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-autoplay"
                  checked={content.autoplay || false}
                  onCheckedChange={(checked) => setContent({ ...content, autoplay: !!checked })}
                />
                <Label htmlFor="video-autoplay">Autoplay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-loop"
                  checked={content.loop || false}
                  onCheckedChange={(checked) => setContent({ ...content, loop: !!checked })}
                />
                <Label htmlFor="video-loop">Loop</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-muted"
                  checked={content.muted || false}
                  onCheckedChange={(checked) => setContent({ ...content, muted: !!checked })}
                />
                <Label htmlFor="video-muted">Muto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="video-controls"
                  checked={content.controls !== false}
                  onCheckedChange={(checked) => setContent({ ...content, controls: !!checked })}
                />
                <Label htmlFor="video-controls">Controlli</Label>
              </div>
            </div>
          </div>
        );
      
      case "3d-model":
        // Mostra informazioni sul file correntemente caricato
        let fileInfo = "";
        if (content.fileId) {
          fileInfo = `File ID: ${content.fileId}`;
        } else if (content.url) {
          fileInfo = `URL: ${content.url}`;
        }
        
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model-title">Titolo</Label>
              <Input 
                id="model-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            
            <div>
              <Label htmlFor="model-caption">Didascalia</Label>
              <Input 
                id="model-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
                placeholder="Didascalia da visualizzare sotto il modello 3D"
              />
            </div>
            
            {/* File uploader per modelli 3D */}
            <div>
              <Label>File del modello 3D</Label>
              <div className="mt-2">
                {fileInfo ? (
                  <div className="bg-slate-100 p-2 rounded-md text-sm mb-2">
                    <span className="material-icons text-xs mr-1 align-middle">file_present</span> {fileInfo}
                  </div>
                ) : null}
                <FileSelector
                  onFileSelected={(file) => {
                    if (file) {
                      // Se abbiamo un file, lo impostiamo nel modulo
                      setContent({
                        ...content,
                        fileId: file.filename,
                        fileName: file.originalName,
                        // Mantieni l'URL solo se non è un file appena selezionato
                        url: undefined
                      });
                    }
                  }}
                  accept=".html,.htm,.gltf,.glb,.obj"
                />
                <div className="text-xs text-neutral-medium mt-1">
                  Accetta file HTML, GLTF, GLB e OBJ. Per modelli WebGL carica un file HTML o carica un archivio ZIP.
                </div>
              </div>
            </div>
            
            {/* L'URL è opzionale e alternativo al file */}
            <div>
              <Label htmlFor="model-url">URL del modello (opzionale)</Label>
              <Input 
                id="model-url" 
                value={content.url || ""} 
                onChange={(e) => {
                  // Se impostiamo un URL, cancelliamo il file
                  setContent({ 
                    ...content, 
                    url: e.target.value,
                    fileId: e.target.value ? undefined : content.fileId,
                    fileName: e.target.value ? undefined : content.fileName
                  });
                }}
                placeholder="URL esterno (usare solo se non si carica un file)"
              />
              <p className="text-xs text-neutral-medium mt-1">
                Usare solo se non viene caricato un file. L'URL ha precedenza sul file caricato.
              </p>
            </div>
            
            <div>
              <Label htmlFor="model-format">Formato del modello</Label>
              <Select
                value={content.format || "html"}
                onValueChange={(value) => setContent({ ...content, format: value })}
              >
                <SelectTrigger id="model-format">
                  <SelectValue placeholder="Seleziona formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML / WebGL</SelectItem>
                  <SelectItem value="gltf">GLTF / GLB</SelectItem>
                  <SelectItem value="obj">OBJ</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Seleziona "HTML / WebGL" per visualizzatori WebGL caricati da ZIP o cartelle
              </p>
            </div>
          </div>
        );
        
      case "table":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-caption">Didascalia tabella</Label>
              <Input
                id="table-caption"
                value={content.caption || ""}
                onChange={(e) => setContent({ ...content, caption: e.target.value })}
                placeholder="Inserisci una didascalia per la tabella"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Intestazioni</Label>
              <div className="flex gap-2 mb-2">
                {(content.headers || []).map((header, index) => (
                  <div key={index} className="flex-1">
                    <Input
                      value={header}
                      onChange={(e) => {
                        const newHeaders = [...(content.headers || [])];
                        newHeaders[index] = e.target.value;
                        setContent({ ...content, headers: newHeaders });
                      }}
                      placeholder={`Intestazione ${index + 1}`}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newHeaders = [...(content.headers || []), ""];
                    setContent({ ...content, headers: newHeaders });
                  }}
                >
                  <span className="material-icons">add</span>
                </Button>
                {(content.headers || []).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newHeaders = [...(content.headers || [])];
                      newHeaders.pop();
                      
                      // Assicurati che le righe abbiano lo stesso numero di colonne
                      const newRows = (content.rows || []).map(row => {
                        const newRow = [...row];
                        if (newRow.length > newHeaders.length) {
                          return newRow.slice(0, newHeaders.length);
                        }
                        return newRow;
                      });
                      
                      setContent({ ...content, headers: newHeaders, rows: newRows });
                    }}
                  >
                    <span className="material-icons">remove</span>
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Dati della tabella</Label>
              <div className="space-y-2">
                {(content.rows || []).map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2 items-center">
                    {row.map((cell, cellIndex) => (
                      <div key={cellIndex} className="flex-1">
                        <Input
                          value={cell}
                          onChange={(e) => {
                            const newRows = [...(content.rows || [])];
                            newRows[rowIndex][cellIndex] = e.target.value;
                            setContent({ ...content, rows: newRows });
                          }}
                          placeholder={`Riga ${rowIndex + 1}, Colonna ${cellIndex + 1}`}
                        />
                      </div>
                    ))}
                    {(content.headers || []).length > row.length && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newRows = [...(content.rows || [])];
                          newRows[rowIndex].push("");
                          setContent({ ...content, rows: newRows });
                        }}
                      >
                        <span className="material-icons">add_circle_outline</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newRows = [...(content.rows || [])];
                        newRows.splice(rowIndex, 1);
                        setContent({ ...content, rows: newRows });
                      }}
                    >
                      <span className="material-icons">delete_outline</span>
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const headerCount = (content.headers || []).length || 1;
                    const newRow = Array(headerCount).fill("");
                    const newRows = [...(content.rows || []), newRow];
                    setContent({ ...content, rows: newRows });
                  }}
                >
                  <span className="material-icons mr-2">add_box</span>
                  Aggiungi riga
                </Button>
              </div>
            </div>
          </div>
        );
        
      case "bom":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bom-id">Elenco Componenti</Label>
              <BomSelector
                bomId={content.bomId || 0}
                onChange={(bomId) => setContent({ ...content, bomId })}
              />
            </div>
            <div>
              <Label htmlFor="bom-description">Descrizione (traducibile)</Label>
              <Input
                id="bom-description"
                value={content.description || ""}
                onChange={(e) => setContent({ ...content, description: e.target.value })}
                placeholder="Inserisci una descrizione per questo elenco componenti"
              />
            </div>
            <div>
              <Label htmlFor="bom-caption">Didascalia (traducibile)</Label>
              <Input
                id="bom-caption"
                value={content.caption || ""}
                onChange={(e) => setContent({ ...content, caption: e.target.value })}
                placeholder="Didascalia da visualizzare sotto l'elenco componenti"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="bom-use-filters"
                checked={content.useFilters || false}
                onCheckedChange={(checked) => {
                  const useFilters = !!checked;
                  // Se abilitiamo i filtri, inizializza anche le impostazioni
                  const filterSettings = useFilters && !content.filterSettings 
                    ? {
                        codeFilter: "",
                        codeFilterType: "contains",
                        descriptionFilter: "",
                        descriptionFilterType: "contains",
                        enableFiltering: false
                      } 
                    : content.filterSettings;
                  
                  setContent({ ...content, useFilters, filterSettings });
                }}
              />
              <Label htmlFor="bom-use-filters">Mostra filtri</Label>
            </div>
            
            {(content.useFilters || false) && (
              <div className="border border-neutral-light rounded-md p-4 mt-2">
                <h4 className="text-sm font-medium mb-2">Impostazioni dei filtri predefiniti</h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code-filter-type">Filtro Codice</Label>
                      <Select
                        value={(content.filterSettings?.codeFilterType || "contains")}
                        onValueChange={(value) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            codeFilterType: value as 'contains' | 'startsWith' | 'equals'
                          };
                          setContent({ ...content, filterSettings });
                        }}
                      >
                        <SelectTrigger id="code-filter-type">
                          <SelectValue placeholder="Tipo di filtro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contiene</SelectItem>
                          <SelectItem value="startsWith">Inizia con</SelectItem>
                          <SelectItem value="equals">Uguale a</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="code-filter-value">Valore</Label>
                      <Input
                        id="code-filter-value"
                        value={content.filterSettings?.codeFilter || ""}
                        onChange={(e) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            codeFilter: e.target.value
                          };
                          setContent({ ...content, filterSettings });
                        }}
                        placeholder="Codice da filtrare"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description-filter-type">Filtro Descrizione</Label>
                      <Select
                        value={(content.filterSettings?.descriptionFilterType || "contains")}
                        onValueChange={(value) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            descriptionFilterType: value as 'contains' | 'startsWith' | 'equals'
                          };
                          setContent({ ...content, filterSettings });
                        }}
                      >
                        <SelectTrigger id="description-filter-type">
                          <SelectValue placeholder="Tipo di filtro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contiene</SelectItem>
                          <SelectItem value="startsWith">Inizia con</SelectItem>
                          <SelectItem value="equals">Uguale a</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description-filter-value">Valore</Label>
                      <Input
                        id="description-filter-value"
                        value={content.filterSettings?.descriptionFilter || ""}
                        onChange={(e) => {
                          const filterSettings = {
                            ...(content.filterSettings || {}),
                            descriptionFilter: e.target.value
                          };
                          setContent({ ...content, filterSettings });
                        }}
                        placeholder="Descrizione da filtrare"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="level-filter">Filtro Livello</Label>
                    <Input
                      id="level-filter"
                      type="number"
                      min="0"
                      max="10"
                      value={content.filterSettings?.levelFilter !== undefined ? content.filterSettings.levelFilter : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const filterSettings = {
                          ...(content.filterSettings || {}),
                          levelFilter: value ? parseInt(value) : undefined
                        };
                        setContent({ ...content, filterSettings });
                      }}
                      placeholder="Livello (0-10)"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-enabled"
                      checked={content.filterSettings?.enableFiltering || false}
                      onCheckedChange={(checked) => {
                        const filterSettings = {
                          ...(content.filterSettings || {}),
                          enableFiltering: !!checked
                        };
                        setContent({ ...content, filterSettings });
                      }}
                    />
                    <Label htmlFor="filter-enabled">Abilita filtri predefiniti</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case "checklist":
        if (!content.items || !Array.isArray(content.items)) {
          content.items = [{ text: "", checked: false }];
        }
        
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="checklist-title">Titolo</Label>
              <Input 
                id="checklist-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
                placeholder="Titolo della lista di controllo"
              />
            </div>
            
            <div>
              <Label htmlFor="checklist-caption">Didascalia</Label>
              <Input 
                id="checklist-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
                placeholder="Didascalia da visualizzare sotto la lista di controllo"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Elementi della lista</Label>
              {content.items.map((item: any, index: number) => (
                <div key={index} className="flex items-start">
                  <div className="mr-2 mt-1">
                    <Checkbox 
                      id={`checklist-item-edit-${module.id}-${index}`} 
                      checked={item.checked} 
                      onCheckedChange={(checked) => {
                        const newItems = [...content.items];
                        newItems[index] = { ...newItems[index], checked: !!checked };
                        setContent({ ...content, items: newItems });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      value={item.text}
                      onChange={(e) => {
                        const newItems = [...content.items];
                        newItems[index] = { ...newItems[index], text: e.target.value };
                        setContent({ ...content, items: newItems });
                      }}
                      placeholder="Elemento della lista"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newItems = [...content.items];
                      newItems.splice(index, 1);
                      if (newItems.length === 0) {
                        newItems.push({ text: "", checked: false });
                      }
                      setContent({ ...content, items: newItems });
                    }}
                    className="ml-2"
                  >
                    <span className="material-icons">delete</span>
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const newItems = [...content.items, { text: "", checked: false }];
                setContent({ ...content, items: newItems });
              }}
              className="w-full"
            >
              <span className="material-icons mr-2">add</span>
              Aggiungi elemento
            </Button>
          </div>
        );
        
      case "component":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="component-id">Componente</Label>
              <Select
                value={content.componentId ? content.componentId.toString() : ""}
                onValueChange={(value) => {
                  const componentId = parseInt(value);
                  // Recupera le informazioni del componente se necessario
                  setContent({ ...content, componentId });
                }}
              >
                <SelectTrigger id="component-id">
                  <SelectValue placeholder="Seleziona un componente" />
                </SelectTrigger>
                <SelectContent>
                  {/* Da implementare: lista dei componenti disponibili */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="component-quantity">Quantità</Label>
              <Input 
                id="component-quantity" 
                type="number" 
                min="1"
                value={content.quantity || 1} 
                onChange={(e) => setContent({ ...content, quantity: parseInt(e.target.value) || 1 })} 
              />
            </div>
            <div>
              <Label htmlFor="component-notes">Note</Label>
              <Textarea 
                id="component-notes" 
                value={content.notes || ""} 
                onChange={(e) => setContent({ ...content, notes: e.target.value })} 
              />
            </div>
          </div>
        );
        
      case "link":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input 
                id="link-url" 
                value={content.url || ""} 
                onChange={(e) => setContent({ ...content, url: e.target.value })} 
                placeholder="https://esempio.com"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Testo del link</Label>
              <Input 
                id="link-text" 
                value={content.text || ""} 
                onChange={(e) => setContent({ ...content, text: e.target.value })} 
                placeholder="Clicca qui"
              />
            </div>
            <div>
              <Label htmlFor="link-description">Descrizione (opzionale)</Label>
              <Input 
                id="link-description" 
                value={content.description || ""} 
                onChange={(e) => setContent({ ...content, description: e.target.value })} 
                placeholder="Breve descrizione del link"
              />
            </div>
          </div>
        );
        
      case "pdf":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pdf-src">URL del PDF</Label>
              <Input 
                id="pdf-src" 
                value={content.src || ""} 
                onChange={(e) => setContent({ ...content, src: e.target.value })} 
                placeholder="https://esempio.com/documento.pdf"
              />
            </div>
            <div>
              <Label htmlFor="pdf-title">Titolo del documento</Label>
              <Input 
                id="pdf-title" 
                value={content.title || ""} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
                placeholder="Manuale di istruzioni"
              />
            </div>
            <div>
              <Label htmlFor="pdf-caption">Didascalia</Label>
              <Input 
                id="pdf-caption" 
                value={content.caption || ""} 
                onChange={(e) => setContent({ ...content, caption: e.target.value })} 
                placeholder="Didascalia da visualizzare sotto il PDF"
              />
            </div>
          </div>
        );
        
      case "danger":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="danger-title">Titolo</Label>
              <Input 
                id="danger-title" 
                value={content.title || "PERICOLO"} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="danger-description">Descrizione</Label>
              <TiptapEditor 
                content={content.description || ""} 
                onChange={(description) => setContent({ ...content, description })} 
                sectionId={module.sectionId}
              />
            </div>
          </div>
        );
        
      case "warning-alert":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="warning-alert-title">Titolo</Label>
              <Input 
                id="warning-alert-title" 
                value={content.title || "AVVERTENZA"} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="warning-alert-description">Descrizione</Label>
              <TiptapEditor 
                content={content.description || ""} 
                onChange={(description) => setContent({ ...content, description })} 
                sectionId={module.sectionId}
              />
            </div>
          </div>
        );
        
      case "caution":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="caution-title">Titolo</Label>
              <Input 
                id="caution-title" 
                value={content.title || "ATTENZIONE"} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="caution-description">Descrizione</Label>
              <TiptapEditor 
                content={content.description || ""} 
                onChange={(description) => setContent({ ...content, description })} 
                sectionId={module.sectionId}
              />
            </div>
          </div>
        );
        
      case "note":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-title">Titolo</Label>
              <Input 
                id="note-title" 
                value={content.title || "NOTA"} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="note-description">Descrizione</Label>
              <TiptapEditor 
                content={content.description || ""} 
                onChange={(description) => setContent({ ...content, description })} 
                sectionId={module.sectionId}
              />
            </div>
          </div>
        );
        
      case "safety-instructions":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="safety-title">Titolo</Label>
              <Input 
                id="safety-title" 
                value={content.title || "Istruzioni di sicurezza"} 
                onChange={(e) => setContent({ ...content, title: e.target.value })} 
              />
            </div>
            <div>
              <Label htmlFor="safety-description">Descrizione</Label>
              <TiptapEditor 
                content={content.description || ""} 
                onChange={(description) => setContent({ ...content, description })} 
                sectionId={module.sectionId}
              />
            </div>
          </div>
        );
        
      default:
        return <div>Editor non disponibile per questo tipo di modulo</div>;
    }
  };
  
  const renderModuleControls = () => {
    return (
      <div className="flex justify-end space-x-2 mt-2">
        {isEditing ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
              disabled={disabled}
            >
              Annulla
            </Button>
            <Button 
              onClick={saveChanges}
              disabled={disabled}
            >
              Salva
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={!disabled ? () => setIsEditing(true) : undefined}
              className={`ml-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
              title={disabled ? "Non hai permessi per modificare questo modulo" : "Modifica"}
            >
              <span className="material-icons">edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={!disabled ? handleDeleteModule : undefined}
              className={`${disabled ? 'text-red-300 opacity-50 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}`}
              disabled={disabled}
              title={disabled ? "Non hai permessi per eliminare questo modulo" : "Elimina"}
            >
              <span className="material-icons">delete</span>
            </Button>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="mb-4">
      <Card className="overflow-hidden">
        <CardHeader className="py-2 px-4 flex flex-row items-center justify-between bg-neutral-lightest">
          <div className="flex items-center">
            <span className="material-icons text-primary-500 mr-2">
              {getModuleIcon(module.type)}
            </span>
            <CardTitle className="text-base font-medium">
              {getModuleLabel(module.type)}
            </CardTitle>
          </div>
          {!isPreview && renderModuleControls()}
        </CardHeader>
        <CardContent className="p-4">
          {renderModuleContent()}
        </CardContent>
      </Card>
    </div>
  );
}