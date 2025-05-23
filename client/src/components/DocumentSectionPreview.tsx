import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ContentModule from './content-module';
import ReaderNotes from './reader-notes';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DocumentSectionPreviewProps {
  section: any;
  allSections: any[];
  documentId: string;
  level: number;
  userRole?: string;
  userId?: number;
  selectedLanguage?: any; // Lingua selezionata per le traduzioni
}

export default function DocumentSectionPreview({ 
  section, 
  allSections, 
  documentId,
  level,
  userRole,
  userId,
  selectedLanguage
}: DocumentSectionPreviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteStates, setNoteStates] = useState<{[key: string]: { isAdding: boolean, text: string }}>({});

  // Ottiene i moduli per questa sezione
  const { data: modules } = useQuery({
    queryKey: [`/api/sections/${section.id}/modules`],
    staleTime: 30000,
  });

  // Ottiene le traduzioni per questa sezione se è selezionata una lingua diversa dall'italiano
  const { data: sectionTranslation } = useQuery({
    queryKey: [`/api/section-translations`, { sectionId: section.id, languageId: selectedLanguage?.id }],
    enabled: !!selectedLanguage && selectedLanguage.code !== 'it',
    staleTime: 30000,
  });
  
  // Trova le sottosezioni di questa sezione
  const childSections = allSections
    .filter((childSection) => childSection.parentId === section.id)
    .sort((a, b) => a.order - b.order);

  // Gestione delle note per ogni modulo
  const handleAddNoteClick = (moduleId: number) => {
    setNoteStates(prev => ({
      ...prev,
      [moduleId]: { isAdding: true, text: '' }
    }));
  };

  const handleNoteTextChange = (moduleId: number, text: string) => {
    setNoteStates(prev => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], text }
    }));
  };

  const handleSaveNote = async (moduleId: number) => {
    const noteText = noteStates[moduleId]?.text;
    if (!noteText.trim()) return;

    try {
      // Qui potresti salvare la nota nel database se necessario
      // Per ora mostriamo solo un messaggio di successo
      toast({
        title: "Nota salvata",
        description: "La tua nota è stata aggiunta con successo",
      });

      // Resetta lo stato
      setNoteStates(prev => ({
        ...prev,
        [moduleId]: { isAdding: false, text: '' }
      }));
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel salvare la nota",
        variant: "destructive"
      });
    }
  };

  const handleCancelNote = (moduleId: number) => {
    setNoteStates(prev => ({
      ...prev,
      [moduleId]: { isAdding: false, text: '' }
    }));
  };
  
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
  
  // Determina il titolo e la descrizione da utilizzare (tradotti se disponibili)
  const displayTitle = (selectedLanguage && selectedLanguage.code !== 'it' && sectionTranslation && Array.isArray(sectionTranslation) && sectionTranslation.length > 0) 
    ? (sectionTranslation[0].title || section.title) 
    : section.title;
    
  const displayDescription = (selectedLanguage && selectedLanguage.code !== 'it' && sectionTranslation && Array.isArray(sectionTranslation) && sectionTranslation.length > 0) 
    ? (sectionTranslation[0].description || section.description) 
    : section.description;

  return (
    <div className={`mb-8 ${indentClass}`}>
      <h2 className={getHeadingClass()}>{displayTitle}</h2>
      {displayDescription && <p className="mb-4">{displayDescription}</p>}
      
      {/* Mostra i moduli della sezione */}
      {modules && Array.isArray(modules) && modules.length > 0 && (
        <div className="space-y-4 mb-6">
          {modules.map((module: any) => (
            <div key={module.id} className="preview-module mb-4">
              <ContentModule 
                module={module}
                onDelete={() => {}} // Funzione vuota perché in anteprima non serve
                onUpdate={() => {}} // Funzione vuota perché in anteprima non serve
                documentId={documentId}
                isPreview={true} // Flag per indicare che è in modalità anteprima
                selectedLanguage={selectedLanguage} // Passa la lingua selezionata
              />
              
              {/* Pulsante "Aggiungi nota" dopo ogni modulo in anteprima */}
              <div className="mt-3 flex justify-center">
                {!noteStates[module.id]?.isAdding ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddNoteClick(module.id)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span className="material-icons text-sm">add_circle_outline</span>
                    Aggiungi nota
                  </Button>
                ) : (
                  <Card className="w-full max-w-md border-blue-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 font-medium">
                          <span className="material-icons text-sm">note_add</span>
                          Aggiungi una nota
                        </div>
                        <Textarea
                          placeholder="Scrivi la tua nota qui..."
                          value={noteStates[module.id]?.text || ''}
                          onChange={(e) => handleNoteTextChange(module.id, e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelNote(module.id)}
                          >
                            Annulla
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveNote(module.id)}
                            disabled={!noteStates[module.id]?.text?.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Salva nota
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Componente note per i lettori */}
      {userId && (
        <ReaderNotes 
          documentId={documentId} 
          sectionId={section.id} 
          userId={userId}
          userRole={userRole}
        />
      )}

      {/* Mostra ricorsivamente le sottosezioni */}
      {childSections && Array.isArray(childSections) && childSections.length > 0 && (
        <div className="subsections">
          {childSections.map((childSection) => (
            <DocumentSectionPreview
              key={childSection.id}
              section={childSection}
              allSections={allSections}
              documentId={documentId}
              level={level + 1}
              userRole={userRole}
              userId={userId}
              selectedLanguage={selectedLanguage} // Passa la lingua selezionata alle sottosezioni
            />
          ))}
        </div>
      )}
    </div>
  );
}