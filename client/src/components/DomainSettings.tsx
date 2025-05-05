import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Definizione delle interfacce
interface DomainConfigProps {
  currentDomain?: string;
  onSave: (config: DomainConfig) => void;
}

interface DomainConfig {
  type: 'cname' | 'a-record';
  domain: string;
  subdomain?: string;
}

const DomainSettings: React.FC<DomainConfigProps> = ({ currentDomain, onSave }) => {
  const [configType, setConfigType] = useState<'cname' | 'a-record'>('cname');
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  // Dati di esempio per le impostazioni DNS
  const cnameTarget = "your-app.replit.app";
  const aRecordIPv4 = "34.142.150.121";
  const aRecordIPv6 = "2604:1380:4123:3300::";

  // Funzione per copiare il testo negli appunti
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      toast({
        title: "Copiato!",
        description: "Il valore è stato copiato negli appunti.",
      });
      
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Gestisce il salvataggio della configurazione
  const handleSave = () => {
    if (!domain) {
      toast({
        title: "Errore di validazione",
        description: "Il dominio è obbligatorio.",
        variant: "destructive",
      });
      return;
    }

    onSave({
      type: configType,
      domain,
      subdomain: subdomain || undefined
    });
  };

  // Costruisci il dominio completo
  const getFullDomain = () => {
    if (!subdomain) return domain;
    return `${subdomain}.${domain}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configurazione Dominio Personalizzato</CardTitle>
        <CardDescription>
          Configura il tuo dominio personalizzato per l'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="domain-info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="domain-info">Informazioni Dominio</TabsTrigger>
            <TabsTrigger value="cname-setup">Configurazione CNAME</TabsTrigger>
            <TabsTrigger value="a-record-setup">Configurazione Record A/AAAA</TabsTrigger>
          </TabsList>
          
          <TabsContent value="domain-info" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="domain">Dominio</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    id="domain" 
                    placeholder="esempio.it" 
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Inserisci il tuo dominio principale senza www o sottodomini
                </p>
              </div>
              
              <div>
                <Label htmlFor="subdomain">Sottodominio (opzionale)</Label>
                <div className="flex gap-2 mt-1 items-center">
                  <Input 
                    id="subdomain" 
                    placeholder="app" 
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                  />
                  <span>.{domain || 'esempio.it'}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Lascia vuoto per utilizzare il dominio principale
                </p>
              </div>
              
              <RadioGroup 
                value={configType} 
                onValueChange={(v) => setConfigType(v as 'cname' | 'a-record')}
                className="mt-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cname" id="cname" />
                  <Label htmlFor="cname" className="font-normal">Configura con CNAME (consigliato)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a-record" id="a-record" />
                  <Label htmlFor="a-record" className="font-normal">Configura con record A e AAAA</Label>
                </div>
              </RadioGroup>
              
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Informazioni sulla configurazione</AlertTitle>
                <AlertDescription>
                  Una volta configurato il dominio, potrebbero essere necessarie fino a 24 ore perché le modifiche DNS abbiano effetto.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          <TabsContent value="cname-setup" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="font-semibold text-blue-800">Configurazione CNAME</h3>
              <p className="text-sm">
                Aggiungi un record CNAME nel pannello di controllo del tuo provider DNS. 
                Questo metodo è consigliato perché consente a Replit di gestire automaticamente i certificati SSL.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 border p-4 rounded-md">
                <div className="font-medium">Tipo di Record</div>
                <div className="font-medium">Nome Host</div>
                <div className="font-medium">Valore</div>
                
                <div>CNAME</div>
                <div>
                  {subdomain || '@'}
                  <div className="text-xs text-gray-500">
                    {subdomain ? `(${getFullDomain()})` : '(dominio root)'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="truncate">{cnameTarget}</span>
                  <button 
                    onClick={() => copyToClipboard(cnameTarget, 'cname')}
                    className="inline-flex text-gray-500 hover:text-gray-700"
                  >
                    {copied === 'cname' ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Nota sui domini root</AlertTitle>
                <AlertDescription>
                  Alcuni provider DNS non permettono record CNAME sul dominio root (esempio.it). 
                  In tal caso, usa un sottodominio (app.esempio.it) o configura i record A/AAAA.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          <TabsContent value="a-record-setup" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="font-semibold text-blue-800">Configurazione Record A e AAAA</h3>
              <p className="text-sm">
                Aggiungi i seguenti record A (IPv4) e AAAA (IPv6) nel pannello di controllo del tuo provider DNS.
                Questa opzione è utile se non puoi usare CNAME per il dominio root.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 border p-4 rounded-md">
                <div className="font-medium">Tipo di Record</div>
                <div className="font-medium">Nome Host</div>
                <div className="font-medium">Valore</div>
                
                <div>A</div>
                <div>
                  {subdomain || '@'}
                  <div className="text-xs text-gray-500">
                    {subdomain ? `(${getFullDomain()})` : '(dominio root)'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{aRecordIPv4}</span>
                  <button 
                    onClick={() => copyToClipboard(aRecordIPv4, 'ipv4')}
                    className="inline-flex text-gray-500 hover:text-gray-700"
                  >
                    {copied === 'ipv4' ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                  </button>
                </div>
                
                <div>AAAA</div>
                <div>
                  {subdomain || '@'}
                  <div className="text-xs text-gray-500">
                    {subdomain ? `(${getFullDomain()})` : '(dominio root)'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{aRecordIPv6}</span>
                  <button 
                    onClick={() => copyToClipboard(aRecordIPv6, 'ipv6')}
                    className="inline-flex text-gray-500 hover:text-gray-700"
                  >
                    {copied === 'ipv6' ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  Con questa configurazione, dovrai gestire manualmente il certificato SSL. 
                  Ti consigliamo di utilizzare un servizio come Cloudflare per gestire automaticamente SSL.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>Annulla</Button>
        <Button onClick={handleSave}>Salva Configurazione</Button>
      </CardFooter>
    </Card>
  );
};

export default DomainSettings;