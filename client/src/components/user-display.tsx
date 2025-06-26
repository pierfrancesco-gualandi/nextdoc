import React, { useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserIcon, ChevronDownIcon, LogOutIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UserDisplay() {
  const { selectedUser, clearUserSelection } = useUserContext();

  if (!selectedUser) {
    return null;
  }

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

  const handleChangeUser = () => {
    clearUserSelection();
  };

  return (
    <div className="p-4 border-b border-neutral-light">
      <div 
        className="flex items-center w-full p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={handleChangeUser}
        title="Clicca per cambiare utente"
      >
        <Avatar className="h-8 w-8 mr-3">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-left">
          <p className="font-medium text-sm">{selectedUser.name}</p>
          <p className="text-xs text-gray-500">@{selectedUser.username}</p>
          <span className={`
            inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1
            ${getRoleColor(selectedUser.role)}
          `}>
            {selectedUser.role}
          </span>
        </div>
        
        <LogOutIcon className="h-4 w-4 text-gray-400" />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">Clicca per cambiare utente</p>
    </div>
  );
}