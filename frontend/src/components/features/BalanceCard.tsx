import React from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { Card } from '@/components/common';

export const BalanceCard: React.FC = () => {
  const { currentUser, refreshBalance, loading } = useApp();

  return (
    <Card className="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <p className="text-sm opacity-90">Saldo Disponible</p>
          </div>
          
          <motion.h2 
            key={currentUser?.balance}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-bold mb-1"
          >
            {currentUser ? formatCurrency(currentUser.balance) : '$0.00'}
          </motion.h2>
          
          <p className="text-sm opacity-75">{currentUser?.name}</p>
          <p className="text-xs opacity-60 mt-1">{currentUser?.email}</p>
        </div>
        
        <button
          onClick={refreshBalance}
          disabled={loading}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          title="Actualizar saldo"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs opacity-75">
          Última actualización: {new Date().toLocaleTimeString('es-ES')}
        </p>
      </div>
    </Card>
  );
};

// Made with Bob
