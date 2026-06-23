import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  errorMsg = '';
  sessionExpired = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    // Detectar redirección por token expirado
    this.sessionExpired = this.route.snapshot.queryParamMap.get('expired') === '1';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    this.auth.login(this.form.value).subscribe({
      next: res => {
        const dest = res.user.role === 'ADMINISTRADOR' ? '/admin' : '/search';
        this.router.navigate([dest]);
      },
      error: () => {
        this.errorMsg = 'Credenciales inválidas. Por favor verifica e intenta de nuevo.';
        this.loading = false;
      },
    });
  }
}
