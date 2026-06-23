import { BadRequestException, Injectable } from '@nestjs/common';
import { formatDate, formatTime } from '../../bookings/utils/time.util';
import { ExportFormat } from '../dto/export-query.dto';
import { ExportRepository } from '../repositories/export.repository';
import { CsvValue, toCsv } from '../utils/csv.util';

export interface ExportResult {
  filename: string;
  content: string;
  contentType: string;
}

@Injectable()
export class ExportService {
  constructor(private readonly exportRepository: ExportRepository) {}

  /**
   * Decisión H-08: CSV obligatorio. xlsx (Excel) NO está implementado en el MVP
   * → 400 con mensaje claro. Queda documentado como mejora futura.
   */
  private assertSupportedFormat(format: ExportFormat): void {
    if (format === 'xlsx') {
      throw new BadRequestException(
        'El formato xlsx no está disponible en el MVP. Usa format=csv. (Excel queda como mejora futura.)',
      );
    }
  }

  private buildResult(name: string, headers: string[], rows: CsvValue[][]): ExportResult {
    const date = new Date().toISOString().slice(0, 10);
    return {
      filename: `${name}_${date}.csv`,
      content: toCsv(headers, rows),
      contentType: 'text/csv; charset=utf-8',
    };
  }

  async exportBookings(format: ExportFormat): Promise<ExportResult> {
    this.assertSupportedFormat(format);
    const data = await this.exportRepository.findBookings();
    const headers = [
      'id',
      'userId',
      'userEmail',
      'spaceId',
      'spaceName',
      'bookingDate',
      'startTime',
      'endTime',
      'attendeesCount',
      'purpose',
      'status',
      'createdAt',
    ];
    const rows: CsvValue[][] = data.map((b) => [
      b.id,
      b.userId,
      b.user?.email ?? '',
      b.spaceId,
      b.space?.name ?? '',
      formatDate(b.bookingDate),
      formatTime(b.startTime),
      formatTime(b.endTime),
      b.attendeesCount,
      b.purpose,
      b.status, // estado almacenado (FINISHED es derivado, no se persiste)
      b.createdAt.toISOString(),
    ]);
    return this.buildResult('bookings', headers, rows);
  }

  async exportSpaces(format: ExportFormat): Promise<ExportResult> {
    this.assertSupportedFormat(format);
    const data = await this.exportRepository.findSpaces();
    const headers = ['id', 'name', 'spaceType', 'capacity', 'floor', 'zone', 'status', 'createdAt'];
    const rows: CsvValue[][] = data.map((s) => [
      s.id,
      s.name,
      s.spaceType,
      s.capacity,
      s.floor,
      s.zone,
      s.status,
      s.createdAt.toISOString(),
    ]);
    return this.buildResult('spaces', headers, rows);
  }

  async exportUsers(format: ExportFormat): Promise<ExportResult> {
    this.assertSupportedFormat(format);
    const data = await this.exportRepository.findUsers();
    // SIN passwordHash ni temporaryPassword.
    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'role',
      'status',
      'mustChangePassword',
      'lastLogin',
      'createdAt',
    ];
    const rows: CsvValue[][] = data.map((u) => [
      u.id,
      u.firstName,
      u.lastName,
      u.email,
      u.role?.name ?? '',
      u.status,
      u.mustChangePassword,
      u.lastLogin ? u.lastLogin.toISOString() : '',
      u.createdAt.toISOString(),
    ]);
    return this.buildResult('users', headers, rows);
  }

  async exportAudit(format: ExportFormat): Promise<ExportResult> {
    this.assertSupportedFormat(format);
    const data = await this.exportRepository.findAudit();
    const headers = [
      'id',
      'userId',
      'action',
      'entityType',
      'entityId',
      'success',
      'ipAddress',
      'createdAt',
    ];
    const rows: CsvValue[][] = data.map((a) => [
      a.id,
      a.userId,
      a.action,
      a.entityType,
      a.entityId ?? '',
      a.success,
      a.ipAddress ?? '',
      a.createdAt.toISOString(),
    ]);
    return this.buildResult('audit', headers, rows);
  }
}
