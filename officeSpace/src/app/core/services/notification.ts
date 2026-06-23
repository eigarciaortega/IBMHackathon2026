import { Injectable, signal } from '@angular/core';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface AppNotification {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<AppNotification[]>([]);
  history = signal<AppNotification[]>([]);

  private abortController?: AbortController;
  private readonly SSE_URL = 'http://localhost:8082/api/notifications/subscribe';

  connect(token: string): void {
    this.disconnect();
    this.abortController = new AbortController();

    fetchEventSource(this.SSE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: this.abortController.signal,
      onmessage: (event) => {
        switch (event.event) {
          case 'booking_confirmed':
            this.push('¡Reserva confirmada exitosamente!', 'success');
            break;
          case 'booking_cancelled':
            this.push('Tu reserva ha sido cancelada.', 'warning');
            break;
          case 'space_released':
            this.push('Un espacio se ha liberado — ya está disponible.', 'info');
            break;
          case 'booking_reminder':
            this.push(event.data || 'Tu reserva comienza en 15 minutos.', 'warning');
            break;
        }
      },
      onerror: () => {
        this.abortController?.abort();
      }
    });
  }

  push(message: string, type: AppNotification['type'] = 'info'): void {
    const notif: AppNotification = { id: Date.now(), message, type, timestamp: new Date() };
    this.notifications.update(n => [...n, notif]);
    this.history.update(h => [notif, ...h].slice(0, 20));
    setTimeout(() => this.remove(notif.id), 4000);
  }

  remove(id: number): void {
    this.notifications.update(n => n.filter(x => x.id !== id));
  }

  clearHistory(): void {
    this.history.set([]);
  }

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = undefined;
  }
}
