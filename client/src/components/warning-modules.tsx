import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WarningModuleProps {
  title: string;
  description: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  isTranslated?: boolean;
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}

// Componente di base per i moduli di avvertenza
export const WarningModule: React.FC<WarningModuleProps> = ({
  title,
  description,
  imageUrl,
  backgroundColor,
  textColor,
  isTranslated = false,
  highlightMissingTranslations = false,
  originalTitle,
  originalDescription
}) => {
  // Determina se usare il testo originale con evidenziazione per mancata traduzione
  const showOriginalTitle = highlightMissingTranslations && !isTranslated && originalTitle;
  const showOriginalDescription = highlightMissingTranslations && !isTranslated && originalDescription;
  
  // Classe CSS per evidenziare il testo non tradotto
  const missingTranslationClass = "bg-red-100 text-red-800 px-1 py-0.5 rounded";
  
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
            className={`text-xl font-bold mb-2 ${showOriginalTitle ? missingTranslationClass : ''}`}
            style={{ color: showOriginalTitle ? "inherit" : textColor }}
          >
            {showOriginalTitle ? originalTitle : title}
          </h3>
          
          {showOriginalDescription ? (
            <div className={missingTranslationClass}>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: originalDescription }} />
            </div>
          ) : (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: description }} />
          )}
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
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}> = ({ 
  title = "PERICOLO", 
  description,
  isTranslated = false,
  highlightMissingTranslations = false,
  originalTitle,
  originalDescription
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#d9001e"
      textColor="#FFFFFF"
      isTranslated={isTranslated}
      highlightMissingTranslations={highlightMissingTranslations}
      originalTitle={originalTitle}
      originalDescription={originalDescription}
    />
  );
};

// Modulo AVVERTENZA (arancione)
export const WarningAlertModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}> = ({ 
  title = "AVVERTENZA", 
  description,
  isTranslated = false,
  highlightMissingTranslations = false,
  originalTitle,
  originalDescription
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#ff9900"
      textColor="#FFFFFF"
      isTranslated={isTranslated}
      highlightMissingTranslations={highlightMissingTranslations}
      originalTitle={originalTitle}
      originalDescription={originalDescription}
    />
  );
};

// Modulo ATTENZIONE (giallo)
export const CautionModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}> = ({ 
  title = "ATTENZIONE", 
  description,
  isTranslated = false,
  highlightMissingTranslations = false,
  originalTitle,
  originalDescription
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#ffd500"
      textColor="#FFFFFF"
      isTranslated={isTranslated}
      highlightMissingTranslations={highlightMissingTranslations}
      originalTitle={originalTitle}
      originalDescription={originalDescription}
    />
  );
};

// Modulo NOTA (blu) - Senza icona di pericolo
export const NoteModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}> = ({ 
  title = "NOTA", 
  description,
  isTranslated = false,
  highlightMissingTranslations = false,
  originalTitle,
  originalDescription
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      // Non usare l'icona di pericolo per il modulo NOTA
      backgroundColor="#3366cc"
      textColor="#FFFFFF"
      isTranslated={isTranslated}
      highlightMissingTranslations={highlightMissingTranslations}
      originalTitle={originalTitle}
      originalDescription={originalDescription}
    />
  );
};

// Modulo Istruzioni di Sicurezza (verde)
export const SafetyInstructionsModule: React.FC<{
  title?: string;
  description: string;
  isTranslated?: boolean;
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}> = ({ 
  title = "Istruzioni di sicurezza", 
  description,
  isTranslated = false,
  highlightMissingTranslations = false,
  originalTitle,
  originalDescription
}) => {
  return (
    <WarningModule
      title={title}
      description={description}
      imageUrl="/uploads/1744114733296-157c58bc11960470cbc76bc367c1ecb0.png"
      backgroundColor="#339933"
      textColor="#FFFFFF"
      isTranslated={isTranslated}
      highlightMissingTranslations={highlightMissingTranslations}
      originalTitle={originalTitle}
      originalDescription={originalDescription}
    />
  );
};