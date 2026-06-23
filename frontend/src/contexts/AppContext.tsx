import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types/user.types';
import { accountsService } from '@/services/accountsService';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  refreshBalance: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshBalance = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const updatedUser = await accountsService.getAccount(currentUser.id);
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]); // Only depend on user ID to avoid infinite loops

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, refreshBalance, loading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Made with Bob
