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
      // - intestazioni colonne tradotte (headers)
      // - messaggi tradotti (messages)
      // - didascalia tradotta (caption)
      const defaultHeaders = translatedContent?.headers || {
        number: "N°",
        level: "Livello", 
        code: "Codice",
        description: "Descrizione",
        quantity: "Quantità"
      };
      
      const defaultMessages = translatedContent?.messages || {
        loading: "Caricamento elenco componenti...",
        notFound: "Elenco componenti non trovato", 
        empty: "Nessun componente disponibile",
        noResults: "Nessun risultato per i filtri selezionati"
      };
      
      // Inizializza il contenuto aggiornato con valori tradotti
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
    
    // Per moduli non testuali, mantieni il contenuto visuale originale e applica solo le traduzioni testuali
    let mergedContent = translatedContent;
    
    // Identifica i tipi di modulo che necessitano di preservare contenuto visuale
    const visualModuleTypes = ['image', 'video', 'table', '3d-model', 'pdf', 'bom'];
    
    if (visualModuleTypes.includes(module.type)) {
      // Estrai il contenuto originale
      let originalContent;
      try {
        originalContent = typeof module.content === 'string' 
          ? JSON.parse(module.content) 
          : module.content;
      } catch (e) {
        originalContent = module.content;
      }
      
      // Merge intelligente: mantieni il contenuto visuale originale e applica solo le traduzioni
      mergedContent = {
        ...originalContent, // Mantieni tutto il contenuto originale (URL, strutture, ecc.)
        ...translatedContent, // Sovrascrivi solo i campi tradotti
        
        // Per tabelle: mantieni la struttura originale se la traduzione è incompleta
        ...(module.type === 'table' && {
          headers: translatedContent.headers || originalContent.headers,
          rows: translatedContent.rows || originalContent.rows
        }),
        
        // Per BOM: mantieni sempre i riferimenti originali
        ...(module.type === 'bom' && {
          bomId: originalContent.bomId,
          filter: originalContent.filter,
          levelFilter: originalContent.levelFilter,
          useFilters: originalContent.useFilters,
          filteredComponentCodes: originalContent.filteredComponentCodes,
          filterSettings: originalContent.filterSettings
        }),
        
        // Per immagini e video: mantieni sempre src e URL originali
        ...((['image', 'video'].includes(module.type)) && {
          src: originalContent.src,
          url: originalContent.url,
          fileId: originalContent.fileId
        }),
        
        // Per modelli 3D: mantieni sempre i riferimenti ai file
        ...(module.type === '3d-model' && {
          src: originalContent.src,
          url: originalContent.url,
          fileId: originalContent.fileId,
          folderPath: originalContent.folderPath,
          format: originalContent.format,
          controls: originalContent.controls
        }),
        
        // Per PDF: mantieni sempre il riferimento al file
        ...(module.type === 'pdf' && {
          src: originalContent.src,
          url: originalContent.url,
          fileId: originalContent.fileId
        })
      };
    }

    // Crea una copia del modulo originale con i contenuti tradotti
    const moduleWithTranslation = {
      ...module,
      title: translation.title || module.title, // Usa il titolo tradotto se disponibile
      translation: translation, // Aggiungi la traduzione completa
      original: { ...module }, // Mantieni l'originale per la visualizzazione del testo originale se richiesto
      content: mergedContent // Usa il contenuto merged invece di quello solo tradotto
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
  
  // Se non c'è traduzione, mostra il contenuto originale
  // Ma assicurati che il modulo sia sempre renderizzabile
  const moduleForDisplay = {
    ...module,
    // Assicurati che il contenuto sia sempre un oggetto valido
    content: typeof module.content === 'string' 
      ? (() => {
          try {
            return JSON.parse(module.content);
          } catch (e) {
            console.error("Errore nel parsing del contenuto originale:", e);
            return module.content;
          }
        })()
      : module.content
  };
  
  return (
    <ContentModule
      module={moduleForDisplay}
      onDelete={() => {}} // Funzione vuota perché in anteprima non serve
      onUpdate={() => {}} // Funzione vuota perché in anteprima non serve
      documentId={documentId}
      isPreview={isPreview}
      selectedLanguage={languageId}
      highlightMissingTranslations={highlightMissingTranslations}
    />
  );
}