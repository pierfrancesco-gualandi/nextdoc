import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface UserContextType {
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  isUserSelected: boolean;
  clearUserSelection: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedUser, setSelectedUserState] = useState<User | null>(null);

  // Carica l'utente selezionato dal sessionStorage all'avvio
  useEffect(() => {
    const savedUser = sessionStorage.getItem('selectedUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setSelectedUserState(user);
        console.log('Utente ripristinato dal sessionStorage:', user);
      } catch (error) {
        console.error('Errore nel ripristino dell\'utente:', error);
        sessionStorage.removeItem('selectedUser');
      }
    }
  }, []);

  // Funzione per impostare l'utente selezionato (solo al primo accesso)
  const setSelectedUser = (user: User | null) => {
    setSelectedUserState(user);
    if (user) {
      sessionStorage.setItem('selectedUser', JSON.stringify(user));
      console.log('Utente selezionato e salvato:', user);
    } else {
      sessionStorage.removeItem('selectedUser');
      console.log('Selezione utente cancellata');
    }
  };

  // Funzione per cancellare la selezione utente
  const clearUserSelection = () => {
    setSelectedUser(null);
  };

  const isUserSelected = selectedUser !== null;

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