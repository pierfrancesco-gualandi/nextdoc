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
 * e previene la perdita di focus
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Aggiorniamo il valore locale quando cambia quello delle props (ma solo se non stiamo editando)
  useEffect(() => {
    setLocalValue(translatedValue || '');
  }, [translatedValue]);
  
  // Gestiamo il cambio di valore con un delay
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Aggiorniamo subito il valore locale per l'interfaccia utente
    setLocalValue(newValue);
    
    // Cancelliamo eventuali timeout precedenti
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Impostando un delay molto lungo, ci assicuriamo che il componente abbia il tempo
    // di gestire correttamente l'input senza perdere il focus
    timeoutRef.current = setTimeout(() => {
      console.log(`TRADUZIONE TABELLA - Salvando valore dopo delay (2000ms): ${newValue.substring(0, 20)}...`);
      onChange(newValue);
    }, 2000);
  };
  
  return (
    <Textarea
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={errorCondition ? "border-red-300" : ""}
      keepFocus={true}
      rows={rows}
    />
  );
};

export default TranslationEditableField;