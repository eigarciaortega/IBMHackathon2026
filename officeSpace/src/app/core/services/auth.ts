import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from '@core/models/user.model';
import { NotificationService } from '@core/services/notification';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  private readonly API = 'http://localhost:8083/api/auth';

  currentUser = signal<User | null>(null);

  constructor() {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
      const token = localStorage.getItem('token');
      if (token) this.notificationService.connect(token);
    }
  }

  login(email: string, password: string) {
    return this.http.post<User>(`${this.API}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res));
        this.currentUser.set(res);
        this.notificationService.connect(res.token);
      })
    );
  }

  logout(): void {
    this.notificationService.disconnect();
    localStorage.clear();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'ADMIN';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
