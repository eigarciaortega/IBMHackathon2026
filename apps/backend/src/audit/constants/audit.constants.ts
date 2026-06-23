/**
 * Catálogo oficial de eventos auditables (17 — decisión C-04).
 */
export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DISABLE_USER: 'DISABLE_USER',
  CREATE_SPACE: 'CREATE_SPACE',
  UPDATE_SPACE: 'UPDATE_SPACE',
  DISABLE_SPACE: 'DISABLE_SPACE',
  CREATE_BOOKING: 'CREATE_BOOKING',
  CANCEL_BOOKING: 'CANCEL_BOOKING',
  MARK_NO_SHOW: 'MARK_NO_SHOW',
  MARK_ATTENDED: 'MARK_ATTENDED',
  APPROVE_BOOKING: 'APPROVE_BOOKING',
  RELEASE_BOOKING: 'RELEASE_BOOKING',
  CREATE_RESOURCE: 'CREATE_RESOURCE',
  UPDATE_RESOURCE: 'UPDATE_RESOURCE',
  DELETE_RESOURCE: 'DELETE_RESOURCE',
  CREATE_FAQ: 'CREATE_FAQ',
  UPDATE_FAQ: 'UPDATE_FAQ',
  DELETE_FAQ: 'DELETE_FAQ',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditEntity = {
  USER: 'USER',
  SPACE: 'SPACE',
  BOOKING: 'BOOKING',
  RESOURCE: 'RESOURCE',
  AUTH: 'AUTH',
  FAQ: 'FAQ',
} as const;

export type AuditEntityType = (typeof AuditEntity)[keyof typeof AuditEntity];
