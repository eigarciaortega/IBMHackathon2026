import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '@models/user.model';
import { RechargeResponse, Transaction } from '@models/transaction.model';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);

  getAllUsers() {
    return this.http.get<User[]>('/accounts');
  }

  getUser(publicId: string) {
    return this.http.get<User>(`/accounts/${publicId}`);
  }

  recharge(userId: string, amount: number, paymentMethod: string) {
    return this.http.post<RechargeResponse>('/api/recharge', {
      user_id: userId,
      amount,
      payment_method: paymentMethod,
    });
  }

  transfer(senderId: string, receiverId: string, amount: number) {
    return this.http.post('/api/transfer', {
      sender_id: senderId,
      receiver_id: receiverId,
      amount,
    });
  }

  getTransactions(userId: string) {
    return this.http.get<Transaction[]>(`/api/transactions/${userId}`);
  }
}
