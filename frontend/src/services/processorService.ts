import { processorAPI } from './api';
import type { TransferRequest, Transaction, TransactionHistory } from '@/types/transaction.types';
import type { HealthCheck } from '@/types/api.types';

export const processorService = {
  // Realizar transferencia
  async transfer(data: TransferRequest): Promise<Transaction> {
    const response = await processorAPI.post<Transaction>('/api/transfer', data);
    return response.data;
  },

  // Obtener historial de transacciones
  async getTransactionHistory(userId: number): Promise<TransactionHistory[]> {
    const response = await processorAPI.get<TransactionHistory[]>(
      `/api/transactions/${userId}`
    );
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<HealthCheck> {
    const response = await processorAPI.get<HealthCheck>('/health');
    return response.data;
  },
};

// Made with Bob
