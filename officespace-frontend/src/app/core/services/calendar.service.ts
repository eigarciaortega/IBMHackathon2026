import { Injectable } from '@angular/core';
import { Booking } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class CalendarService {

  openGoogleCalendar(booking: Booking): void {
    const start = this.toGcalDate(`${booking.date}T${booking.startTime}:00`);
    const end   = this.toGcalDate(`${booking.date}T${booking.endTime}:00`);
    const title = encodeURIComponent(`Reserva: ${booking.spaceName}`);
    const detail = encodeURIComponent(`Espacio reservado en OfficeSpace. Asistentes: ${booking.attendees}`);
    const loc   = encodeURIComponent(booking.spaceName);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${detail}&location=${loc}`;
    window.open(url, '_blank', 'noopener');
  }

  openOutlookCalendar(booking: Booking): void {
    const start = new Date(`${booking.date}T${booking.startTime}:00`).toISOString();
    const end   = new Date(`${booking.date}T${booking.endTime}:00`).toISOString();
    const title = encodeURIComponent(`Reserva: ${booking.spaceName}`);
    const body  = encodeURIComponent(`Espacio reservado en OfficeSpace. Asistentes: ${booking.attendees}`);
    const loc   = encodeURIComponent(booking.spaceName);

    const url = `https://outlook.live.com/calendar/0/action/compose?subject=${title}&startdt=${start}&enddt=${end}&body=${body}&location=${loc}`;
    window.open(url, '_blank', 'noopener');
  }

  // Mantener descarga .ics como opción de respaldo
  exportToIcs(booking: Booking): void {
    const startDt = this.toIcsDate(`${booking.date}T${booking.startTime}:00`);
    const endDt   = this.toIcsDate(`${booking.date}T${booking.endTime}:00`);
    const now     = this.toIcsDate(new Date().toISOString());

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OfficeSpace//Reserva//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:officespace-booking-${booking.id}@corporativoalpha.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${startDt}`,
      `DTEND:${endDt}`,
      `SUMMARY:Reserva: ${booking.spaceName}`,
      `DESCRIPTION:Espacio reservado en OfficeSpace\\nAsistentes: ${booking.attendees}`,
      `LOCATION:${booking.spaceName}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio de reserva OfficeSpace',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reserva-${booking.spaceName.replace(/\s+/g, '-')}-${booking.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // YYYYMMDDTHHMMSSZ para Google Calendar
  private toGcalDate(iso: string): string {
    return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  // Mismo formato para iCal
  private toIcsDate(iso: string): string {
    return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}
