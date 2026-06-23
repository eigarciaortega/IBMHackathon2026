import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth-guard';
import { adminGuard } from '@core/guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('@pages/login/login').then(m => m.Login)
  },
  {
    path: '',
    loadComponent: () => import('@core/layout/layout').then(m => m.Layout),
    canActivate: [authGuard],
    children: [
      {
        path: 'search',
        loadComponent: () => import('@pages/search/search').then(m => m.Search)
      },
      {
        path: 'my-bookings',
        loadComponent: () => import('@pages/my-bookings/my-bookings').then(m => m.MyBookings)
      },
      {
        path: 'admin',
        loadComponent: () => import('@pages/admin/admin').then(m => m.Admin),
        canActivate: [adminGuard]
      }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
