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
  rows = 4
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
  
  // Mantiene il focus quando il componente viene aggiornato (ma non quando viene desmontato)
  // Utilizziamo un flag per impedire al componente di perdere il focus con il cursore nella posizione corretta
  const [isInitialFocus, setIsInitialFocus] = useState(true);
  const savedSelection = useRef<{ start: number, end: number } | null>(null);
  
  // Quando il componente viene montato, posiziona il cursore alla fine
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && isInitialFocus) {
      // Posiziona il cursore alla fine del testo solo la prima volta
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
      textarea.focus();
      setIsInitialFocus(false);
    }
  }, [isInitialFocus]);
  
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
    if (textarea && savedSelection.current && document.activeElement === textarea) {
      textarea.setSelectionRange(
        savedSelection.current.start,
        savedSelection.current.end
      );
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
      // Impostiamo una altezza minima maggiore
      style={{ minHeight: '120px' }}
      // Questi eventi mantengono un registro della posizione del cursore
      onFocus={() => {
        const textarea = textareaRef.current;
        if (textarea) {
          savedSelection.current = {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
          };
        }
      }}
      onClick={() => {
        const textarea = textareaRef.current;
        if (textarea) {
          savedSelection.current = {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
          };
        }
      }}
    />
  );
};

export default TranslationEditableField;