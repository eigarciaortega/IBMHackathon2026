export type TransactionStatus = 
  | 'PENDING' 
  | 'DEBITED' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'ROLLED_BACK';

export type TransactionType = 'sent' | 'received' | 'recharge';

export interface Transaction {
  id: number;
  sender_id: number;
  receiver_id: number;
  amount: number;
  status: TransactionStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionHistory {
  id: number;
  type: TransactionType;
  amount: number;
  counterparty?: string;
  counterparty_id?: number;
  status: TransactionStatus;
  timestamp: string;
}

export interface TransferRequest {
  sender_id: number;
  receiver_id: number;
  amount: number;
}

export interface RechargeRequest {
  user_id: number;
  amount: number;
  payment_method: string;
}

// Made with Bob
