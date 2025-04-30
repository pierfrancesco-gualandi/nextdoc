// COMPONENTE SPECIALIZZATO PER LA TRADUZIONE DELLE TABELLE
import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";

interface TranslationEditableFieldProps {
  originalValue: string;
  translatedValue: string;
  onChange: (value: string) => void;
  isMultiline?: boolean;
  placeholder?: string;
  errorCondition?: boolean;
  rows?: number;
  keepFocus?: boolean; // Proprietà per forzare il mantenimento del focus
  fieldId?: string; // ID univoco per il campo, usato per tracciare il campo attivo
}

/**
 * Componente specializzato che mantiene lo stato del campo di input durante la modifica
 * e previene completamente la perdita di focus
 */
const TranslationEditableField: React.FC<TranslationEditableFieldProps> = ({
  originalValue,
  translatedValue,
  onChange,
  isMultiline = false,
  placeholder = "Inserisci la traduzione...",
  errorCondition = false,
  rows = 4,
  keepFocus = false,
  fieldId
}) => {
  // RISOLUZIONE DEL PROBLEMA: Usar lo stato locale per evitare l'inversione del testo
  const [localValue, setLocalValue] = useState(translatedValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Aggiorniamo il valore locale SOLO quando cambia il valore iniziale
  useEffect(() => {
    if (translatedValue !== localValue) {
      setLocalValue(translatedValue || '');
    }
  }, [translatedValue]);
  
  // Gestiamo il cambio di valore con una funzione separata
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Aggiorniamo subito il valore locale per l'interfaccia utente
    setLocalValue(newValue);
    
    // Passiamo il nuovo valore al genitore
    onChange(newValue);
  };
  
  // Riferimento statico (condiviso tra tutti i componenti) per il campo attivo
  // Questa variabile viene condivisa tra tutte le istanze del componente
  const staticActiveFieldId = useRef<{current: string | null}>({current: null});
  
  // Mantiene il focus quando il componente viene aggiornato (ma non quando viene desmontato)
  // Utilizziamo un flag per impedire al componente di perdere il focus con il cursore nella posizione corretta
  const [isInitialFocus, setIsInitialFocus] = useState(true);
  const savedSelection = useRef<{ start: number, end: number } | null>(null);
  
  // Utilizziamo una variabile globale per tracciare il campo attualmente attivo
  // Questo approccio è più semplice e diretto rispetto al sistema di gestione precedente
  useEffect(() => {
    // Crea l'oggetto globale se non esiste già
    if (typeof window !== 'undefined') {
      // Dichiara il tipo globale per TypeScript
      if (!(window as any)._activeFieldData) {
        (window as any)._activeFieldData = { 
          activeFieldId: null 
        };
      }
    }
    
    // Funzione di pulizia
    return () => {
      // Nessuna pulizia necessaria
    };
  }, []);
  
  // Funzione per impostare questo campo come attivo
  const setThisFieldActive = () => {
    if (fieldId && typeof window !== 'undefined') {
      (window as any)._activeFieldData.activeFieldId = fieldId;
      console.log("Campo attivato:", fieldId);
    }
  };
  
  // Quando il componente viene montato, posiziona il cursore alla fine
  useEffect(() => {
    const textarea = textareaRef.current;
    
    // Solo alla prima renderizzazione
    if (textarea && isInitialFocus) {
      // Posiziona il cursore alla fine del testo solo la prima volta
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
      
      // Non attiva il focus automaticamente sui campi, lascia che l'utente selezioni
      // il campo su cui vuole lavorare
      if (keepFocus) {
        textarea.focus();
      }
      
      setIsInitialFocus(false);
    }
  }, [isInitialFocus, keepFocus]);
  
  // Verifica se questo campo è quello che deve mantenere il focus
  const shouldKeepFocus = () => {
    // Se non c'è un fieldId, non può mantenere il focus in modo speciale
    if (!fieldId) return document.activeElement === textareaRef.current;
    
    // Se questo è il campo attivo a livello globale (cliccato dall'utente)
    const globalData = (window as any)._activeFieldData;
    if (globalData && globalData.activeFieldId === fieldId) {
      return true;
    }
    
    // Se keepFocus è attivo, mantiene sempre il focus
    if (keepFocus) {
      return true;
    }
    
    // Altrimenti, segue il comportamento normale
    return document.activeElement === textareaRef.current;
  };
  
  // Salva la posizione del cursore prima di ogni render
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && document.activeElement === textarea) {
      savedSelection.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
    }
  });
  
  // Ripristina la posizione del cursore dopo ogni render
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && savedSelection.current && shouldKeepFocus()) {
      textarea.setSelectionRange(
        savedSelection.current.start,
        savedSelection.current.end
      );
      
      // Riattiva il focus se necessario
      if (keepFocus && document.activeElement !== textarea) {
        textarea.focus();
      }
    }
  });
  
  return (
    <Textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={errorCondition ? "border-red-300" : ""}
      rows={rows}
      autoFocus
      id={fieldId}
      // Impostiamo una altezza minima adeguata al contenuto
      style={{ minHeight: rows === 1 ? '50px' : '120px' }}
      // Questi eventi mantengono un registro della posizione del cursore
      onFocus={() => {
        const textarea = textareaRef.current;
        if (textarea) {
          savedSelection.current = {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
          };
          
          // Aggiorna il campo attivo quando riceve il focus
          setThisFieldActive();
        }
      }}
      onClick={() => {
        const textarea = textareaRef.current;
        if (textarea) {
          savedSelection.current = {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
          };
          
          // Aggiorna il campo attivo quando si fa clic
          setThisFieldActive();
        }
      }}
      // Previene la perdita delle info di selezione quando si usa il mouse
      onMouseDown={() => {
        if (fieldId) {
          setThisFieldActive();
        }
      }}
    />
  );
};

export default TranslationEditableField;