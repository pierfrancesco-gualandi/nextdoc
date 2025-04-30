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
    const textarea = e.target;
    const cursorPos = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
    
    // Salva la posizione di scorrimento corrente
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Aggiorniamo subito il valore locale per l'interfaccia utente
    setLocalValue(newValue);
    
    // Passiamo il nuovo valore al genitore
    onChange(newValue);
    
    // Manteniamo il focus e la posizione del cursore per TUTTI i tipi di campi
    // Questo approccio funziona per moduli di testo, tabelle, checklist, pericolo, attenzione, PDF, ecc.
    // Imposta questo campo come attivo a livello globale indipendentemente dal tipo
    if (fieldId) {
      setThisFieldActive();
      
      // Usa un setTimeout per assicurarsi che il focus venga ripristinato dopo l'aggiornamento React
      setTimeout(() => {
        // Restaura la posizione di scorrimento originale per evitare salti di pagina
        window.scrollTo(scrollLeft, scrollTop);
        
        // Ripristina il focus e la posizione del cursore per TUTTI i tipi di campi
        if (textareaRef.current) {
          // Mantiene il focus attivo sul campo
          textareaRef.current.focus();
          // Restaura anche la posizione del cursore all'interno del campo
          textareaRef.current.setSelectionRange(cursorPos.start, cursorPos.end);
        }
      }, 0);
    }
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
  
  // Mantiene il focus su TUTTI i tipi di campi dopo la digitazione
  // Soluzione universale per qualsiasi tipo di campo (testo, tabella, checklist, pericolo, ecc.)
  useEffect(() => {
    // Questa funzione viene eseguita dopo ogni render
    // È cruciale per mantenere il focus dopo l'aggiornamento del valore
    if (fieldId && (window as any)._activeFieldData?.activeFieldId === fieldId) {
      setTimeout(() => {
        // Utilizza un timeout per assicurarsi che l'elemento abbia il focus dopo gli aggiornamenti React
        const textarea = textareaRef.current;
        if (textarea && document.activeElement !== textarea) {
          // Mantiene la posizione di scorrimento attuale
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          
          // Applica il focus senza spostare la vista
          textarea.focus();
          
          // Restaura la posizione di scorrimento subito dopo, per evitare salti
          window.scrollTo(scrollLeft, scrollTop);
        }
      }, 5);
    }
  });
  
  // Verifica se questo campo è quello che deve mantenere il focus
  const shouldKeepFocus = () => {
    // Se non c'è un fieldId, non può mantenere il focus in modo speciale
    if (!fieldId) return document.activeElement === textareaRef.current;
    
    // Se questo è il campo attivo a livello globale (cliccato dall'utente)
    const globalData = (window as any)._activeFieldData;
    if (globalData && globalData.activeFieldId === fieldId) {
      return true;
    }
    
    // Per TUTTI i tipi di campi, manteniamo il focus su quello che è attualmente attivo
    // Questo risolve il problema dell'evidenziatura che scompare per testo, pericolo, PDF, ecc.
    // Se il campo è attualmente attivo, deve mantenere il focus
    if (document.activeElement === textareaRef.current) {
      return true;
    }
    
    // Se keepFocus è attivo, mantiene sempre il focus (per campi singoli)
    if (keepFocus) {
      return true;
    }
    
    // Altrimenti, segue il comportamento normale
    return false;
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
      // Verifica se questo campo è effettivamente quello che ha il focus
      // Questo è cruciale per evitare che un campo rubi il focus da un altro
      if (document.activeElement === textarea || 
          // Oppure se questo è esplicitamente il campo attivo a livello globale
          ((window as any)._activeFieldData?.activeFieldId === fieldId)) {
        
        // Mantiene la posizione di scorrimento prima di manipolare il focus
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Ripristina la posizione del cursore
        textarea.setSelectionRange(
          savedSelection.current.start,
          savedSelection.current.end
        );
        
        // Riattiva il focus se necessario per qualsiasi tipo di campo
        if ((window as any)._activeFieldData?.activeFieldId === fieldId && document.activeElement !== textarea) {
          textarea.focus();
          
          // Assicurati che lo schermo non scorra dopo aver ripristinato il focus
          window.scrollTo(scrollLeft, scrollTop);
        }
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
      // Rimuoviamo autoFocus per prevenire il salto da un campo all'altro
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