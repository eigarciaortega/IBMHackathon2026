/**
 * Usuarios disponibles en el sistema (seed data)
 */
export const AVAILABLE_USERS = [
  { id: 1, name: 'María García', email: 'maria.garcia@neowallet.com' },
  { id: 2, name: 'Carlos Rodríguez', email: 'carlos.rodriguez@neowallet.com' },
  { id: 3, name: 'Ana Martínez', email: 'ana.martinez@neowallet.com' },
];

/**
 * Mapeo de códigos de error HTTP a mensajes de usuario
 */
export const ERROR_MESSAGES: Record<number, string> = {
  400: 'Datos inválidos. Por favor verifica la información.',
  404: 'Usuario no encontrado.',
  409: 'Fondos insuficientes para completar la operación.',
  422: 'La transferencia fue revertida. Intenta nuevamente.',
  503: 'Servicio temporalmente no disponible. Por favor intenta más tarde.',
};

/**
 * Mensaje de error por defecto
 */
export const DEFAULT_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intenta nuevamente.';

/**
 * Límites de montos
 */
export const AMOUNT_LIMITS = {
  MIN: 0.01,
  MAX_RECHARGE: 10000,
  MAX_TRANSFER: 1000000,
};

/**
 * Configuración de auto-refresh
 */
export const AUTO_REFRESH_INTERVAL = 30000; // 30 segundos

/**
 * Métodos de pago disponibles
 */
export const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'debit_card', label: 'Tarjeta de Débito' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
];

// Made with Bob
