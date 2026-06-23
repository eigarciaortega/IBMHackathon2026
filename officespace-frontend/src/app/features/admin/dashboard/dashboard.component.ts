import { Component, OnInit } from '@angular/core';
import { Booking, DashboardStats } from '../../../core/models/booking.model';
import { BookingsService } from '../../../core/services/bookings.service';

interface Stat { label: string; value: number | string; sub: string; mod: string; }

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  loadingStats = true;
  loadingBookings = true;
  stats: Stat[] = [];
  todayBookings: Booking[] = [];

  constructor(private bookingsService: BookingsService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadTodayBookings();
  }

  private loadStats(): void {
    this.bookingsService.getDashboard().subscribe({
      next: (data: DashboardStats) => {
        this.stats = [
          { label: 'Espacios totales',  value: data.totalSpaces,   sub: 'registrados',                      mod: 'blue'  },
          { label: 'Ocupados hoy',      value: data.occupiedToday, sub: `de ${data.totalSpaces} espacios`,  mod: 'red'   },
          { label: 'Disponibles hoy',   value: data.availableToday,sub: 'libres ahora',                     mod: 'green' },
          { label: 'Reservas hoy',      value: data.bookingsToday, sub: `${data.occupancyRate}% ocupación`, mod: 'gray'  },
        ];
        this.loadingStats = false;
      },
      error: () => {
        this.loadingStats = false;
      },
    });
  }

  private loadTodayBookings(): void {
    this.bookingsService.getTodayBookings().subscribe({
      next: bookings => {
        this.todayBookings = bookings;
        this.loadingBookings = false;
      },
      error: () => {
        this.loadingBookings = false;
      },
    });
  }
}
