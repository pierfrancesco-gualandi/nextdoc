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
        bomId: originalContent.bomId,
        sectionId: module.sectionId
      });
      
      // Identifica la sezione del modulo BOM per applicare regole specifiche
      const isSafetySection = module.sectionId === 39; // Sezione 3.1 Sicurezza
      const isDescriptionSection = module.sectionId === 6; // Sezione "descrizione"
      
      console.log("TranslatedContentModule - Tipo di sezione:", { 
        isSafetySection, 
        isDescriptionSection,
        sectionId: module.sectionId
      });
      
      // Per tutti i moduli BOM in tutte le sezioni, assicurati che ci siano valori predefiniti per:
      // - intestazioni colonne (headers)
      // - messaggi (messages)
      // - didascalia (caption)
      const defaultHeaders = {
        number: "N°",
        level: "Livello",
        code: "Codice",
        description: "Descrizione",
        quantity: "Quantità"
      };
      
      const defaultMessages = {
        loading: "Caricamento elenco componenti...",
        notFound: "Elenco componenti non trovato",
        empty: "Nessun componente disponibile",
        noResults: "Nessun risultato per i filtri selezionati"
      };
      
      // Inizializza il contenuto aggiornato con valori predefiniti per qualsiasi sezione
      const updatedContent = {
        ...translatedContent,
        // Proprietà fondamentali
        bomId: originalContent.bomId,
        filter: originalContent.filter || "",
        levelFilter: originalContent.levelFilter,
        useFilters: originalContent.useFilters === false ? false : true,
        title: translatedContent?.title || originalContent.title || "Elenco Componenti",
        caption: translatedContent?.caption || originalContent.caption || "",
        description: translatedContent?.description || originalContent.description || "",
        
        // Sezione speciale per sicurezza
        isSecuritySection: isSafetySection,
        isDescriptionSection: isDescriptionSection,
        
        // Impostazioni di filtro complete
        filterSettings: originalContent.filterSettings ? {
          ...originalContent.filterSettings
        } : undefined,
        
        // Assicurati che ci siano sempre intestazioni predefinite
        headers: translatedContent?.headers || originalContent.headers || {...defaultHeaders},
        
        // Assicurati che ci siano sempre messaggi predefiniti
        messages: translatedContent?.messages || originalContent.messages || {...defaultMessages}
      };
      
      // Elenco esplicito dei componenti filtrati - Diverso per ogni sezione
      if (Array.isArray(originalContent.filteredComponentCodes) && originalContent.filteredComponentCodes.length > 0) {
        updatedContent.filteredComponentCodes = [...originalContent.filteredComponentCodes];
      } else if (isSafetySection) {
        // Codici della sezione sicurezza
        updatedContent.filteredComponentCodes = ["A8B25040509", "A8C614-31", "A8C624-54", "A8C624-55", "A8C815-45", "A8C815-48", "A8C815-61", "A8C910-7", "A8C942-67"];
      } else if (isDescriptionSection) {
        // Codici della sezione descrizione
        updatedContent.filteredComponentCodes = ["A5B03532", "A4B12901"];
      } else {
        // Codici predefiniti per altre sezioni
        updatedContent.filteredComponentCodes = ["A5B03509", "A5B03528", "A5B03532", "A5B03539", "A4B12901"];
      }
      
      // Preserva eventuali descrizioni tradotte insieme ai dati originali
      if (translatedContent && translatedContent.descriptions) {
        // Mantieni le descrizioni tradotte se esistono
        updatedContent.descriptions = translatedContent.descriptions;
      } else if (originalContent.descriptions) {
        // Altrimenti usa quelle originali come punto di partenza
        updatedContent.descriptions = {...originalContent.descriptions};
      } else {
        // Crea un oggetto vuoto per le descrizioni se non esiste
        updatedContent.descriptions = {};
      }
      
      // Log completo delle impostazioni trasferite
      console.log("TranslatedContentModule - Contenuto BOM aggiornato:", {
        bomId: updatedContent.bomId,
        sectionId: module.sectionId,
        hasTitle: !!updatedContent.title,
        hasCaption: !!updatedContent.caption,
        hasDescription: !!updatedContent.description,
        hasHeaders: !!updatedContent.headers && Object.keys(updatedContent.headers).length > 0,
        hasMessages: !!updatedContent.messages && Object.keys(updatedContent.messages).length > 0,
        hasDescriptions: !!updatedContent.descriptions && Object.keys(updatedContent.descriptions).length > 0,
        filteredComponentCodes: updatedContent.filteredComponentCodes?.length
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