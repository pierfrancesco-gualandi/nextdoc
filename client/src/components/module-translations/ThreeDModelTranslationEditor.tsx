import React, { useState, useEffect } from 'react';
import TranslationEditableField from '../TranslationEditableField';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ThreeDModelTranslationEditorProps {
  module: any;
  moduleTranslation: any;
  saveTranslation: (translatedContent: any) => void;
  languageId: string;
}

export default function ThreeDModelTranslationEditor({
  module,
  moduleTranslation,
  saveTranslation,
  languageId
}: ThreeDModelTranslationEditorProps) {
  const queryClient = useQueryClient();
  
  // Estrai le informazioni dal modulo originale
  const originalContent = typeof module.content === 'string' 
    ? JSON.parse(module.content) 
    : module.content;
  
  // Preparare il contenuto tradotto iniziale
  const initialTranslatedContent = moduleTranslation?.content 
    ? (typeof moduleTranslation.content === 'string' 
        ? JSON.parse(moduleTranslation.content) 
        : moduleTranslation.content) 
    : {};
  
  // Stati per i campi traducibili
  const [title, setTitle] = useState(initialTranslatedContent.title || '');
  const [caption, setCaption] = useState(initialTranslatedContent.caption || '');
  
  // Stato per le labels traducibili (pulsanti e messaggi UI)
  const [viewLabel, setViewLabel] = useState(
    initialTranslatedContent.labels?.view || (languageId !== '1' ? 'View in 3D' : 'Visualizza in 3D')
  );
  
  // Effetto per salvare automaticamente le modifiche
  useEffect(() => {
    const translatedContent = {
      title,
      caption,
      labels: {
        view: viewLabel
      }
    };
    
    // Salva la traduzione
    saveTranslation(translatedContent);
  }, [title, caption, viewLabel, saveTranslation]);
  
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-2">Traduzione Modello 3D</h3>
        <Separator className="my-2" />
        
        <div className="space-y-4 mt-4">
          {/* Titolo */}
          <div className="translation-field-container">
            <label className="block text-sm font-medium mb-1">Titolo</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="original-text p-2 bg-gray-50 rounded-md">
                {originalContent.title || 'Nessun titolo'}
              </div>
              <TranslationEditableField
                originalValue={originalContent.title || ''}
                translatedValue={title}
                onChange={setTitle}
                isMultiline={false}
                placeholder="Inserisci il titolo tradotto..."
                fieldId={`threeDModel-title-${module.id}`}
              />
            </div>
          </div>
          
          {/* Didascalia */}
          <div className="translation-field-container">
            <label className="block text-sm font-medium mb-1">Didascalia</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="original-text p-2 bg-gray-50 rounded-md min-h-[60px]">
                {originalContent.caption || 'Nessuna didascalia'}
              </div>
              <TranslationEditableField
                originalValue={originalContent.caption || ''}
                translatedValue={caption}
                onChange={setCaption}
                isMultiline={true}
                placeholder="Inserisci la didascalia tradotta..."
                fieldId={`threeDModel-caption-${module.id}`}
              />
            </div>
          </div>
          
          {/* Etichette UI */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="ui-labels">
              <AccordionTrigger className="text-sm font-medium">
                Etichette interfaccia utente
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div className="translation-field-container">
                    <label className="block text-sm font-medium mb-1">Pulsante visualizzazione</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="original-text p-2 bg-gray-50 rounded-md">
                        Visualizza in 3D
                      </div>
                      <TranslationEditableField
                        originalValue="Visualizza in 3D"
                        translatedValue={viewLabel}
                        onChange={setViewLabel}
                        isMultiline={false}
                        placeholder="Inserisci il testo del pulsante..."
                        fieldId={`threeDModel-view-label-${module.id}`}
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}