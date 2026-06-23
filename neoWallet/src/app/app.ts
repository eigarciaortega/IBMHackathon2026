import { Component } from '@angular/core';
import { WalletComponent } from '@features/wallet/wallet.component';

@Component({
  selector: 'app-root',
  imports: [WalletComponent],
  template: '<app-wallet />',
})
export class App {}
