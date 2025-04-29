import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ContentModule from './content-module';

interface TranslatedContentModuleProps {
  module: any; // Il modulo originale
  translation: any; // La traduzione del modulo
  documentId: string;
  languageId?: string;
  isPreview?: boolean;
  highlightMissingTranslations?: boolean;
}

export default function TranslatedContentModule({ 
  module, 
  translation,
  documentId, 
  languageId,
  isPreview = false,
  highlightMissingTranslations = false
}: TranslatedContentModuleProps) {
  
  // Se non è stato fornito un modulo, non mostra nulla
  if (!module) return null;

  // Se è disponibile una traduzione
  if (translation) {
    // Prepara il contenuto tradotto
    let translatedContent;
    try {
      translatedContent = typeof translation.content === 'string' 
        ? JSON.parse(translation.content) 
        : translation.content;
    } catch (e) {
      console.error("Errore nel parsing del contenuto tradotto:", e);
      translatedContent = translation.content;
    }
    
    // Estrai il contenuto originale
    let originalContent;
    try {
      originalContent = typeof module.content === 'string' 
        ? JSON.parse(module.content) 
        : module.content;
    } catch (e) {
      console.error("Errore nel parsing del contenuto originale:", e);
      originalContent = module.content;
    }
    
    // Assicurati che il contenuto tradotto mantenga le impostazioni di filtro dell'originale
    if (module.type === 'bom' && originalContent && originalContent.filterSettings) {
      console.log("Trasferisco impostazioni filtro da originale a traduzione:", originalContent.filterSettings);
      // Mantieni impostazioni di filtro dell'originale nella traduzione
      translatedContent = {
        ...translatedContent,
        filterSettings: originalContent.filterSettings,
        filteredComponentCodes: originalContent.filteredComponentCodes || []
      };
    }
    
    // Crea una copia del modulo originale con i contenuti tradotti
    const moduleWithTranslation = {
      ...module,
      translation: translation, // Aggiungi la traduzione completa
      original: { ...module }, // Mantieni l'originale per la visualizzazione del testo originale se richiesto
      content: translatedContent // Sostituisci il contenuto con quello tradotto
    };
    
    return (
      <ContentModule
        module={moduleWithTranslation}
        onDelete={() => {}} // Funzione vuota perché in anteprima non serve
        onUpdate={() => {}} // Funzione vuota perché in anteprima non serve
        documentId={documentId}
        isPreview={isPreview}
        selectedLanguage={languageId}
        highlightMissingTranslations={highlightMissingTranslations}
      />
    );
  }
  
  // Altrimenti mostra il contenuto originale
  return (
    <ContentModule
      module={module}
      onDelete={() => {}} // Funzione vuota perché in anteprima non serve
      onUpdate={() => {}} // Funzione vuota perché in anteprima non serve
      documentId={documentId}
      isPreview={isPreview}
      selectedLanguage={languageId}
      highlightMissingTranslations={highlightMissingTranslations}
    />
  );
}