import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ContentModule from './content-module';

interface TranslatedContentModuleProps {
  moduleId: number;
  documentId: string;
  languageId: string;
  isPreview?: boolean;
  highlightMissingTranslations?: boolean;
}

export default function TranslatedContentModule({ 
  moduleId, 
  documentId, 
  languageId,
  isPreview = false,
  highlightMissingTranslations = false
}: TranslatedContentModuleProps) {
  // Ottieni il modulo originale
  const { data: originalModule } = useQuery<any>({
    queryKey: [`/api/modules/${moduleId}`],
    staleTime: 30000,
  });

  // Ottieni la traduzione del modulo se è stata selezionata una lingua diversa dall'originale
  const { data: translatedModule, isLoading: isLoadingTranslation } = useQuery<any>({
    queryKey: [`/api/content-module-translations`, moduleId, languageId],
    staleTime: 30000,
    enabled: !!languageId && languageId !== '0' && !!moduleId,
    queryFn: async () => {
      const response = await fetch(`/api/content-module-translations?moduleId=${moduleId}&languageId=${languageId}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento della traduzione del modulo');
      }
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    }
  });

  // Se non è stato trovato un modulo originale, non mostra nulla
  if (!originalModule) return null;

  // Aggiungi log per debug
  console.log("TranslatedContentModule - moduleId:", moduleId, "languageId:", languageId);
  console.log("TranslatedContentModule - originalModule:", originalModule);
  console.log("TranslatedContentModule - translatedModule:", translatedModule);
  
  // Se è stata selezionata una lingua diversa dall'originale ed è disponibile una traduzione
  if (languageId !== '0' && translatedModule) {
    // Prepara il contenuto tradotto
    let translatedContent;
    try {
      translatedContent = typeof translatedModule.content === 'string' 
        ? JSON.parse(translatedModule.content) 
        : translatedModule.content;
    } catch (e) {
      console.error("Errore nel parsing del contenuto tradotto:", e);
      translatedContent = translatedModule.content;
    }
    
    // Crea una copia del modulo originale con i contenuti tradotti
    const moduleWithTranslation = {
      ...originalModule,
      translation: translatedModule, // Aggiungi la traduzione completa
      original: { ...originalModule }, // Mantieni l'originale per la visualizzazione del testo originale se richiesto
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
      module={originalModule}
      onDelete={() => {}} // Funzione vuota perché in anteprima non serve
      onUpdate={() => {}} // Funzione vuota perché in anteprima non serve
      documentId={documentId}
      isPreview={isPreview}
      selectedLanguage={languageId}
      highlightMissingTranslations={highlightMissingTranslations}
    />
  );
}