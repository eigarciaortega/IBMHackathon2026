import { accountsAPI } from './api';
import type { User } from '@/types/user.types';
import type { RechargeRequest } from '@/types/transaction.types';
import type { HealthCheck } from '@/types/api.types';

export const accountsService = {
  // Obtener información de usuario
  async getAccount(userId: number): Promise<User> {
    const response = await accountsAPI.get<User>(`/accounts/${userId}`);
    return response.data;
  },

  // Recargar saldo
  async recharge(data: RechargeRequest): Promise<User> {
    const response = await accountsAPI.post<User>('/api/recharge', data);
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<HealthCheck> {
    const response = await accountsAPI.get<HealthCheck>('/health');
    return response.data;
  },
};

// Made with Bob
