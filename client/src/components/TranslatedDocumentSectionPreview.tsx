import React from 'react';
import { useQuery } from '@tanstack/react-query';
import TranslatedContentModule from './TranslatedContentModule';
import ReaderNotes from './reader-notes';

interface TranslatedDocumentSectionPreviewProps {
  section: any;
  allSections: any[];
  documentId: string;
  level: number;
  languageId: string;
  highlightMissingTranslations?: boolean;
  userRole?: string;
  userId?: number;
}

export default function TranslatedDocumentSectionPreview({ 
  section, 
  allSections, 
  documentId,
  level,
  languageId,
  highlightMissingTranslations = true,
  userRole,
  userId
}: TranslatedDocumentSectionPreviewProps) {
  // Ottiene i moduli per questa sezione
  const { data: modules } = useQuery({
    queryKey: [`/api/sections/${section.id}/modules`],
    staleTime: 30000,
  });
  
  // Ottieni la traduzione della sezione se è stata selezionata una lingua diversa dall'originale
  const { data: translatedSection } = useQuery<any>({
    queryKey: [`/api/section-translations`, section.id, languageId],
    staleTime: 30000,
    enabled: !!languageId && languageId !== '0' && !!section.id,
    queryFn: async () => {
      const response = await fetch(`/api/section-translations?sectionId=${section.id}&languageId=${languageId}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento della traduzione della sezione');
      }
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    }
  });
  
  // Trova le sottosezioni di questa sezione
  const childSections = allSections
    .filter((childSection) => childSection.parentId === section.id)
    .sort((a, b) => a.order - b.order);
  
  // Calcola la classe di indentazione basata sul livello
  const indentClass = level > 0 ? `ml-${Math.min(level * 4, 12)}` : '';
  
  // Calcola la classe dell'intestazione basata sul livello
  const getHeadingClass = () => {
    switch(level) {
      case 0: return 'text-2xl font-bold mb-3 pb-1 border-b border-neutral-light';
      case 1: return 'text-xl font-semibold mb-2 pb-1 border-b border-neutral-light';
      case 2: return 'text-lg font-semibold mb-2';
      case 3: return 'text-md font-medium mb-2';
      default: return 'text-base font-medium mb-1';
    }
  };

  // Determina se usare il titolo e la descrizione originali o tradotti
  const hasTitleTranslation = languageId !== '0' && translatedSection && translatedSection.title;
  const hasDescriptionTranslation = languageId !== '0' && translatedSection && translatedSection.description;
  
  // Se non c'è traduzione e highlightMissingTranslations è true, mostra in rosso
  const titleContent = hasTitleTranslation 
    ? translatedSection.title
    : (highlightMissingTranslations && languageId !== '0' 
       ? <span className="text-red-500">{section.title}</span> 
       : section.title);
  
  const descriptionContent = hasDescriptionTranslation
    ? translatedSection.description
    : (highlightMissingTranslations && languageId !== '0' && section.description
       ? <span className="text-red-500">{section.description}</span>
       : section.description);
  
  return (
    <div className={`mb-8 ${indentClass}`}>
      <h2 className={getHeadingClass()}>{titleContent}</h2>
      {descriptionContent && <p className="mb-4">{descriptionContent}</p>}
      
      {/* Mostra i moduli della sezione con le traduzioni se disponibili */}
      {modules && Array.isArray(modules) && modules.length > 0 && (
        <div className="space-y-4 mb-6">
          {modules.map((module: any) => (
            <div key={module.id} className="preview-module mb-4">
              <TranslatedContentModule 
                moduleId={module.id}
                documentId={documentId}
                languageId={languageId}
                isPreview={true}
                highlightMissingTranslations={highlightMissingTranslations}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Mostra ricorsivamente le sottosezioni con le traduzioni */}
      {childSections.length > 0 && (
        <div className="subsections">
          {childSections.map((childSection) => (
            <TranslatedDocumentSectionPreview
              key={childSection.id}
              section={childSection}
              allSections={allSections}
              documentId={documentId}
              level={level + 1}
              languageId={languageId}
              highlightMissingTranslations={highlightMissingTranslations}
            />
          ))}
        </div>
      )}
    </div>
  );
}