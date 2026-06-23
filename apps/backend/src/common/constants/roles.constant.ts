/**
 * Roles oficiales del sistema (decisión C-05: nombre técnico COLLABORATOR).
 */
export const Role = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
} as const;

export type RoleName = (typeof Role)[keyof typeof Role];
