import React, { useState } from 'react';
import { DollarSign, Send, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNotification } from '@/contexts/NotificationContext';
import { processorService } from '@/services/processorService';
import { Button, Input } from '@/components/common';
import { AVAILABLE_USERS, AMOUNT_LIMITS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

interface TransferFormProps {
  onSuccess?: () => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({ onSuccess }) => {
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { currentUser, refreshBalance } = useApp();
  const { success, error, warning } = useNotification();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const numAmount = parseFloat(amount);
    const numReceiverId = parseInt(receiverId);

    if (!receiverId) {
      newErrors.receiverId = 'Selecciona un destinatario';
    } else if (numReceiverId === currentUser?.id) {
      newErrors.receiverId = 'No puedes transferirte a ti mismo';
    }

    if (!amount) {
      newErrors.amount = 'El monto es requerido';
    } else if (isNaN(numAmount)) {
      newErrors.amount = 'Ingresa un monto válido';
    } else if (numAmount < AMOUNT_LIMITS.MIN) {
      newErrors.amount = `El monto mínimo es ${formatCurrency(AMOUNT_LIMITS.MIN)}`;
    } else if (currentUser && numAmount > currentUser.balance) {
      newErrors.amount = 'Fondos insuficientes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !currentUser) return;

    setLoading(true);
    try {
      const result = await processorService.transfer({
        sender_id: currentUser.id,
        receiver_id: parseInt(receiverId),
        amount: parseFloat(amount),
      });
      
      if (result.status === 'COMPLETED') {
        success(`Transferencia exitosa: ${formatCurrency(parseFloat(amount))}`);
      } else if (result.status === 'ROLLED_BACK') {
        warning('Transferencia revertida. Intenta nuevamente.');
      }
      
      await refreshBalance();
      setReceiverId('');
      setAmount('');
      onSuccess?.();
    } catch (err: any) {
      if (err.statusCode === 409) {
        error('Fondos insuficientes para completar la transferencia');
      } else if (err.statusCode === 422) {
        warning('La transferencia fue revertida automáticamente');
      } else {
        error(err.message || 'Error al realizar la transferencia');
      }
    } finally {
      setLoading(false);
    }
  };

  const availableReceivers = AVAILABLE_USERS.filter(
    (user) => user.id !== currentUser?.id
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Destinatario
        </label>
        <div className="relative">
          <Send className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            disabled={loading}
            className={`
              w-full pl-10 pr-4 py-2 rounded-lg border
              ${errors.receiverId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-white
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
          >
            <option value="">Selecciona un usuario</option>
            {availableReceivers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        {errors.receiverId && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.receiverId}</p>
        )}
      </div>

      <Input
        type="number"
        step="0.01"
        label="Monto a transferir"
        placeholder="50.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        icon={<DollarSign className="w-5 h-5" />}
        disabled={loading}
      />

      {currentUser && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Saldo disponible: <span className="font-semibold">{formatCurrency(currentUser.balance)}</span>
          </p>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Transferencia Instantánea
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
              La transferencia se procesará inmediatamente y no podrá ser revertida.
            </p>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        loading={loading} 
        disabled={!currentUser}
        className="w-full"
      >
        Transferir
      </Button>
    </form>
  );
};

// Made with Bob
