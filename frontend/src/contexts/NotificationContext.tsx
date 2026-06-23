import React, { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface NotificationContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const success = (message: string) => {
    toast.success(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
      },
    });
  };

  const error = (message: string) => {
    toast.error(message, {
      duration: 7000,
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: '#fff',
      },
    });
  };

  const warning = (message: string) => {
    toast(message, {
      icon: '⚠️',
      duration: 6000,
      position: 'top-right',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    });
  };

  const info = (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    });
  };

  return (
    <NotificationContext.Provider value={{ success, error, warning, info }}>
      <Toaster />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

// Made with Bob
