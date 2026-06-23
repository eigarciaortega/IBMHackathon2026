import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { environment } from '../../../environments/environment';

interface DemoUser {
  email: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly showDemoUsers = environment.showDemoUsers;

  readonly demoUsers: DemoUser[] = [
    { email: 'admin@corporativoalpha.com', password: 'Admin123', role: 'Administrador' },
    { email: 'carlos.mendez@corporativoalpha.com', password: 'User123', role: 'Colaborador' },
    { email: 'ana.torres@corporativoalpha.com', password: 'User123', role: 'Colaborador' }
  ];

  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  fillDemo(user: DemoUser): void {
    this.email = user.email;
    this.password = user.password;
    this.error.set('');
  }

  onLogin(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/search']),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.error.set('Credenciales incorrectas.');
        } else {
          this.error.set('Error al iniciar sesión. Intenta de nuevo.');
        }
      }
    });
  }
}
