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
    if (module.type === 'bom' && originalContent) {
      // Trasferisci tutte le proprietà relative al filtro dall'originale alla traduzione
      const filterProps = [
        'bomId', 
        'filter', 
        'levelFilter', 
        'useFilters', 
        'filterSettings', 
        'filteredComponentCodes'
      ];
      
      // Log dei dettagli per debugging
      console.log("Contenuto originale del modulo BOM:", {
        bomId: originalContent.bomId,
        filter: originalContent.filter,
        levelFilter: originalContent.levelFilter,
        useFilters: originalContent.useFilters,
        filterSettings: originalContent.filterSettings,
        hasFilteredComponentCodes: originalContent.filteredComponentCodes?.length > 0
      });
      
      // Costruisci un nuovo oggetto con tutte le proprietà necessarie
      const preservedSettings = {};
      
      // Copia tutte le proprietà di filtro dall'originale
      filterProps.forEach(prop => {
        if (originalContent[prop] !== undefined) {
          preservedSettings[prop] = originalContent[prop];
        }
      });
      
      // Mantieni le descrizioni originali dei componenti se disponibili
      if (originalContent.descriptions) {
        preservedSettings['descriptions'] = originalContent.descriptions;
      }
      
      // Assicurati che i titoli delle colonne siano preservati (per la traduzione)
      if (originalContent.headers) {
        preservedSettings['headers'] = originalContent.headers;
      }
      
      // Log delle impostazioni preservate
      console.log("Trasferisco impostazioni da originale a traduzione:", preservedSettings);
      
      // Applica le impostazioni preservate alla traduzione
      translatedContent = {
        ...translatedContent,
        ...preservedSettings
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