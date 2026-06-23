import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideArrowDownLeft,
  LucideArrowUpRight,
  LucideChevronDown,
  LucideHistory,
  LucidePlus,
  LucideSend,
  LucideShield,
  LucideUsers,
  LucideWallet,
  LucideZap,
} from '@lucide/angular';
import { WalletService } from '@core/services/wallet.service';
import { User } from '@models/user.model';
import { Transaction } from '@models/transaction.model';

type Tab = 'transfer' | 'recharge' | 'history';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    LucideSend,
    LucidePlus,
    LucideHistory,
    LucideZap,
    LucideShield,
    LucideWallet,
    LucideUsers,
    LucideChevronDown,
    LucideArrowUpRight,
    LucideArrowDownLeft,
  ],
  templateUrl: './wallet.component.html',
})
export class WalletComponent implements OnInit {
  private walletService = inject(WalletService);

  // API data
  allUsers = signal<User[]>([]);
  currentUser = signal<User | null>(null);
  transactions = signal<Transaction[]>([]);

  // UI state
  activeTab = signal<Tab>('transfer');
  showUserDropdown = signal(false);
  loading = signal(false);
  initialLoading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Form state (plain properties — two-way bound with ngModel)
  recipientId = '';
  transferAmount: number | null = null;
  rechargeAmount: number | null = null;
  paymentMethod = 'Tarjeta de crédito';

  readonly quickAmounts = [10, 25, 50, 100];
  readonly paymentMethods = ['Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia bancaria'];

  recipients = computed(() => this.allUsers().filter(u => u.id !== this.currentUser()?.id));

  accountId = computed(() => {
    const idx = this.allUsers().findIndex(u => u.id === this.currentUser()?.id);
    return idx >= 0 ? `#${String(idx + 1).padStart(6, '0')}` : '#------';
  });

  @HostListener('document:click')
  onDocumentClick() {
    this.showUserDropdown.set(false);
  }

  ngOnInit() {
    this.walletService.getAllUsers().subscribe({
      next: users => {
        this.allUsers.set(users);
        if (users.length > 0) this.currentUser.set(users[0]);
        this.initialLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servidor. Verifica que los servicios estén activos.');
        this.initialLoading.set(false);
      },
    });
  }

  toggleUserDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showUserDropdown.update(v => !v);
  }

  selectUser(user: User) {
    this.currentUser.set(user);
    this.showUserDropdown.set(false);
    this.error.set(null);
    this.success.set(null);
    this.transactions.set([]);
    if (this.activeTab() === 'history') {
      this.loadTransactions(user.id);
    }
  }

  setActiveTab(tab: Tab) {
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
    if (tab === 'history' && this.currentUser()) {
      this.loadTransactions(this.currentUser()!.id);
    }
  }

  loadTransactions(userId: string) {
    this.walletService.getTransactions(userId).subscribe({
      next: txs => this.transactions.set(txs),
    });
  }

  transfer() {
    const user = this.currentUser();
    if (!user || !this.recipientId || !this.transferAmount || this.transferAmount <= 0) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.walletService.transfer(user.id, this.recipientId, this.transferAmount).subscribe({
      next: () => {
        this.success.set('¡Transferencia completada con éxito!');
        this.recipientId = '';
        this.transferAmount = null;
        this.refreshBalance();
        setTimeout(() => this.success.set(null), 5000);
      },
      error: err => {
        this.error.set(err.error?.message || 'Error al procesar la transferencia.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  recharge() {
    const user = this.currentUser();
    if (!user || !this.rechargeAmount || this.rechargeAmount <= 0) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.walletService.recharge(user.id, this.rechargeAmount, this.paymentMethod).subscribe({
      next: res => {
        this.success.set(`¡Recarga exitosa! Nuevo saldo: $${res.new_balance.toFixed(2)}`);
        this.rechargeAmount = null;
        this.currentUser.update(u => (u ? { ...u, balance: res.new_balance } : u));
        this.allUsers.update(users =>
          users.map(u => (u.id === user.id ? { ...u, balance: res.new_balance } : u))
        );
        setTimeout(() => this.success.set(null), 5000);
      },
      error: err => {
        this.error.set(err.error?.message || 'Error al procesar la recarga.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  addQuickAmount(amount: number) {
    this.rechargeAmount = (this.rechargeAmount ?? 0) + amount;
  }

  refreshBalance() {
    const currentId = this.currentUser()?.id;
    this.walletService.getAllUsers().subscribe({
      next: users => {
        this.allUsers.set(users);
        if (currentId) {
          const updated = users.find(u => u.id === currentId);
          if (updated) this.currentUser.set(updated);
        }
      },
    });
  }

  counterpartyName(id: string): string {
    return this.allUsers().find(u => u.id === id)?.name ?? id.slice(0, 8) + '…';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
