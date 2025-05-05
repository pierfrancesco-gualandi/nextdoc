import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ArrowLeft, Globe, Server, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DeployPage: React.FC = () => {
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeploy = () => {
    setDeployStatus('deploying');
    toast({
      title: "Avvio deploy",
      description: "Stiamo preparando l'applicazione per il deploy...",
    });

    // Simula un processo di deploy
    setTimeout(() => {
      setDeployStatus('success');
      setDeployUrl('tecnocart-vks.replit.app');
      toast({
        title: "Deploy completato",
        description: "L'applicazione è stata pubblicata con successo!",
      });
    }, 3000);
  };

  return (
    <div className="container py-8">
      <Link href="/settings">
        <Button variant="ghost" className="mb-4 -ml-2 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Torna alle impostazioni
        </Button>
      </Link>
      
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Server className="h-5 w-5" />
            Deploy Applicazione
          </CardTitle>
          <CardDescription>
            Pubblica l'applicazione su Replit per renderla accessibile online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deployStatus === 'idle' && (
            <>
              <div className="bg-blue-50 p-4 rounded-md text-blue-800 border border-blue-200">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Informazioni sul deploy
                </h3>
                <p className="text-sm mb-2">
                  Il deploy pubblicherà l'applicazione e la renderà accessibile tramite un URL pubblico. 
                  La prima pubblicazione richiederà qualche minuto.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Il codice dell'applicazione verrà compilato in modalità produzione</li>
                  <li>Verrà creato un URL pubblico per accedere all'applicazione</li>
                  <li>Gli aggiornamenti futuri richiederanno un nuovo deploy</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Dominio Replit</CardTitle>
                    <CardDescription>URL pubblico generato automaticamente</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>Ogni applicazione pubblicata su Replit ottiene un URL pubblico gratuito con formato:</p>
                    <p className="font-mono bg-neutral-100 p-2 rounded">nome-app.replit.app</p>
                    <p>Questo URL sarà sempre disponibile anche se configuri un dominio personalizzato.</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Dominio Personalizzato</CardTitle>
                    <CardDescription>Utilizza il tuo dominio per l'applicazione</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>Puoi configurare un dominio personalizzato da puntare alla tua applicazione.</p>
                    <p>Dopo il deploy, vai alla pagina dei <Link href="/settings/domain"><a className="text-blue-600 hover:underline">domini personalizzati</a></Link> per configurare il tuo dominio.</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          
          {deployStatus === 'deploying' && (
            <div className="text-center py-8">
              <div className="inline-block rounded-full bg-blue-100 p-3 mb-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
              <h3 className="text-lg font-medium">Deploy in corso...</h3>
              <p className="text-sm text-neutral-500 mt-2">
                Stiamo preparando la tua applicazione. Questo processo potrebbe richiedere alcuni minuti.
              </p>
              <div className="mt-6 space-y-2 text-left">
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm">Compilazione dell'applicazione</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
                  </div>
                  <span className="text-sm">Configurazione dell'infrastruttura...</span>
                </div>
                <div className="flex items-center text-neutral-400">
                  <div className="h-2 w-2 rounded-full bg-neutral-300 mr-2"></div>
                  <span className="text-sm">Pubblicazione su Replit</span>
                </div>
              </div>
            </div>
          )}
          
          {deployStatus === 'success' && (
            <div className="text-center py-6">
              <div className="inline-block rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">Deploy completato con successo!</h3>
              <p className="text-sm text-neutral-600 mt-2 mb-6">
                La tua applicazione è ora disponibile online
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-left mb-6">
                <h4 className="font-medium text-green-800 mb-2">URL dell'applicazione:</h4>
                <div className="flex items-center">
                  <a 
                    href={`https://${deployUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono bg-white p-2 rounded border flex-grow truncate hover:bg-green-50 transition"
                  >
                    https://{deployUrl}
                  </a>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="ml-2 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${deployUrl}`);
                      toast({
                        title: "URL copiato",
                        description: "L'URL è stato copiato negli appunti",
                      });
                    }}
                  >
                    Copia
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4 text-left">
                <Alert className="bg-blue-50 border-blue-200">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Configurazione dominio personalizzato</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Per utilizzare un dominio personalizzato per la tua applicazione, vai alla pagina dei <Link href="/settings/domain"><a className="text-blue-600 hover:underline">domini personalizzati</a></Link>.
                  </AlertDescription>
                </Alert>
                
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Promemoria importante</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Ricorda che ogni volta che apporti modifiche significative all'applicazione, dovrai eseguire nuovamente il deploy per renderle disponibili online.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
          
          {deployStatus === 'error' && (
            <div className="text-center py-8">
              <div className="inline-block rounded-full bg-red-100 p-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium">Si è verificato un errore</h3>
              <p className="text-sm text-neutral-600 mt-2 mb-6">
                Non è stato possibile completare il deploy dell'applicazione
              </p>
              
              <Alert className="bg-red-50 border-red-200 mb-6">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Errore nel processo di deploy</AlertTitle>
                <AlertDescription className="text-red-700">
                  Si è verificato un errore durante la compilazione dell'applicazione. Controlla i log per maggiori informazioni.
                </AlertDescription>
              </Alert>
              
              <Button variant="outline" onClick={() => setDeployStatus('idle')}>
                Riprova
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Link href="/settings">
            <Button variant="outline">Indietro</Button>
          </Link>
          
          {deployStatus === 'idle' && (
            <Button onClick={handleDeploy}>
              Avvia Deploy
            </Button>
          )}
          
          {deployStatus === 'deploying' && (
            <Button disabled>
              Deploy in corso...
            </Button>
          )}
          
          {deployStatus === 'success' && (
            <a 
              href={`https://${deployUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition"
            >
              <Globe className="h-4 w-4" />
              Visita il sito
            </a>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default DeployPage;