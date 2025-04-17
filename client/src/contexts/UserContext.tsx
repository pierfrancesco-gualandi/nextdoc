import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UserContextType {
  currentUserId: number;
  currentUserRole: string;
  displayName: string;
  userBadgeColor: string;
  setUserDetails: (userId: number, userRole: string, displayName: string, badgeColor: string) => void;
}

const defaultContext: UserContextType = {
  currentUserId: 1,
  currentUserRole: 'reader',
  displayName: '',
  userBadgeColor: '#3b82f6',
  setUserDetails: () => {},
};

const UserContext = createContext<UserContextType>(defaultContext);

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUserId, setCurrentUserId] = useState<number>(
    parseInt(sessionStorage.getItem('selectedUserId') || '1')
  );
  const [currentUserRole, setCurrentUserRole] = useState<string>(
    sessionStorage.getItem('selectedUserRole') || 'reader'
  );
  const [displayName, setDisplayName] = useState<string>(
    sessionStorage.getItem('selectedUserName') || ''
  );
  const [userBadgeColor, setUserBadgeColor] = useState<string>(
    sessionStorage.getItem('selectedUserColor') || '#3b82f6'
  );

  // Carica gli utenti dal server
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Se non abbiamo un nome utente ma abbiamo un ID, proviamo a ottenerlo dagli utenti
  useEffect(() => {
    if (!displayName && users && Array.isArray(users) && currentUserId) {
      const user = users.find((user: any) => user.id === currentUserId);
      if (user) {
        setDisplayName(user.name || user.username);
        setCurrentUserRole(user.role);
        
        // Imposta il colore predefinito in base al ruolo
        const roleColors: Record<string, string> = {
          'admin': '#3b82f6',  // blu
          'editor': '#16a34a',  // verde
          'translator': '#ca8a04',  // giallo
          'reader': '#db2777',  // rosa
        };
        
        setUserBadgeColor(roleColors[user.role] || '#3b82f6');
        
        // Salva nel sessionStorage
        sessionStorage.setItem('selectedUserId', currentUserId.toString());
        sessionStorage.setItem('selectedUserRole', user.role);
        sessionStorage.setItem('selectedUserName', user.name || user.username);
        sessionStorage.setItem('selectedUserColor', roleColors[user.role] || '#3b82f6');
      }
    }
  }, [users, currentUserId, displayName]);

  const setUserDetails = (userId: number, userRole: string, name: string, badgeColor: string) => {
    setCurrentUserId(userId);
    setCurrentUserRole(userRole);
    setDisplayName(name);
    setUserBadgeColor(badgeColor);

    // Salva nel sessionStorage
    sessionStorage.setItem('selectedUserId', userId.toString());
    sessionStorage.setItem('selectedUserRole', userRole);
    sessionStorage.setItem('selectedUserName', name);
    sessionStorage.setItem('selectedUserColor', badgeColor);
  };

  return (
    <UserContext.Provider
      value={{
        currentUserId,
        currentUserRole,
        displayName,
        userBadgeColor,
        setUserDetails,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};