import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { NotificationService } from '@core/services/notification';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './layout.html'
})
export class Layout {
  protected auth = inject(AuthService);
  protected notif = inject(NotificationService);
  protected showNotifPanel = signal(false);

  toggleNotifPanel(): void {
    this.showNotifPanel.update(v => !v);
  }

  closeNotifPanel(): void {
    this.showNotifPanel.set(false);
  }
}
