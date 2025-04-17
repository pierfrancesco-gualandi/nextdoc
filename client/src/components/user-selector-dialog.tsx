import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';

interface UserSelectorDialogProps {
  isOpen: boolean;
  onClose: (userId: number, userRole: string) => void;
}

export default function UserSelectorDialog({ isOpen, onClose }: UserSelectorDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string>('');

  // Carica tutti gli utenti disponibili
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Aggiorna il ruolo quando viene selezionato un utente
  useEffect(() => {
    if (selectedUserId && users) {
      const user = users.find((user: any) => user.id === selectedUserId);
      if (user) {
        setSelectedUserRole(user.role);
      }
    }
  }, [selectedUserId, users]);

  // Gestisce la selezione di un utente
  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
  };

  // Gestisce la chiusura del dialog
  const handleConfirm = () => {
    if (selectedUserId) {
      onClose(selectedUserId, selectedUserRole);
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
          <div className="py-4">
            <RadioGroup value={selectedUserId?.toString()} onValueChange={(value) => handleUserSelect(parseInt(value))}>
              <div className="space-y-2">
                {users && users.map((user: any) => (
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
          </div>
        )}
        
        <DialogFooter>
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