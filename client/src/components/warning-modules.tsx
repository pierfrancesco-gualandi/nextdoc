import React from 'react';
import { cn } from '@/lib/utils';

export interface WarningModuleProps {
  level: 'error' | 'warning' | 'caution' | 'info' | 'success' | 'safety';
  title?: string;
  message?: string;
  description?: string;
  className?: string;
  isTranslated?: boolean;
  highlightMissingTranslations?: boolean;
  originalTitle?: string;
  originalDescription?: string;
}

/**
 * Componente per la visualizzazione di avvisi, note e messaggi di sicurezza
 * Ora con lo stesso aspetto grafico dell'esportazione HTML
 *
 * @param {WarningModuleProps} props - Proprietà del componente
 * @returns {JSX.Element} - Il componente React
 */
const WarningModule: React.FC<WarningModuleProps> = ({
  level = 'info',
  title,
  message,
  description,
  className,
  isTranslated,
  highlightMissingTranslations,
  originalTitle,
  originalDescription
}) => {
  const defaultTitles = {
    error: 'PERICOLO',
    warning: 'AVVERTENZA',
    caution: 'ATTENZIONE',
    info: 'NOTA',
    success: 'IMPORTANTE',
    safety: 'ISTRUZIONI DI SICUREZZA'
  };
  
  // Cambiati da emoji a HTML entities come nell'esportazione HTML
  const icons = {
    error: '⚠',
    warning: '⚠',
    caution: '⚠',
    info: 'ℹ',
    success: '✓',
    safety: '🛡'
  };
  
  // Colori per ciascun tipo di avviso (corrispondono all'esportazione HTML)
  const bgColors = {
    error: '#ff0000',    // PERICOLO: Rosso intenso
    warning: '#ff8c00',  // AVVERTENZA: Arancione intenso
    caution: '#ffd600',  // ATTENZIONE: Giallo intenso
    info: '#0070d1',     // NOTA: Blu intenso
    success: '#2e7d32',  // IMPORTANTE: Verde intenso
    safety: '#2e7d32'    // ISTRUZIONI DI SICUREZZA: Verde intenso
  };
  
  // Stili in linea per avere l'ESATTO stesso aspetto dell'esportazione HTML
  const messageStyle = {
    backgroundColor: bgColors[level] || bgColors.info,
    border: 'none',
    color: '#ffffff',
    padding: '15px',
    margin: '15px 0',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    position: 'relative' as const,
    overflow: 'hidden'
  };
  
  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    color: '#ffffff'
  };
  
  const iconStyle = {
    fontSize: '1.5em',
    marginRight: '10px',
    display: 'inline-block',
    color: '#ffffff'
  };
  
  const titleStyle = {
    margin: '0',
    fontSize: '1.1em',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    color: '#ffffff'
  };
  
  const bodyStyle = {
    color: '#ffffff',
    paddingLeft: '2px'
  };
  
  const paragraphStyle = {
    margin: '8px 0',
    color: '#ffffff'
  };
  
  const descriptionStyle = {
    marginTop: '10px',
    fontStyle: 'italic',
    borderTop: '1px dashed rgba(255,255,255,0.3)',
    paddingTop: '8px',
    color: '#ffffff'
  };
  
  // Funzione per rimuovere tag HTML dal testo
  const stripHtmlTags = (text: string) => {
    if (!text) return text;
    return text.replace(/<[^>]*>/g, '');
  };

  // Applica il testo maiuscolo per i titoli (errore, avvertenza, nota)
  const formattedTitle = title || defaultTitles[level];
  const cleanMessage = stripHtmlTags(message || "");
  const cleanDescription = stripHtmlTags(description || "");
  const displayMessage = cleanMessage || cleanDescription || "Messaggio non specificato";
  
  return (
    <div 
      className={cn("message", level, className)}
      style={messageStyle}
    >
      <div className="message-header" style={headerStyle}>
        <span className="message-icon" style={iconStyle}>{icons[level]}</span>
        <h4 style={titleStyle}>{formattedTitle}</h4>
      </div>
      <div className="message-body" style={bodyStyle}>
        <p style={paragraphStyle}>{displayMessage}</p>
        {cleanDescription && cleanMessage && cleanDescription !== cleanMessage && (
          <p className="warning-description" style={descriptionStyle}>{cleanDescription}</p>
        )}
      </div>
    </div>
  );
};

// Componenti specializzati per diversi tipi di avvisi

export const DangerModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="error" />
);

export const WarningAlertModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="warning" />
);

export const CautionModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="caution" />
);

export const NoteModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="info" />
);

export const SafetyInstructionsModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="safety" />
);

export default WarningModule;