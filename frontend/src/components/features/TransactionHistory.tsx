import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { processorService } from '@/services/processorService';
import type { TransactionHistory as TransactionType } from '@/types/transaction.types';
import { Card, Spinner } from '@/components/common';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { AVAILABLE_USERS } from '@/utils/constants';

export const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useApp();

  const loadTransactions = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    try {
      const data = await processorService.getTransactionHistory(currentUser.id);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar transacciones');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentUser?.id]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'received':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'recharge':
        return <Plus className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sent':
        return 'text-red-600 dark:text-red-400';
      case 'received':
        return 'text-green-600 dark:text-green-400';
      case 'recharge':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getUserName = (userId?: number): string => {
    if (!userId) return 'Usuario';
    const user = AVAILABLE_USERS.find(u => u.id === userId);
    return user ? user.name : `Usuario #${userId}`;
  };

  const getTransactionLabel = (transaction: TransactionType) => {
    switch (transaction.type) {
      case 'sent':
        return `Enviado a ${getUserName(transaction.counterparty_id)}`;
      case 'received':
        return `Recibido de ${getUserName(transaction.counterparty_id)}`;
      case 'recharge':
        return 'Recarga de saldo';
      default:
        return 'Transacción';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      ROLLED_BACK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      PENDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  if (loading && transactions.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadTransactions}
            className="mt-4 text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Reintentar
          </button>
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No hay transacciones aún
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Realiza tu primera transferencia o recarga
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Transacciones Recientes
        </h3>
        <button
          onClick={loadTransactions}
          disabled={loading}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-full bg-white dark:bg-gray-800">
                {getTransactionIcon(transaction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getTransactionLabel(transaction)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(transaction.timestamp)}
                </p>
              </div>
            </div>

            <div className="text-right ml-4">
              <p className={`text-sm font-semibold ${getTransactionColor(transaction.type)}`}>
                {transaction.type === 'sent' ? '-' : '+'}
                {formatCurrency(transaction.amount)}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(transaction.status)}`}>
                {transaction.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Made with Bob
