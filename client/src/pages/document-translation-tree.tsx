import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import DocumentTranslationManager from '@/components/document-translation-manager';
import { Loader2 } from 'lucide-react';

export default function DocumentTranslationTree({ toggleSidebar }: { toggleSidebar?: () => void }) {
  const { id } = useParams<{ id: string }>();
  
  // Recupera il documento
  const { data: document, isLoading } = useQuery({
    queryKey: [`/api/documents/${id}`],
    enabled: !!id,
  });
  
  if (isLoading) {
    return (
      <>
        <Header 
          title="Caricamento..." 
          toggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto bg-neutral-lightest">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Caricamento documento...</span>
          </div>
        </main>
      </>
    );
  }
  
  const title = document ? `Traduzione: ${document.title}` : 'Traduzione documento';
  
  return (
    <>
      <Header 
        title={title} 
        documentId={id}
        toggleSidebar={toggleSidebar}
      />
      <main className="flex-1 overflow-y-auto bg-neutral-lightest">
        <DocumentTranslationManager documentId={id} />
      </main>
    </>
  );
}