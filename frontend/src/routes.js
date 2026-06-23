import React from 'react'

// Páginas de IBM OfficeSpace (carga diferida)
const DashboardOcupacion = React.lazy(() => import('./views/officespace/DashboardOcupacion'))
const Buscar = React.lazy(() => import('./views/officespace/Buscar'))
const ConfirmarReserva = React.lazy(() => import('./views/officespace/ConfirmarReserva'))
const MisReservas = React.lazy(() => import('./views/officespace/MisReservas'))
const Asistente = React.lazy(() => import('./views/officespace/Asistente'))
const Analiticas = React.lazy(() => import('./views/officespace/Analiticas'))
const GestionEspacios = React.lazy(() => import('./views/admin/GestionEspacios'))

// nameKey -> clave i18n para el breadcrumb. adminOnly -> requiere rol ADMINISTRADOR.
export const routes = [
  { path: '/dashboard', nameKey: 'nav.dashboard', element: DashboardOcupacion, adminOnly: true },
  { path: '/buscar', nameKey: 'nav.search', element: Buscar },
  { path: '/reservar', nameKey: 'booking.title', element: ConfirmarReserva },
  { path: '/mis-reservas', nameKey: 'nav.myBookings', element: MisReservas },
  { path: '/asistente', nameKey: 'nav.assistant', element: Asistente },
  { path: '/analiticas', nameKey: 'nav.analytics', element: Analiticas, adminOnly: true },
  { path: '/admin/espacios', nameKey: 'nav.spaces', element: GestionEspacios, adminOnly: true },
]

export default routes
