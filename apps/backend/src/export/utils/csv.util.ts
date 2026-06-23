/**
 * Generación de CSV (RFC 4180) sin dependencias externas.
 * Antepone BOM UTF-8 para que Excel muestre acentos correctamente.
 */
export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  return `﻿${lines.join('\r\n')}`;
}
