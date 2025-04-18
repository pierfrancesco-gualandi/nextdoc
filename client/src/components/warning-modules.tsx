import React from 'react';
import { cn } from '@/lib/utils';

export interface WarningModuleProps {
  level: 'error' | 'warning' | 'info' | 'success' | 'safety';
  title?: string;
  message: string;
  className?: string;
}

/**
 * Componente per la visualizzazione di avvisi, note e messaggi di sicurezza
 *
 * @param {WarningModuleProps} props - Proprietà del componente
 * @returns {JSX.Element} - Il componente React
 */
const WarningModule: React.FC<WarningModuleProps> = ({
  level = 'info',
  title,
  message,
  className
}) => {
  const defaultTitles = {
    error: 'PERICOLO',
    warning: 'AVVERTENZA',
    info: 'NOTA',
    success: 'IMPORTANTE',
    safety: 'ISTRUZIONI DI SICUREZZA'
  };
  
  const icons = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✓',
    safety: '🛡️'
  };
  
  // Colori per ciascun tipo di avviso (corrispondono al CSS)
  const bgColors = {
    error: '#ff0000',    // Rosso intenso
    warning: '#ff8c00',  // Arancione intenso
    info: '#0070d1',     // Blu intenso
    success: '#2e7d32',  // Verde intenso
    safety: '#2e7d32'    // Verde intenso
  };
  
  // Lo stile del bordo deve corrispondere esattamente al colore di sfondo
  // Il testo deve sempre essere bianco per garantire la visibilità
  const boxStyle = {
    backgroundColor: bgColors[level] || bgColors.info,
    borderColor: bgColors[level] || bgColors.info,
    color: '#ffffff' // Testo SEMPRE bianco
  };
  
  const headerStyle = {
    backgroundColor: bgColors[level] || bgColors.info,
    color: '#ffffff' // Testo SEMPRE bianco
  };
  
  const bodyStyle = {
    color: '#ffffff' // Testo SEMPRE bianco
  };
  
  // Applica il testo maiuscolo per i titoli (errore, avvertenza, nota)
  const formattedTitle = title || defaultTitles[level];
  
  return (
    <div 
      className={cn("warning-module", `warning-${level}`, className)}
      style={boxStyle}
    >
      <div className="warning-header" style={headerStyle}>
        <span className="warning-icon">{icons[level]}</span>
        <h4 className="warning-title">{formattedTitle}</h4>
      </div>
      <div className="warning-body" style={bodyStyle}>
        <p>{message}</p>
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
  <WarningModule {...props} level="warning" />
);

export const NoteModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="info" />
);

export const SafetyInstructionsModule: React.FC<Omit<WarningModuleProps, 'level'>> = (props) => (
  <WarningModule {...props} level="safety" />
);

export default WarningModule;