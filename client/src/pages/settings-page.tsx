import React, { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface SettingsPageProps {
  toggleSidebar: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ toggleSidebar }) => {
  // Usa il contesto delle impostazioni
  const { 
    settings, 
    isLoading, 
    saveSettings, 
    updateAppSettings, 
    updateHtmlExportSettings, 
    updateDomainSettings 
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState('generale');
  const [isSaving, setIsSaving] = useState(false);
  
  // Gestisce il salvataggio globale delle impostazioni
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
      alert('Impostazioni salvate con successo!');
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni:', error);
      alert('Errore nel salvataggio delle impostazioni.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Gestisce i cambiamenti alle impostazioni dell'applicazione
  const handleAppSettingChange = (name: string, value: any) => {
    updateAppSettings({ [name]: value } as any);
  };
  
  // Gestisce i cambiamenti alle impostazioni di esportazione HTML
  const handleHtmlSettingChange = (name: string, value: any) => {
    updateHtmlExportSettings({ [name]: value } as any);
  };
  
  // Gestisce i cambiamenti alle impostazioni del dominio
  const handleDomainSettingChange = (name: string, value: any) => {
    updateDomainSettings({ [name]: value } as any);
  };
  
  // Mostra un loader durante il caricamento delle impostazioni
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Caricamento impostazioni...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col flex-1 p-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <div className="flex items-center space-x-2">
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Salvataggio...
              </>
            ) : 'Salva tutte le impostazioni'}
          </button>
          <button 
            className="p-2 rounded-full hover:bg-neutral-100"
            onClick={toggleSidebar}
          >
            <span className="material-icons">menu</span>
          </button>
        </div>
      </div>
      
      <div>
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b">
          <button 
            className={`px-4 py-2 ${activeTab === 'generale' ? 'border-b-2 border-primary text-primary font-medium' : 'text-neutral-600 hover:bg-neutral-50'}`}
            onClick={() => {
              setActiveTab('generale');
              document.getElementById('tab-generale')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Generale
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'html' ? 'border-b-2 border-primary text-primary font-medium' : 'text-neutral-600 hover:bg-neutral-50'}`}
            onClick={() => {
              setActiveTab('html');
              document.getElementById('tab-html')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Esportazione HTML
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'domain' ? 'border-b-2 border-primary text-primary font-medium' : 'text-neutral-600 hover:bg-neutral-50'}`}
            onClick={() => {
              setActiveTab('domain');
              document.getElementById('tab-domain')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Dominio
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'deploy' ? 'border-b-2 border-primary text-primary font-medium' : 'text-neutral-600 hover:bg-neutral-50'}`}
            onClick={() => {
              setActiveTab('deploy');
              document.getElementById('tab-deploy')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Deployment
          </button>
        </div>
      </div>
      
      {/* Tab: Generale */}
      <div id="tab-generale" className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Impostazioni Generali</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-xl font-semibold mb-4">Applicazione</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome dell'applicazione</label>
                <input 
                  type="text" 
                  value={settings.app.appName}
                  onChange={(e) => handleAppSettingChange('appName', e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo personalizzato</label>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-neutral-100 rounded flex items-center justify-center mr-4">
                    {settings.app.logo ? (
                      <img src={settings.app.logo} alt="Logo" className="max-w-full max-h-full" />
                    ) : (
                      <span className="material-icons text-2xl">description</span>
                    )}
                  </div>
                  <button className="px-3 py-1 bg-primary text-white rounded-md text-sm">
                    Carica logo
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tema colore</label>
                <div className="flex space-x-2">
                  <div 
                    className={`w-8 h-8 rounded-full bg-blue-500 cursor-pointer ${settings.app.theme === 'blue' ? 'border-2 border-black' : ''}`}
                    onClick={() => handleAppSettingChange('theme', 'blue')}
                  ></div>
                  <div 
                    className={`w-8 h-8 rounded-full bg-green-500 cursor-pointer ${settings.app.theme === 'green' ? 'border-2 border-black' : ''}`}
                    onClick={() => handleAppSettingChange('theme', 'green')}
                  ></div>
                  <div 
                    className={`w-8 h-8 rounded-full bg-purple-500 cursor-pointer ${settings.app.theme === 'purple' ? 'border-2 border-black' : ''}`}
                    onClick={() => handleAppSettingChange('theme', 'purple')}
                  ></div>
                  <div 
                    className={`w-8 h-8 rounded-full bg-red-500 cursor-pointer ${settings.app.theme === 'red' ? 'border-2 border-black' : ''}`}
                    onClick={() => handleAppSettingChange('theme', 'red')}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-xl font-semibold mb-4">Interfaccia Utente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lingua di sistema</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={settings.app.language}
                  onChange={(e) => handleAppSettingChange('language', e.target.value)}
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="sidebar-option" 
                  className="mr-2"
                  checked={settings.app.showSidebar}
                  onChange={(e) => handleAppSettingChange('showSidebar', e.target.checked)}
                />
                <label htmlFor="sidebar-option" className="text-sm">Mostra barra laterale all'avvio</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab: Esportazione HTML */}
      <div id="tab-html" className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Configurazione Esportazione HTML</h2>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border mb-6">
          <h3 className="text-xl font-semibold mb-4">Configurazione HTML esportato</h3>
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Titolo pagina HTML</label>
                <input 
                  type="text" 
                  placeholder="[Titolo documento]" 
                  className="w-full p-2 border rounded-md"
                  value={settings.htmlExport.pageTitle}
                  onChange={(e) => handleHtmlSettingChange('pageTitle', e.target.value)}
                />
                <p className="text-xs text-neutral-500 mt-1">Usa [Titolo documento] per inserire dinamicamente il titolo del documento</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tag meta description</label>
                <input 
                  type="text" 
                  placeholder="[Descrizione documento]" 
                  className="w-full p-2 border rounded-md"
                  value={settings.htmlExport.metaDescription}
                  onChange={(e) => handleHtmlSettingChange('metaDescription', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">CSS personalizzato</label>
              <textarea 
                className="w-full p-2 border rounded-md font-mono text-sm h-32"
                placeholder="/* Inserisci qui il tuo CSS personalizzato */"
                value={settings.htmlExport.customCss}
                onChange={(e) => handleHtmlSettingChange('customCss', e.target.value)}
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Header HTML personalizzato</label>
              <textarea 
                className="w-full p-2 border rounded-md font-mono text-sm h-32"
                placeholder="<!-- Inserisci qui codice HTML da includere nell'header -->"
                value={settings.htmlExport.headerHtml}
                onChange={(e) => handleHtmlSettingChange('headerHtml', e.target.value)}
              ></textarea>
              <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito nel tag &lt;head&gt; delle pagine esportate</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Footer HTML personalizzato</label>
              <textarea 
                className="w-full p-2 border rounded-md font-mono text-sm h-32"
                placeholder="<!-- Inserisci qui codice HTML da includere nel footer -->"
                value={settings.htmlExport.footerHtml}
                onChange={(e) => handleHtmlSettingChange('footerHtml', e.target.value)}
              ></textarea>
              <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito alla fine della pagina, prima della chiusura del tag &lt;body&gt;</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="include-js" 
                  className="mr-2"
                  checked={settings.htmlExport.includeJs}
                  onChange={(e) => handleHtmlSettingChange('includeJs', e.target.checked)}
                />
                <label htmlFor="include-js" className="text-sm">Includi JavaScript per funzionalità interattive</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="include-toc" 
                  className="mr-2"
                  checked={settings.htmlExport.includeToc}
                  onChange={(e) => handleHtmlSettingChange('includeToc', e.target.checked)}
                />
                <label htmlFor="include-toc" className="text-sm">Includi indice dei contenuti</label>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                onClick={() => {
                  // Salva solo le impostazioni HTML
                  saveSettings(settings).then(() => {
                    alert('Configurazione HTML salvata con successo!');
                  });
                }}
              >
                Salva configurazione HTML
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-xl font-semibold mb-4">Anteprima HTML</h3>
          <div className="border rounded-md p-4 h-64 bg-neutral-50 flex items-center justify-center">
            <div className="text-center">
              <span className="material-icons text-4xl text-neutral-400 mb-2">code</span>
              <p className="text-neutral-500">L'anteprima del documento HTML verrà visualizzata qui</p>
              <button className="mt-4 px-3 py-1 bg-primary text-white rounded-md text-sm">
                Genera anteprima
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab: Dominio */}
      <div id="tab-domain" className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Configurazione Dominio</h2>
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-xl font-semibold mb-4">Configurazione Dominio</h3>
          <p className="mb-4">Aggiungi un dominio personalizzato alla tua applicazione.</p>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-2">Dominio Attuale</h4>
            <code className="bg-neutral-50 p-2 rounded border block">
              {settings.domain.defaultDomain}
            </code>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-2">Aggiungi Dominio Personalizzato</h4>
            <div className="flex mb-4">
              <input 
                type="text" 
                placeholder="esempio.com" 
                className="flex-1 p-2 border rounded-l-md"
                value={settings.domain.customDomain || ''}
                onChange={(e) => handleDomainSettingChange('customDomain', e.target.value)}
              />
              <button 
                className="px-4 py-2 bg-primary text-white rounded-r-md"
                onClick={() => {
                  saveSettings(settings).then(() => {
                    alert('Dominio personalizzato aggiornato con successo!');
                  });
                }}
              >
                Aggiungi
              </button>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-2">Configurazione DNS</h4>
            <div className="bg-neutral-50 p-4 rounded border">
              <p className="mb-2">Per collegare il tuo dominio a questa applicazione, configura questi record DNS:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Tipo</th>
                      <th className="py-2 text-left">Nome</th>
                      <th className="py-2 text-left">Valore</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">CNAME</td>
                      <td className="py-2">www</td>
                      <td className="py-2">{settings.domain.defaultDomain}</td>
                    </tr>
                    <tr>
                      <td className="py-2">A</td>
                      <td className="py-2">@</td>
                      <td className="py-2">76.76.21.123</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab: Deployment */}
      <div id="tab-deploy" className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Deployment</h2>
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-xl font-semibold mb-4">Gestione Deployment</h3>
          <p className="mb-6">Configura e gestisci il deployment della tua applicazione.</p>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-2">Stato Attuale</h4>
            <div className="flex items-center">
              <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
              <span>Applicazione attiva</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-2">Ultima Versione</h4>
            <div className="bg-neutral-50 p-4 rounded border">
              <div className="flex justify-between mb-2">
                <span className="font-medium">v1.0.0</span>
                <span className="text-neutral-600">3 giorni fa</span>
              </div>
              <p>Release iniziale</p>
            </div>
          </div>
          
          <button className="px-4 py-2 bg-primary text-white rounded-md">
            Crea Nuovo Deployment
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;