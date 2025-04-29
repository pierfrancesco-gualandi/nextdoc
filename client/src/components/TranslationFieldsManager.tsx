// NUOVO COMPONENTE CREATO APPOSITAMENTE PER RISOLVERE IL PROBLEMA DEI CAMPI CHE SI CHIUDONO
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TranslationFieldProps {
  label: string;
  originalValue: string; 
  translatedValue: string;
  onChange: (value: string) => void;
  isMultiline?: boolean;
  required?: boolean;
  id?: string;
}

/**
 * Componente specializzato per la traduzione che gestisce meglio il focus e il salvataggio
 */
export const TranslationField: React.FC<TranslationFieldProps> = ({
  label,
  originalValue,
  translatedValue,
  onChange,
  isMultiline = false,
  required = false,
  id
}) => {
  // Stato locale per mantenere stabile l'interfaccia utente
  const [localValue, setLocalValue] = useState(translatedValue || '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sincronizza lo stato locale quando cambiano le prop
  useEffect(() => {
    setLocalValue(translatedValue || '');
  }, [translatedValue]);

  // Gestisce i cambiamenti nel campo
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Aggiorna immediatamente lo stato locale per l'interfaccia utente
    setLocalValue(newValue);
    
    // Cancella il timer esistente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Imposta un nuovo timer per l'aggiornamento dopo 2 secondi
    timeoutRef.current = setTimeout(() => {
      console.log(`TRADUZIONE - Salvando valore dopo delay (2000ms) per ${label}: ${newValue}`);
      onChange(newValue);
    }, 2000);
  };

  // Componente di output
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="p-3 bg-neutral-50 rounded border text-sm">
          {originalValue || <span className="text-neutral-400 italic">Nessun testo originale</span>}
        </div>
        
        {isMultiline ? (
          <Textarea
            id={id}
            value={localValue}
            onChange={handleChange}
            placeholder="Inserisci la traduzione..."
            className={(!localValue && required) ? "border-red-300" : ""}
            keepFocus={true}
          />
        ) : (
          <Input
            id={id}
            value={localValue}
            onChange={handleChange}
            placeholder="Inserisci la traduzione..."
            className={(!localValue && required) ? "border-red-300" : ""}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Componente specializzato per i titoli delle sezioni
 */
export const SectionTitleField: React.FC<{
  section: any;
  translation: any;
  onChange: (value: string) => void;
}> = ({ section, translation, onChange }) => {
  return (
    <TranslationField
      id={`section-${section.id}-title`}
      label="Titolo della sezione"
      originalValue={section.title}
      translatedValue={translation?.title || ''}
      onChange={onChange}
      required={true}
    />
  );
};

/**
 * Componente specializzato per le descrizioni delle sezioni
 */
export const SectionDescriptionField: React.FC<{
  section: any;
  translation: any;
  onChange: (value: string) => void;
}> = ({ section, translation, onChange }) => {
  return (
    <TranslationField
      id={`section-${section.id}-description`}
      label="Descrizione della sezione"
      originalValue={section.description || ''}
      translatedValue={translation?.description || ''}
      onChange={onChange}
      isMultiline={true}
      required={!!section.description}
    />
  );
};

/**
 * Componente specializzato per i contenuti dei moduli di testo
 */
export const ModuleTextField: React.FC<{
  module: any;
  content: any;
  translation: any;
  onChange: (value: string) => void;
}> = ({ module, content, translation, onChange }) => {
  return (
    <TranslationField
      id={`module-${module.id}-text`}
      label="Testo del modulo"
      originalValue={content.text || ''}
      translatedValue={translation?.text || ''}
      onChange={onChange}
      isMultiline={true}
      required={true}
    />
  );
};

export default {
  TranslationField,
  SectionTitleField,
  SectionDescriptionField,
  ModuleTextField
};