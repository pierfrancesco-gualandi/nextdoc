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
  
  // Posiziona il cursore alla fine del testo quando il componente è montato
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Posiziona il cursore alla fine del testo
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
      textarea.focus();
    }
  }, []);
  
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
    />
  );
};

export default TranslationEditableField;