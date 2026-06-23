import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Token expirado o inválido → limpiar sesión y redirigir al login
      if (err.status === 401) {
        authService.clearSession();
        router.navigate(['/auth/login'], {
          queryParams: { expired: '1' },
        });
      }
      return throwError(() => err);
    }),
  );
};
