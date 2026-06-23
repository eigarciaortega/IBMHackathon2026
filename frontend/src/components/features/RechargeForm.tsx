import React, { useState } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNotification } from '@/contexts/NotificationContext';
import { accountsService } from '@/services/accountsService';
import { Button, Input } from '@/components/common';
import { AMOUNT_LIMITS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

interface RechargeFormProps {
  onSuccess?: () => void;
}

export const RechargeForm: React.FC<RechargeFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { currentUser, refreshBalance } = useApp();
  const { success, error } = useNotification();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const numAmount = parseFloat(amount);

    if (!amount) {
      newErrors.amount = 'El monto es requerido';
    } else if (isNaN(numAmount)) {
      newErrors.amount = 'Ingresa un monto válido';
    } else if (numAmount < AMOUNT_LIMITS.MIN) {
      newErrors.amount = `El monto mínimo es ${formatCurrency(AMOUNT_LIMITS.MIN)}`;
    } else if (numAmount > AMOUNT_LIMITS.MAX_RECHARGE) {
      newErrors.amount = `El monto máximo es ${formatCurrency(AMOUNT_LIMITS.MAX_RECHARGE)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !currentUser) return;

    setLoading(true);
    try {
      await accountsService.recharge({
        user_id: currentUser.id,
        amount: parseFloat(amount),
        payment_method: 'credit_card',
      });
      
      success(`Recarga exitosa: +${formatCurrency(parseFloat(amount))}`);
      await refreshBalance();
      setAmount('');
      onSuccess?.();
    } catch (err: any) {
      error(err.message || 'Error al recargar saldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="number"
        step="0.01"
        label="Monto a recargar"
        placeholder="100.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        icon={<DollarSign className="w-5 h-5" />}
        disabled={loading}
      />
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Recarga Simulada
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              No se procesará ningún pago real. Esta es una demostración del sistema.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Límites: {formatCurrency(AMOUNT_LIMITS.MIN)} - {formatCurrency(AMOUNT_LIMITS.MAX_RECHARGE)}
        </p>
      </div>

      <Button 
        type="submit" 
        loading={loading} 
        disabled={!currentUser}
        className="w-full"
      >
        Recargar Saldo
      </Button>
    </form>
  );
};

// Made with Bob
