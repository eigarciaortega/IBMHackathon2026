/**
 * Utilidades de fecha/hora para reservas.
 *
 * Convenciones (decisión T-03, zona oficial America/Mexico_City):
 *  - Las columnas DATE/TIME se manejan en UTC "puro" para que la hora del día y
 *    la fecha de calendario se conserven exactas, independientes del TZ del proceso.
 *  - Las comparaciones de "pasado" y la derivación de FINISHED usan la hora
 *    actual EN America/Mexico_City vía Intl (sin librerías externas).
 */

const TZ = 'America/Mexico_City';

/** Normaliza 'HH:mm' o 'HH:mm:ss' a 'HH:mm:ss'. */
export function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/** 'YYYY-MM-DD' -> Date (medianoche UTC) para columnas @db.Date. */
export function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** 'HH:mm[:ss]' -> Date (1970-01-01 UTC) para columnas @db.Time. */
export function toTimeOnly(time: string): Date {
  return new Date(`1970-01-01T${normalizeTime(time)}.000Z`);
}

/** Date de columna @db.Date -> 'YYYY-MM-DD'. */
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date de columna @db.Time -> 'HH:mm:ss'. */
export function formatTime(d: Date): string {
  return d.toISOString().slice(11, 19);
}

/** Fecha y hora actuales en America/Mexico_City como strings comparables. */
export function nowInOfficeTz(): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  return { date, time };
}

/**
 * ¿El instante (date, time) ya pasó respecto a "ahora" en la zona oficial?
 * Comparación lexicográfica válida por usar formatos zero-padded.
 */
export function isPast(dateStr: string, timeStr: string): boolean {
  const now = nowInOfficeTz();
  const t = normalizeTime(timeStr);
  if (dateStr < now.date) return true;
  if (dateStr > now.date) return false;
  return t <= now.time;
}

/**
 * Solape de dos intervalos en el MISMO día (strings 'HH:mm:ss').
 * Semiabierto [) → consecutivas NO chocan (RN-046).
 */
export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && e1 > s2;
}
