import { Component } from '@angular/core';
import { Booking } from '../../../core/models/booking.model';

interface Stat { label: string; value: number | string; sub: string; mod: string; }

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  stats: Stat[] = [
    { label: 'Espacios totales',    value: 6,     sub: 'registrados',      mod: 'blue'  },
    { label: 'Ocupados hoy',        value: 3,     sub: 'de 6 disponibles', mod: 'red'   },
    { label: 'Disponibles hoy',     value: 3,     sub: 'libres ahora',     mod: 'green' },
    { label: 'Reservas hoy',        value: 5,     sub: 'total del día',    mod: 'gray'  },
  ];

  // Mock data — reemplazar con BookingsService.getAllBookings()
  todayBookings: Booking[] = [
    {
      id: 1, spaceId: 1, spaceName: 'Sala Creativa',
      userId: 2, userName: 'Carlos Méndez',
      date: '2026-06-22', startTime: '09:00', endTime: '10:00',
      attendees: 5, status: 'CONFIRMED', createdAt: '2026-06-22T08:00:00Z',
    },
    {
      id: 2, spaceId: 2, spaceName: 'Sala Ejecutiva',
      userId: 3, userName: 'Ana Torres',
      date: '2026-06-22', startTime: '10:00', endTime: '12:00',
      attendees: 10, status: 'CONFIRMED', createdAt: '2026-06-22T08:30:00Z',
    },
    {
      id: 3, spaceId: 4, spaceName: 'Escritorio Ventana A',
      userId: 2, userName: 'Carlos Méndez',
      date: '2026-06-22', startTime: '13:00', endTime: '17:00',
      attendees: 1, status: 'CONFIRMED', createdAt: '2026-06-22T09:00:00Z',
    },
  ];
}
