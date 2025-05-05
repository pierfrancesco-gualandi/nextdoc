import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import DomainSettings from '@/components/DomainSettings';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, Globe, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface DomainConfig {
  type: 'cname' | 'a-record';
  domain: string;
  subdomain?: string;
}

const DomainSettingsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'intro' | 'config' | 'success'>('intro');
  const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null);
  const { toast } = useToast();

  // Funzione che gestisce il salvataggio della configurazione del dominio
  const handleSaveConfig = (config: DomainConfig) => {
    // Qui ci sarebbe la logica per salvare effettivamente la configurazione sul server
    console.log('Saving domain configuration:', config);
    
    setDomainConfig(config);
    
    // Simula un'operazione di successo
    setTimeout(() => {
      setCurrentStep('success');
    }, 1000);
    
    toast({
      title: "Configurazione in corso...",
      description: "Stiamo elaborando la tua richiesta.",
    });
  };

  // Calcola il dominio completo da visualizzare
  const getFullDomain = () => {
    if (!domainConfig) return null;
    
    if (!domainConfig.subdomain) {
      return domainConfig.domain;
    }
    
    return `${domainConfig.subdomain}.${domainConfig.domain}`;
  };

  // Pagina introduttiva con spiegazioni e opzioni
  const renderIntroStep = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configurazione Dominio Personalizzato
        </CardTitle>
        <CardDescription>
          Collega il tuo dominio personalizzato all'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-md text-blue-800 border border-blue-200">
          <h3 className="font-medium mb-2">Perché utilizzare un dominio personalizzato?</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Offri un URL professionale e facile da ricordare ai tuoi utenti</li>
            <li>Migliora l'identità del brand e la credibilità della tua applicazione</li>
            <li>Mantieni l'aspetto professionale in tutte le comunicazioni</li>
          </ul>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Opzione CNAME</CardTitle>
              <CardDescription>Consigliato per la maggior parte degli utenti</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Utilizza un record CNAME per puntare il tuo dominio al nostro server.</p>
              <p>Vantaggi:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Certificati SSL gestiti automaticamente</li>
                <li>Configurazione più semplice</li>
                <li>Si adatta ai cambiamenti dell'infrastruttura</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Opzione Record A/AAAA</CardTitle>
              <CardDescription>Per casi speciali e domini root</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Configura record A e AAAA per collegamenti IPv4 e IPv6.</p>
              <p>Vantaggi:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Supporta domini root dove CNAME non è permesso</li>
                <li>Maggior controllo sulle impostazioni DNS</li>
                <li>Compatibile con tutti i provider DNS</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Link href="/settings">
          <Button variant="outline" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>
        </Link>
        <Button onClick={() => setCurrentStep('config')}>Configura Dominio</Button>
      </CardFooter>
    </Card>
  );

  // Pagina di successo dopo la configurazione
  const renderSuccessStep = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <CardTitle>Configurazione completata</CardTitle>
        <CardDescription>
          La configurazione del dominio è stata salvata con successo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 p-4 rounded-md border border-green-200 text-center">
          <p className="text-green-800 font-medium mb-2">
            Il tuo dominio personalizzato è stato impostato
          </p>
          <div className="text-lg font-semibold text-green-700">
            {getFullDomain()}
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">Prossimi passi:</h3>
          <ol className="list-decimal pl-5 space-y-2 text-blue-800">
            <li>
              Aggiungi i record DNS necessari presso il tuo provider di domini, seguendo le istruzioni fornite
            </li>
            <li>
              Attendi la propagazione DNS (può richiedere fino a 24 ore)
            </li>
            <li>
              Verifica che il tuo dominio punti correttamente all'applicazione
            </li>
            <li>
              Se hai scelto la configurazione con record A/AAAA, configura manualmente il certificato SSL o utilizza un servizio come Cloudflare
            </li>
          </ol>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('config')}
        >
          Modifica configurazione
        </Button>
        <Link href="/settings">
          <Button>Torna alle impostazioni</Button>
        </Link>
      </CardFooter>
    </Card>
  );

  // Rendering condizionale in base allo step corrente
  return (
    <div className="container py-8">
      {currentStep === 'intro' && renderIntroStep()}
      {currentStep === 'config' && (
        <div className="max-w-3xl mx-auto">
          <Link href="/settings">
            <Button variant="ghost" className="mb-4 -ml-2 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Torna alle impostazioni
            </Button>
          </Link>
          <DomainSettings onSave={handleSaveConfig} />
        </div>
      )}
      {currentStep === 'success' && renderSuccessStep()}
    </div>
  );
};

export default DomainSettingsPage;