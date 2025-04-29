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
      console.log("TranslatedContentModule - Modulo BOM trovato:", {
        id: module.id,
        type: module.type,
        bomId: originalContent.bomId
      });
      
      // Per i moduli BOM, è fondamentale trasferire tutte le proprietà di filtro e configurazione
      const updatedContent = {
        ...translatedContent,
        // Proprietà fondamentali
        bomId: originalContent.bomId,
        filter: originalContent.filter || "",
        levelFilter: originalContent.levelFilter,
        useFilters: originalContent.useFilters === false ? false : true,
        
        // Impostazioni di filtro complete
        filterSettings: originalContent.filterSettings ? {
          ...originalContent.filterSettings
        } : undefined,
        
        // Elenco esplicito dei componenti filtrati
        filteredComponentCodes: Array.isArray(originalContent.filteredComponentCodes) 
          ? [...originalContent.filteredComponentCodes] 
          : []
      };
      
      // Preserva eventuali descrizioni tradotte insieme ai dati originali
      if (translatedContent && translatedContent.descriptions) {
        // Mantieni le descrizioni tradotte se esistono
        updatedContent.descriptions = translatedContent.descriptions;
      } else if (originalContent.descriptions) {
        // Altrimenti usa quelle originali come punto di partenza
        updatedContent.descriptions = {...originalContent.descriptions};
      }
      
      // Preserva le traduzioni delle intestazioni
      if (translatedContent && translatedContent.headers) {
        updatedContent.headers = translatedContent.headers;
      } else if (originalContent.headers) {
        updatedContent.headers = {...originalContent.headers};
      }
      
      // Preserva messaggi personalizzati
      if (translatedContent && translatedContent.messages) {
        updatedContent.messages = translatedContent.messages;
      } else if (originalContent.messages) {
        updatedContent.messages = {...originalContent.messages};
      }
      
      // Log completo delle impostazioni trasferite
      console.log("TranslatedContentModule - Trasferisco impostazioni BOM:", {
        bomId: updatedContent.bomId,
        filterSettings: updatedContent.filterSettings,
        filteredComponentCodes: updatedContent.filteredComponentCodes?.length,
        hasDescriptions: !!updatedContent.descriptions,
        hasHeaders: !!updatedContent.headers
      });
      
      // Aggiorna il contenuto tradotto con tutte le impostazioni
      translatedContent = updatedContent;
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