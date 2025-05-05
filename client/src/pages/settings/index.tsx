import React from 'react';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import {
  Globe,
  Settings as SettingsIcon,
  User,
  Users,
  Shield,
  Bell,
  Database,
  ChevronRight,
  Server
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <SettingsIcon className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Impostazioni</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="general">Generali</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
          <TabsTrigger value="advanced">Avanzate</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsCard
              icon={<Globe className="h-5 w-5" />}
              title="Domini personalizzati"
              description="Configura un dominio personalizzato per la tua applicazione"
              linkTo="/settings/domain"
              linkText="Configura dominio"
            />
            
            <SettingsCard
              icon={<Server className="h-5 w-5" />}
              title="Deploy Applicazione"
              description="Pubblica l'applicazione per renderla accessibile online"
              linkTo="/settings/deploy"
              linkText="Gestisci deploy"
            />
            
            <SettingsCard
              icon={<Database className="h-5 w-5" />}
              title="Backup & Ripristino"
              description="Gestisci i backup del sistema e le operazioni di ripristino"
              linkTo="/settings/backup"
              linkText="Gestisci backup"
            />

            <SettingsCard
              icon={<Shield className="h-5 w-5" />}
              title="Sicurezza"
              description="Gestisci le impostazioni di sicurezza dell'applicazione"
              linkTo="/settings/security"
              linkText="Impostazioni sicurezza"
            />
            
            <SettingsCard
              icon={<Bell className="h-5 w-5" />}
              title="Notifiche"
              description="Configurazione delle notifiche e-mail e di sistema"
              linkTo="/settings/notifications"
              linkText="Gestisci notifiche"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsCard
              icon={<User className="h-5 w-5" />}
              title="Profilo utente"
              description="Gestisci le informazioni del tuo profilo e le preferenze"
              linkTo="/settings/profile"
              linkText="Modifica profilo"
            />
            
            <SettingsCard
              icon={<Shield className="h-5 w-5" />}
              title="Password e autenticazione"
              description="Modifica password e impostazioni di sicurezza"
              linkTo="/settings/auth"
              linkText="Gestisci sicurezza"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="team" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsCard
              icon={<Users className="h-5 w-5" />}
              title="Membri del team"
              description="Gestisci gli utenti e i loro ruoli nell'applicazione"
              linkTo="/settings/team-members"
              linkText="Gestisci team"
            />
            
            <SettingsCard
              icon={<Shield className="h-5 w-5" />}
              title="Permessi e ruoli"
              description="Configura i permessi e i ruoli per i membri del team"
              linkTo="/settings/permissions"
              linkText="Gestisci permessi"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <p className="text-muted-foreground">Impostazioni di notifica non configurate.</p>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsCard
              icon={<Database className="h-5 w-5" />}
              title="Database"
              description="Gestisci impostazioni del database e manutenzione"
              linkTo="/settings/database"
              linkText="Configura database"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo: string;
  linkText: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ 
  icon, 
  title, 
  description, 
  linkTo, 
  linkText 
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="pt-2">
        <Link href={linkTo}>
          <Button variant="outline" className="w-full justify-between">
            {linkText}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default SettingsPage;