import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WarningModuleProps {
  title: string;
  description: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  isTranslated?: boolean;
}

// Componente di base per i moduli di avvertenza
export const WarningModule: React.FC<WarningModuleProps> = ({
  title,
  description,
  imageUrl,
  backgroundColor,
  textColor,
  isTranslated = false
}) => {
  return (
    <Card className="mb-4 border-0 overflow-hidden">
      <div className="flex">
        {/* Cella colorata con immagine di avvertenza */}
        <div 
          className="flex-none w-24 flex items-center justify-center p-4" 
          style={{ backgroundColor }}
        >
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-12 h-12" 
            />
          )}
        </div>
        
        {/* Cella con il testo */}
        <CardContent className="flex-grow p-4">
          <h3 
            className="text-xl font-bold mb-2"
            style={{ color: textColor }}
          >
            {title}
          </h3>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: description }} />
        </CardContent>
      </div>
    </Card>
  );
};

// Modulo PERICOLO (rosso)
export const DangerModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
}> = ({ 
  title = "PERICOLO", 
  description,
  isTranslated = false
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#d9001e"
      textColor="#d9001e"
      isTranslated={isTranslated}
    />
  );
};

// Modulo AVVERTENZA (arancione)
export const WarningAlertModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
}> = ({ 
  title = "AVVERTENZA", 
  description,
  isTranslated = false
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#ff9900"
      textColor="#ff9900"
      isTranslated={isTranslated}
    />
  );
};

// Modulo ATTENZIONE (giallo)
export const CautionModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
}> = ({ 
  title = "ATTENZIONE", 
  description,
  isTranslated = false
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#ffd500"
      textColor="#000000"
      isTranslated={isTranslated}
    />
  );
};

// Modulo NOTA (blu)
export const NoteModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
}> = ({ 
  title = "NOTA", 
  description,
  isTranslated = false
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114740439-80ea52939809d17cd1cd09be1d70a598.png"
      backgroundColor="#3366cc"
      textColor="#3366cc"
      isTranslated={isTranslated}
    />
  );
};

// Modulo Istruzioni di Sicurezza (verde)
export const SafetyInstructionsModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
}> = ({ 
  title = "Istruzioni di sicurezza", 
  description,
  isTranslated = false
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#339933"
      textColor="#339933"
      isTranslated={isTranslated}
    />
  );
};