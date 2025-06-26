import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getAuthenticatedUser, clearAuthenticatedUser } from '@/lib/auth';

// Tipo per l'utente autenticato (senza password)
export interface AuthenticatedUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions: unknown;
}

interface UserContextType {
  selectedUser: AuthenticatedUser | null;
  setSelectedUser: (user: AuthenticatedUser | null) => void;
  isUserSelected: boolean;
  clearUserSelection: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Inizializza dall'utente autenticato
  const [selectedUser, setSelectedUserState] = useState<AuthenticatedUser | null>(() => {
    const authenticatedUser = getAuthenticatedUser();
    if (authenticatedUser) {
      console.log('Utente autenticato ripristinato:', authenticatedUser);
      return authenticatedUser;
    }
    
    // Fallback per retrocompatibilità con il vecchio sistema
    try {
      const savedUser = sessionStorage.getItem('selectedUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        console.log('Utente ripristinato dal sessionStorage:', user);
        return user;
      }
    } catch (error) {
      console.error('Errore nel ripristino dell\'utente:', error);
      sessionStorage.removeItem('selectedUser');
    }
    return null;
  });

  // Funzione per impostare l'utente selezionato
  const setSelectedUser = (user: AuthenticatedUser | null) => {
    setSelectedUserState(user);
    if (user) {
      sessionStorage.setItem('selectedUser', JSON.stringify(user));
      console.log('Utente selezionato e salvato:', user);
    } else {
      sessionStorage.removeItem('selectedUser');
      clearAuthenticatedUser();
      console.log('Selezione utente cancellata');
    }
  };

  // Funzione per cancellare la selezione utente
  const clearUserSelection = () => {
    setSelectedUser(null);
  };

  const isUserSelected = selectedUser !== null;
  const isAuthenticated = getAuthenticatedUser() !== null;

  return (
    <UserContext.Provider 
      value={{ 
        selectedUser, 
        setSelectedUser, 
        isUserSelected,
        clearUserSelection
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext deve essere usato all\'interno di un UserProvider');
  }
  return context;
};

// Alias per compatibilità con codice esistente
export const useUser = useUserContext;