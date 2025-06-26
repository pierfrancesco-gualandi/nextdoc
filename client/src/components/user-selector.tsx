import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckIcon, UserIcon } from 'lucide-react';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export default function UserSelector() {
  const { setSelectedUser } = useUserContext();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
  };

  const handleConfirmSelection = () => {
    if (selectedUserId && users) {
      const selectedUser = users.find(u => u.id === selectedUserId);
      if (selectedUser) {
        setSelectedUser(selectedUser);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'text-red-600 bg-red-50';
      case 'editor':
        return 'text-blue-600 bg-blue-50';
      case 'translator':
        return 'text-green-600 bg-green-50';
      case 'viewer':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              <span className="ml-3">Caricamento utenti...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 max-h-[80vh] overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center">
            <UserIcon className="mr-2 h-6 w-6" />
            Seleziona Utente
          </CardTitle>
          <CardDescription>
            Scegli il tuo profilo utente. Questa selezione rimarrà attiva finché non la cambi manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto px-6">
            <div className="space-y-3">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className={`
                    flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedUserId === user.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleUserSelect(user)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                    <span className={`
                      inline-block px-2 py-1 text-xs font-medium rounded-full mt-1
                      ${getRoleColor(user.role)}
                    `}>
                      {user.role}
                    </span>
                  </div>
                  
                  {selectedUserId === user.id && (
                    <CheckIcon className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-6 border-t">
            <Button 
              onClick={handleConfirmSelection}
              disabled={!selectedUserId}
              className="w-full"
            >
              Conferma Selezione
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}