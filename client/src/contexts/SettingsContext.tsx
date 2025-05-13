import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

// Definizione delle interfacce per le impostazioni
export interface AppSettings {
  appName: string;
  logo: string | null;
  theme: string;
  language: string;
  showSidebar: boolean;
}

export interface HtmlExportSettings {
  pageTitle: string;
  metaDescription: string;
  customCss: string;
  headerHtml: string;
  footerHtml: string;
  includeJs: boolean;
  includeToc: boolean;
}

export interface DomainSettings {
  customDomain: string | null;
  defaultDomain: string;
}

export interface Settings {
  app: AppSettings;
  htmlExport: HtmlExportSettings;
  domain: DomainSettings;
  version: number;
  lastUpdated: string;
}

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  error: Error | null;
  saveSettings: (settings: Settings) => Promise<void>;
  updateAppSettings: (app: Partial<AppSettings>) => void;
  updateHtmlExportSettings: (htmlExport: Partial<HtmlExportSettings>) => void;
  updateDomainSettings: (domain: Partial<DomainSettings>) => void;
}

// Creazione del contesto
const SettingsContext = createContext<SettingsContextType | null>(null);

// Valori predefiniti per le impostazioni
const defaultSettings: Settings = {
  app: {
    appName: 'VKS Studio',
    logo: null,
    theme: 'blue',
    language: 'it',
    showSidebar: true
  },
  htmlExport: {
    pageTitle: '[Titolo documento]',
    metaDescription: '[Descrizione documento]',
    customCss: '',
    headerHtml: '',
    footerHtml: '',
    includeJs: true,
    includeToc: true
  },
  domain: {
    customDomain: null,
    defaultDomain: 'app-nome.replit.app'
  },
  version: 1,
  lastUpdated: new Date().toISOString()
};

// Provider del contesto
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Carica le impostazioni all'avvio
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // In un'applicazione reale, questo sarebbe un API call
        // Per ora carichiamo dal localStorage o usiamo i valori predefiniti
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        } else {
          // Se non ci sono impostazioni salvate, utilizziamo quelle predefinite
          setSettings(defaultSettings);
          // E le salviamo
          localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Errore durante il caricamento delle impostazioni'));
        console.error('Errore nel caricamento delle impostazioni:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Salva le impostazioni
  const saveSettings = async (newSettings: Settings) => {
    setIsLoading(true);
    try {
      // Aggiorna lastUpdated
      const updatedSettings = {
        ...newSettings,
        lastUpdated: new Date().toISOString(),
        version: newSettings.version + 1
      };
      
      // In un'app reale, questo sarebbe un API call
      // Per ora salviamo nel localStorage
      localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
      
      setSettings(updatedSettings);
      console.log('Impostazioni salvate:', updatedSettings);
      return Promise.resolve();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Errore durante il salvataggio delle impostazioni'));
      console.error('Errore nel salvataggio delle impostazioni:', err);
      return Promise.reject(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Funzioni helper per aggiornare parti specifiche delle impostazioni
  const updateAppSettings = (app: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      app: { ...prev.app, ...app }
    }));
  };

  const updateHtmlExportSettings = (htmlExport: Partial<HtmlExportSettings>) => {
    setSettings(prev => ({
      ...prev,
      htmlExport: { ...prev.htmlExport, ...htmlExport }
    }));
  };

  const updateDomainSettings = (domain: Partial<DomainSettings>) => {
    setSettings(prev => ({
      ...prev,
      domain: { ...prev.domain, ...domain }
    }));
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        isLoading, 
        error, 
        saveSettings,
        updateAppSettings,
        updateHtmlExportSettings,
        updateDomainSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Hook per utilizzare le impostazioni
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve essere usato all\'interno di un SettingsProvider');
  }
  return context;
};