import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Globe, Server, ArrowRight } from 'lucide-react';

// Define the domain configuration interface
interface DomainConfig {
  type: 'cname' | 'a-record';
  domain: string;
  subdomain?: string;
}

interface DomainConfigProps {
  currentDomain?: string;
  onSave: (config: DomainConfig) => void;
}

// Schema di validazione per la configurazione del dominio
const cnameSchema = z.object({
  type: z.literal('cname'),
  domain: z
    .string()
    .min(3, { message: 'Il dominio deve avere almeno 3 caratteri' })
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, {
      message: 'Inserisci un dominio valido (esempio: miodominio.com)',
    }),
  subdomain: z.string().optional(),
});

const aRecordSchema = z.object({
  type: z.literal('a-record'),
  domain: z
    .string()
    .min(3, { message: 'Il dominio deve avere almeno 3 caratteri' })
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, {
      message: 'Inserisci un dominio valido (esempio: miodominio.com)',
    }),
});

const domainSchema = z.discriminatedUnion('type', [cnameSchema, aRecordSchema]);

export default function DomainSettings({ currentDomain, onSave }: DomainConfigProps) {
  const [activeTab, setActiveTab] = useState<'cname' | 'a-record'>('cname');

  // Setup the form with React Hook Form
  const form = useForm<z.infer<typeof domainSchema>>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      type: 'cname',
      domain: '',
      subdomain: '',
    },
  });

  // Handle form submissions
  const onSubmit = (values: z.infer<typeof domainSchema>) => {
    console.log('Form values:', values);
    onSave(values);
  };

  // Update validation schema when tab changes
  const handleTabChange = (value: string) => {
    if (value === 'cname' || value === 'a-record') {
      setActiveTab(value);
      form.setValue('type', value);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configurazione Dominio Personalizzato
        </CardTitle>
        <CardDescription>
          Collega il tuo dominio personalizzato all'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="cname">CNAME (Sottodominio)</TabsTrigger>
                <TabsTrigger value="a-record">Record A (Dominio)</TabsTrigger>
              </TabsList>

              <TabsContent value="cname" className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-md text-blue-800 border border-blue-200 mb-4">
                  <h3 className="font-medium mb-2">Configurazione CNAME (Consigliato)</h3>
                  <p className="text-sm mb-2">
                    Questa configurazione è consigliata per la maggior parte degli utenti e permette
                    di utilizzare un sottodominio (es. <strong>app.tuodominio.com</strong>).
                  </p>
                  <div className="text-sm space-y-2">
                    <p className="font-medium">Passaggi da seguire:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Inserisci il tuo dominio principale (es. tuodominio.com)</li>
                      <li>Specifica un sottodominio (es. app)</li>
                      <li>
                        Nel pannello di controllo del tuo provider DNS, crea un record CNAME che
                        punti a <code className="bg-blue-100 px-1 rounded">tecnocart-vks.replit.app</code>
                      </li>
                    </ol>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dominio Principale</FormLabel>
                      <FormControl>
                        <Input placeholder="miodominio.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Inserisci il tuo dominio principale senza www o http://
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sottodominio</FormLabel>
                      <FormControl>
                        <Input placeholder="app" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lascia vuoto per usare www come sottodominio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                  <h4 className="font-medium text-sm mb-2">Dopo il salvataggio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="font-medium mb-1">Record Type</div>
                      <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                        CNAME
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Host / Name</div>
                      <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                        {form.watch('subdomain') || 'www'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Target / Value</div>
                      <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                        tecnocart-vks.replit.app
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="a-record" className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-md text-amber-800 border border-amber-200 mb-4">
                  <h3 className="font-medium mb-2">Configurazione Record A/AAAA</h3>
                  <p className="text-sm mb-2">
                    Questa configurazione è adatta per domini root (senza sottodominio) o per casi
                    speciali. Richiede più configurazione rispetto al CNAME.
                  </p>
                  <div className="text-sm space-y-2">
                    <p className="font-medium">Passaggi da seguire:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Inserisci il tuo dominio principale (es. tuodominio.com)</li>
                      <li>
                        Nel pannello di controllo del tuo provider DNS, crea un record A che
                        punti a <code className="bg-amber-100 px-1 rounded">34.86.24.195</code>
                      </li>
                      <li>
                        Aggiungi anche un record AAAA che punti a <code className="bg-amber-100 px-1 rounded">2600:1f16:d72:3e01:9c91:6a2a:d361:eac4</code>
                      </li>
                    </ol>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dominio</FormLabel>
                      <FormControl>
                        <Input placeholder="miodominio.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Inserisci il tuo dominio senza www, http:// o https://
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                  <h4 className="font-medium text-sm mb-2">Dopo il salvataggio</h4>
                  <p className="text-sm mb-4">Configura questi record DNS presso il tuo provider:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="font-medium text-sm mb-2">Record IPv4 (A)</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                          <div className="font-medium mb-1">Record Type</div>
                          <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                            A
                          </div>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Host / Name</div>
                          <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                            @
                          </div>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Target / Value</div>
                          <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                            34.86.24.195
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-sm mb-2">Record IPv6 (AAAA)</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                          <div className="font-medium mb-1">Record Type</div>
                          <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                            AAAA
                          </div>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Host / Name</div>
                          <div className="font-mono bg-white p-2 rounded border text-neutral-700">
                            @
                          </div>
                        </div>
                        <div>
                          <div className="font-medium mb-1">Target / Value</div>
                          <div className="font-mono bg-white p-2 rounded border text-neutral-700 overflow-x-auto">
                            2600:1f16:d72:3e01:9c91:6a2a:d361:eac4
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button type="submit" className="flex items-center gap-1">
                Salva Configurazione
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}