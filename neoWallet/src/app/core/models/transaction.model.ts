export interface Transaction {
  id: string;
  type: 'sent' | 'received';
  counterparty_id: string;
  amount: number;
  status: 'PENDING' | 'DEBITED' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  created_at: string;
}

export interface RechargeResponse {
  user_id: string;
  new_balance: number;
  message: string;
}
