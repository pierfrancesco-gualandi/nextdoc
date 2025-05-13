import React, { useState } from 'react';

interface HtmlExportSettingsProps {
  onConfigSave?: (config: HtmlExportConfig) => void;
}

export interface HtmlExportConfig {
  pageTitle: string;
  metaDescription: string;
  customCss: string;
  headerHtml: string;
  footerHtml: string;
  includeJs: boolean;
  includeToc: boolean;
}

const HtmlExportSettings: React.FC<HtmlExportSettingsProps> = ({ onConfigSave }) => {
  const [config, setConfig] = useState<HtmlExportConfig>({
    pageTitle: '[Titolo documento]',
    metaDescription: '[Descrizione documento]',
    customCss: '',
    headerHtml: '',
    footerHtml: '',
    includeJs: true,
    includeToc: true
  });

  const handleChange = (field: keyof HtmlExportConfig, value: string | boolean) => {
    setConfig({
      ...config,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onConfigSave) {
      onConfigSave(config);
    }
    alert('Configurazione salvata con successo!');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border mb-6">
      <h2 className="text-xl font-semibold mb-4">Configurazione HTML esportato</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Titolo pagina HTML</label>
            <input 
              type="text" 
              value={config.pageTitle}
              onChange={(e) => handleChange('pageTitle', e.target.value)}
              placeholder="[Titolo documento]" 
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-neutral-500 mt-1">Usa [Titolo documento] per inserire dinamicamente il titolo del documento</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tag meta description</label>
            <input 
              type="text" 
              value={config.metaDescription}
              onChange={(e) => handleChange('metaDescription', e.target.value)}
              placeholder="[Descrizione documento]" 
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">CSS personalizzato</label>
          <textarea 
            className="w-full p-2 border rounded-md font-mono text-sm h-32"
            placeholder="/* Inserisci qui il tuo CSS personalizzato */"
            value={config.customCss}
            onChange={(e) => handleChange('customCss', e.target.value)}
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Header HTML personalizzato</label>
          <textarea 
            className="w-full p-2 border rounded-md font-mono text-sm h-32"
            placeholder="<!-- Inserisci qui codice HTML da includere nell'header -->"
            value={config.headerHtml}
            onChange={(e) => handleChange('headerHtml', e.target.value)}
          ></textarea>
          <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito nel tag &lt;head&gt; delle pagine esportate</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Footer HTML personalizzato</label>
          <textarea 
            className="w-full p-2 border rounded-md font-mono text-sm h-32"
            placeholder="<!-- Inserisci qui codice HTML da includere nel footer -->"
            value={config.footerHtml}
            onChange={(e) => handleChange('footerHtml', e.target.value)}
          ></textarea>
          <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito alla fine della pagina, prima della chiusura del tag &lt;body&gt;</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="include-js" 
              className="mr-2"
              checked={config.includeJs}
              onChange={(e) => handleChange('includeJs', e.target.checked)}
            />
            <label htmlFor="include-js" className="text-sm">Includi JavaScript per funzionalità interattive</label>
          </div>
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="include-toc" 
              className="mr-2"
              checked={config.includeToc}
              onChange={(e) => handleChange('includeToc', e.target.checked)}
            />
            <label htmlFor="include-toc" className="text-sm">Includi indice dei contenuti</label>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Salva configurazione
          </button>
        </div>
      </form>
    </div>
  );
};

export default HtmlExportSettings;