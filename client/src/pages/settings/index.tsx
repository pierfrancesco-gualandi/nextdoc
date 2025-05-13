import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SettingsPageProps {
  toggleSidebar?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ toggleSidebar }) => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("generale");

  return (
    <div className="flex flex-col flex-1 p-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <button 
          className="p-2 rounded-full hover:bg-neutral-100"
          onClick={toggleSidebar}
        >
          <span className="material-icons">menu</span>
        </button>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6 border-b w-full justify-start">
          <TabsTrigger value="generale" className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            Generale
          </TabsTrigger>
          <TabsTrigger value="esportazione" className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            Esportazione HTML
          </TabsTrigger>
          <TabsTrigger value="domain" className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            Dominio
          </TabsTrigger>
          <TabsTrigger value="deploy" className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            Deployment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generale" className="pt-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h2 className="text-xl font-semibold mb-4">Applicazione</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome dell'applicazione</label>
                  <input 
                    type="text" 
                    defaultValue="VKS Studio" 
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo personalizzato</label>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-neutral-100 rounded flex items-center justify-center mr-4">
                      <span className="material-icons text-2xl">description</span>
                    </div>
                    <button className="px-3 py-1 bg-primary text-white rounded-md text-sm">
                      Carica logo
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tema colore</label>
                  <div className="flex space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 cursor-pointer border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-green-500 cursor-pointer"></div>
                    <div className="w-8 h-8 rounded-full bg-purple-500 cursor-pointer"></div>
                    <div className="w-8 h-8 rounded-full bg-red-500 cursor-pointer"></div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 cursor-pointer flex items-center justify-center">
                      <span className="material-icons text-sm">add</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h2 className="text-xl font-semibold mb-4">Interfaccia Utente</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lingua di sistema</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modalità visualizzazione</label>
                  <div className="flex space-x-2">
                    <button className="px-3 py-2 bg-primary text-white rounded-md text-sm flex-1">Chiaro</button>
                    <button className="px-3 py-2 bg-white border rounded-md text-sm flex-1">Scuro</button>
                    <button className="px-3 py-2 bg-white border rounded-md text-sm flex-1">Auto</button>
                  </div>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="sidebar-option" 
                    className="mr-2"
                    defaultChecked
                  />
                  <label htmlFor="sidebar-option" className="text-sm">Mostra barra laterale all'avvio</label>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="esportazione" className="pt-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border mb-6">
            <h2 className="text-xl font-semibold mb-4">Configurazione HTML esportato</h2>
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Titolo pagina HTML</label>
                  <input 
                    type="text" 
                    placeholder="[Titolo documento]" 
                    className="w-full p-2 border rounded-md"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Usa [Titolo documento] per inserire dinamicamente il titolo del documento</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tag meta description</label>
                  <input 
                    type="text" 
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
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Header HTML personalizzato</label>
                <textarea 
                  className="w-full p-2 border rounded-md font-mono text-sm h-32"
                  placeholder="<!-- Inserisci qui codice HTML da includere nell'header -->"
                ></textarea>
                <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito nel tag &lt;head&gt; delle pagine esportate</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Footer HTML personalizzato</label>
                <textarea 
                  className="w-full p-2 border rounded-md font-mono text-sm h-32"
                  placeholder="<!-- Inserisci qui codice HTML da includere nel footer -->"
                ></textarea>
                <p className="text-xs text-neutral-500 mt-1">Questo codice verrà inserito alla fine della pagina, prima della chiusura del tag &lt;body&gt;</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="include-js" 
                    className="mr-2"
                    defaultChecked
                  />
                  <label htmlFor="include-js" className="text-sm">Includi JavaScript per funzionalità interattive</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="include-toc" 
                    className="mr-2"
                    defaultChecked
                  />
                  <label htmlFor="include-toc" className="text-sm">Includi indice dei contenuti</label>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
                  Salva configurazione
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h2 className="text-xl font-semibold mb-4">Anteprima HTML</h2>
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
        </TabsContent>

        <TabsContent value="domain" className="pt-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h2 className="text-xl font-semibold mb-4">Configurazione Dominio</h2>
            <p className="mb-4">Aggiungi un dominio personalizzato alla tua applicazione.</p>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Dominio Attuale</h3>
              <code className="bg-neutral-50 p-2 rounded border block">app-nome.replit.app</code>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Aggiungi Dominio Personalizzato</h3>
              <div className="flex mb-4">
                <input 
                  type="text" 
                  placeholder="esempio.com" 
                  className="flex-1 p-2 border rounded-l-md"
                />
                <button className="px-4 py-2 bg-primary text-white rounded-r-md">
                  Aggiungi
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Configurazione DNS</h3>
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
                        <td className="py-2">app-nome.replit.app</td>
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
        </TabsContent>

        <TabsContent value="deploy" className="pt-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h2 className="text-xl font-semibold mb-4">Deployment</h2>
            <p className="mb-6">Configura e gestisci il deployment della tua applicazione.</p>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Stato Attuale</h3>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                <span>Applicazione attiva</span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Ultima Versione</h3>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;