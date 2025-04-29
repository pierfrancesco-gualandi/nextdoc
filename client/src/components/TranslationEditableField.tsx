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
  rows = 1
}) => {
  // Manteniamo una copia locale del valore per evitare perdite durante la digitazione
  const [localValue, setLocalValue] = useState(translatedValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Aggiorniamo il valore locale quando cambia quello delle props (ma solo se non stiamo editando)
  useEffect(() => {
    setLocalValue(translatedValue || '');
  }, [translatedValue]);
  
  // Gestiamo il cambio di valore NON con un delay ma direttamente
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Aggiorniamo subito il valore locale per l'interfaccia utente
    setLocalValue(newValue);
    // Passiamo immediatamente il nuovo valore al genitore
    onChange(newValue);
  };
  
  // Aggiungiamo questo per garantire che il campo mantenga il focus
  useEffect(() => {
    // Impediamo completamente che il campo perda il focus
    const textarea = textareaRef.current;
    
    // Questa è la funzione cruciale: intercetta l'evento blur e lo previene
    // assicurandoci che il campo mantenga sempre il focus
    const preventBlur = (e: FocusEvent) => {
      e.preventDefault();
      if (textarea) {
        // Riapplichiamo subito il focus
        setTimeout(() => textarea.focus(), 0);
      }
    };
    
    if (textarea) {
      textarea.addEventListener('blur', preventBlur);
      // Focus iniziale
      textarea.focus();
    }
    
    // Cleanup della funzione quando il componente viene smontato
    return () => {
      if (textarea) {
        textarea.removeEventListener('blur', preventBlur);
      }
    };
  }, []);
  
  return (
    <Textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={errorCondition ? "border-red-300" : ""}
      rows={rows}
      // Impostiamo esplicitamente autoFocus per garantire che il campo sia attivo
      autoFocus
      // Aggiungiamo attributi aggiuntivi per garantire che il campo mantenga il focus
      onBlur={(e) => e.currentTarget.focus()}
    />
  );
};

export default TranslationEditableField;