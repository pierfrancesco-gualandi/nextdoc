import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, X, User } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserSelectorDialogProps {
  isOpen: boolean;
  onClose: (userId: number, userRole: string, displayName: string, badgeColor: string) => void;
  onCancel?: () => void;  // Nuovo prop per gestire la cancellazione
}

export default function UserSelectorDialog({ isOpen, onClose, onCancel }: UserSelectorDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('#3b82f6'); // Colore blu predefinito
  const [activeTab, setActiveTab] = useState<string>("utente");

  // Carica tutti gli utenti disponibili
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Aggiorna il ruolo e il nome utente quando viene selezionato un utente
  useEffect(() => {
    if (selectedUserId && users && Array.isArray(users)) {
      const user = users.find((user: any) => user.id === selectedUserId);
      if (user) {
        setSelectedUserRole(user.role);
        setDisplayName(user.name || user.username);
        
        // Imposta anche il colore predefinito in base al ruolo
        switch (user.role) {
          case 'admin':
            setCustomColor('#3b82f6'); // blu
            break;
          case 'editor':
            setCustomColor('#16a34a'); // verde
            break;
          case 'translator':
            setCustomColor('#ca8a04'); // giallo
            break;
          case 'reader':
            setCustomColor('#db2777'); // rosa
            break;
          default:
            setCustomColor('#3b82f6'); // blu predefinito
        }
      }
    }
  }, [selectedUserId, users]);

  // Gestisce la selezione di un utente
  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
  };

  // Gestisce la chiusura del dialog con conferma
  const handleConfirm = () => {
    if (selectedUserId) {
      // Assicuriamoci che il displayName non sia vuoto
      const finalDisplayName = displayName.trim() || 
        (users && Array.isArray(users) && selectedUserId ? 
          users.find((user: any) => user.id === selectedUserId)?.name || 
          users.find((user: any) => user.id === selectedUserId)?.username || 
          "Utente"
        : "Utente");
      
      onClose(selectedUserId, selectedUserRole, finalDisplayName, customColor);
    }
  };
  
  // Gestisce la chiusura del dialog senza selezione
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Restituisci il colore del badge in base al ruolo
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-600 text-white';
      case 'editor':
        return 'bg-green-600 text-white';
      case 'translator':
        return 'bg-yellow-600 text-black';
      case 'reader':
        return 'bg-pink-600 text-white';
      default:
        return 'bg-neutral-400 text-white';
    }
  };

  // Restituisci il nome leggibile del ruolo in italiano
  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Amministratore';
      case 'editor':
        return 'Redattore';
      case 'translator':
        return 'Traduttore';
      case 'reader':
        return 'Lettore';
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md">
        {/* Pulsante di chiusura nell'angolo in alto a destra */}
        <button 
          onClick={handleCancel} 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Chiudi</span>
        </button>
        
        <DialogHeader>
          <DialogTitle>Seleziona utente</DialogTitle>
          <DialogDescription>
            Seleziona l'utente con cui vuoi visualizzare il documento. I permessi saranno applicati in base al ruolo dell'utente.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="utente" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="utente">Seleziona Utente</TabsTrigger>
              <TabsTrigger value="personalizza" disabled={!selectedUserId}>Personalizza</TabsTrigger>
            </TabsList>
            
            <TabsContent value="utente" className="space-y-4">
              <RadioGroup value={selectedUserId?.toString()} onValueChange={(value) => handleUserSelect(parseInt(value))}>
                <div className="space-y-2">
                  {users && Array.isArray(users) && users.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between space-x-2 p-2 rounded-md hover:bg-neutral-50">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={user.id.toString()} id={`user-${user.id}`} />
                        <Label htmlFor={`user-${user.id}`} className="cursor-pointer flex-1">
                          <div className="font-medium">{user.name || user.username}</div>
                          <div className="text-sm text-neutral-500">@{user.username}</div>
                        </Label>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleName(user.role)}
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              
              {selectedUserId && (
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={() => setActiveTab("personalizza")}
                    className="text-sm"
                  >
                    Continua
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="personalizza" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="display-name">Nome visualizzato</Label>
                  <Input 
                    id="display-name"
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="badge-color">Colore del badge</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      id="badge-color"
                      type="color" 
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    
                    <div 
                      className="flex items-center gap-2 border rounded-md px-3 py-1 flex-1"
                      style={{ 
                        backgroundColor: `${customColor}20`,
                        borderColor: `${customColor}40`,
                        color: customColor
                      }}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">{displayName}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCustomColor('#3b82f6')}
                      className="flex-1 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    >
                      Blu
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCustomColor('#16a34a')}
                      className="flex-1 bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                    >
                      Verde
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCustomColor('#ca8a04')}
                      className="flex-1 bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100"
                    >
                      Giallo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCustomColor('#db2777')}
                      className="flex-1 bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100"
                    >
                      Rosa
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline"
            onClick={handleCancel}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedUserId}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}