/**
 * Categorías oficiales del Bot FAQ (doc 06 / decisión H-06).
 */
export const FAQ_CATEGORIES = [
  'Reservations',
  'Spaces',
  'Users',
  'Policies',
  'General',
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
