import React from 'react';
import { useEffect, useState } from 'react';

interface SettingsRedirectProps {
  path: 'settings' | 'domain' | 'deploy';
  toggleSidebar?: () => void;
}

const SettingsRedirect: React.FC<SettingsRedirectProps> = ({ path, toggleSidebar }) => {
  return (
    <div className="flex flex-col flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {path === 'settings' && 'Impostazioni'}
          {path === 'domain' && 'Configurazione Dominio'}
          {path === 'deploy' && 'Deployment'}
        </h1>
        <p className="text-neutral-600">
          {path === 'settings' && 'Gestisci le impostazioni generali dell\'applicazione.'}
          {path === 'domain' && 'Configura le impostazioni del dominio personalizzato.'}
          {path === 'deploy' && 'Gestisci le impostazioni di deployment.'}
        </p>
      </div>

      {path === 'settings' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h2 className="text-xl font-semibold mb-4">Applicazione</h2>
            <p className="mb-4">Configura le impostazioni generali dell'applicazione.</p>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              onClick={toggleSidebar}
            >
              Toggle Sidebar
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h2 className="text-xl font-semibold mb-4">Utenti</h2>
            <p>Gestisci gli utenti e i permessi dell'applicazione.</p>
          </div>
        </div>
      )}

      {path === 'domain' && (
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
      )}

      {path === 'deploy' && (
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
      )}
    </div>
  );
};

export default SettingsRedirect;