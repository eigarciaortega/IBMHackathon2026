import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNotification } from '@/contexts/NotificationContext';
import { accountsService } from '@/services/accountsService';
import { AVAILABLE_USERS } from '@/utils/constants';
import { Spinner } from '@/components/common';

export const UserSelector: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();
  const { error } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleUserChange = async (userId: number) => {
    setLoading(true);
    try {
      const user = await accountsService.getAccount(userId);
      setCurrentUser(user);
    } catch (err: any) {
      error(err.message || 'Error al cargar usuario');
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar usuario por defecto al montar
    if (!currentUser) {
      handleUserChange(1);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      <div className="relative">
        <select
          value={currentUser?.id || ''}
          onChange={(e) => handleUserChange(Number(e.target.value))}
          disabled={loading}
          className="
            px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 
            bg-white dark:bg-gray-700 
            text-gray-900 dark:text-white 
            focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            appearance-none cursor-pointer
          "
        >
          {AVAILABLE_USERS.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {loading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Spinner size="sm" className="text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
};

// Made with Bob
