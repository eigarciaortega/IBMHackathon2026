// Tipos de dominio compartidos por toda la SPA.

export type Rol = 'ADMINISTRADOR' | 'COLABORADOR'

export interface Usuario {
  email: string
  rol: Rol
  nombre: string
}

export interface LoginResponse {
  token: string
  rol: Rol
}

export type TipoEspacio = 'SALA' | 'DESK'

export interface Espacio {
  id: number
  nombre: string
  tipo: TipoEspacio
  capacidad: number
  tiene_proyector: boolean
  tiene_aire: boolean
  piso: string
  creado_en: string
}

export interface EspacioInput {
  nombre: string
  tipo: TipoEspacio
  capacidad: number
  tiene_proyector: boolean
  tiene_aire: boolean
  piso: string
}

export type EstadoReserva = 'CONFIRMADA' | 'CANCELADA'

export interface Reserva {
  id: number
  espacio_id: number
  usuario_email: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  asistentes: number
  estado: EstadoReserva
  creado_en: string
}

export interface CrearReservaInput {
  espacio_id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  asistentes: number
}

export interface Disponibilidad {
  espacio_id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  disponible: boolean
}

export type TipoNotificacion =
  | 'RESERVA_CREADA'
  | 'RESERVA_CANCELADA'
  | 'ESPACIO_CREADO'
  | 'ESPACIO_ACTUALIZADO'
  | 'ESPACIO_ELIMINADO'

export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  mensaje: string
  actor_email: string
  recurso: string
  leida: boolean
  creado_en: string
}

export interface ListaNotificaciones {
  notificaciones: Notificacion[]
  no_leidas: number
}
