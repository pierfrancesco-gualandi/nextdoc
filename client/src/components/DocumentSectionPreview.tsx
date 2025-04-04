import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ContentModule from './content-module';

interface DocumentSectionPreviewProps {
  section: any;
  allSections: any[];
  documentId: string;
  level: number;
}

export default function DocumentSectionPreview({ 
  section, 
  allSections, 
  documentId,
  level 
}: DocumentSectionPreviewProps) {
  // Ottiene i moduli per questa sezione
  const { data: modules } = useQuery({
    queryKey: [`/api/sections/${section.id}/modules`],
    staleTime: 30000,
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
  
  return (
    <div className={`mb-8 ${indentClass}`}>
      <h2 className={getHeadingClass()}>{section.title}</h2>
      {section.description && <p className="mb-4">{section.description}</p>}
      
      {/* Mostra i moduli della sezione */}
      {modules && modules.length > 0 && (
        <div className="space-y-4 mb-6">
          {modules.map((module: any) => (
            <div key={module.id} className="preview-module mb-4">
              <ContentModule 
                module={module}
                onDelete={() => {}} // Funzione vuota perché in anteprima non serve
                onUpdate={() => {}} // Funzione vuota perché in anteprima non serve
                documentId={documentId}
                isPreview={true} // Flag per indicare che è in modalità anteprima
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Mostra ricorsivamente le sottosezioni */}
      {childSections.length > 0 && (
        <div className="subsections">
          {childSections.map((childSection) => (
            <DocumentSectionPreview
              key={childSection.id}
              section={childSection}
              allSections={allSections}
              documentId={documentId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}