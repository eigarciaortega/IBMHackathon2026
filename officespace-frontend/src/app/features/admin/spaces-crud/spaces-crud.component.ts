import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Space } from '../../../core/models/space.model';
import { Booking } from '../../../core/models/booking.model';
import { SpacesService } from '../../../core/services/spaces.service';
import { BookingsService } from '../../../core/services/bookings.service';

@Component({
  selector: 'app-spaces-crud',
  templateUrl: './spaces-crud.component.html',
  styleUrl: './spaces-crud.component.scss',
})
export class SpacesCrudComponent implements OnInit {
  // ── CRUD ────────────────────────────────────────────────────
  showModal = false;
  editingId: number | null = null;
  form: FormGroup;
  loading = false;
  saving = false;
  deletingId: number | null = null;
  errorMsg = '';
  spaces: Space[] = [];

  // ── Mantenimiento ────────────────────────────────────────────
  showMaintenanceModal = false;
  maintenanceSpaceId: number | null = null;
  maintenanceSpaceName = '';
  maintenanceForm: FormGroup;
  savingMaintenance = false;
  maintenanceError = '';

  // ── Reasignación de reservas afectadas ───────────────────────
  showRelocationPanel = false;
  affectedBookings: Booking[] = [];
  loadingAffected = false;
  alternatives: Map<number, Space[]> = new Map();
  loadingAlt: Set<number> = new Set();
  relocatingId: number | null = null;
  selectedAlternative: Map<number, number> = new Map(); // bookingId → spaceId

  constructor(
    private fb: FormBuilder,
    private spacesService: SpacesService,
    private bookingsService: BookingsService,
  ) {
    this.form = this.fb.group({
      name:          ['', Validators.required],
      type:          ['SALA', Validators.required],
      capacity:      [1, [Validators.required, Validators.min(1)]],
      floor:         ['', Validators.required],
      hasProjector:  [false],
      hasAC:         [false],
      hasWhiteboard: [false],
      hasTV:         [false],
      hasVideoConf:  [false],
    });

    // Fecha mínima para el mantenimiento: ahora + 5 min
    const minUntil = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16);
    this.maintenanceForm = this.fb.group({
      reason: ['', Validators.required],
      until:  [minUntil, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadSpaces();
  }

  loadSpaces(): void {
    this.loading = true;
    this.spacesService.getAll().subscribe({
      next: spaces => { this.spaces = spaces; this.loading = false; },
      error: () => { this.errorMsg = 'No se pudieron cargar los espacios.'; this.loading = false; },
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────
  openCreate(): void {
    this.editingId = null;
    this.form.reset({ type: 'SALA', capacity: 1, hasProjector: false, hasAC: false, hasWhiteboard: false, hasTV: false, hasVideoConf: false });
    this.showModal = true;
  }

  openEdit(space: Space): void {
    this.editingId = space.id;
    this.form.patchValue(space);
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.errorMsg = ''; }

  onSave(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.errorMsg = '';
    const data = this.form.value;
    const op = this.editingId
      ? this.spacesService.update(this.editingId, data)
      : this.spacesService.create(data);

    op.subscribe({
      next: saved => {
        this.spaces = this.editingId
          ? this.spaces.map(s => s.id === this.editingId ? saved : s)
          : [...this.spaces, saved];
        this.saving = false;
        this.closeModal();
      },
      error: err => { this.errorMsg = err.error?.message ?? 'Error al guardar.'; this.saving = false; },
    });
  }

  onDelete(id: number): void {
    if (!confirm('¿Eliminar este espacio? Esta acción no se puede deshacer.')) return;
    this.deletingId = id;
    this.spacesService.delete(id).subscribe({
      next: () => { this.spaces = this.spaces.filter(s => s.id !== id); this.deletingId = null; },
      error: err => { alert(err.error?.message ?? 'No se pudo eliminar.'); this.deletingId = null; },
    });
  }

  // ── Mantenimiento ─────────────────────────────────────────────
  openMaintenance(space: Space): void {
    this.maintenanceSpaceId = space.id;
    this.maintenanceSpaceName = space.name;
    this.maintenanceError = '';
    const minUntil = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16); // +1h por defecto
    this.maintenanceForm.reset({ reason: '', until: minUntil });
    this.showMaintenanceModal = true;
  }

  closeMaintenance(): void { this.showMaintenanceModal = false; }

  onConfirmMaintenance(): void {
    if (this.maintenanceForm.invalid || !this.maintenanceSpaceId) return;
    this.savingMaintenance = true;
    this.maintenanceError = '';
    const { until, reason } = this.maintenanceForm.value;
    const untilIso = new Date(until).toISOString();

    this.spacesService.setMaintenance(this.maintenanceSpaceId, untilIso, reason).subscribe({
      next: updated => {
        this.spaces = this.spaces.map(s => s.id === updated.id ? updated : s);
        this.savingMaintenance = false;
        this.showMaintenanceModal = false;
        // Buscar reservas afectadas
        this.loadAffected(this.maintenanceSpaceId!);
      },
      error: err => {
        this.maintenanceError = err.error?.message ?? 'Error al configurar el mantenimiento.';
        this.savingMaintenance = false;
      },
    });
  }

  onClearMaintenance(space: Space): void {
    if (!confirm(`¿Reactivar "${space.name}" y quitar el mantenimiento?`)) return;
    this.spacesService.clearMaintenance(space.id).subscribe({
      next: updated => { this.spaces = this.spaces.map(s => s.id === updated.id ? updated : s); },
      error: err => { alert(err.error?.message ?? 'No se pudo reactivar la sala.'); },
    });
  }

  // ── Reasignación ──────────────────────────────────────────────
  loadAffected(spaceId: number): void {
    this.loadingAffected = true;
    this.showRelocationPanel = true;
    this.affectedBookings = [];
    this.alternatives.clear();
    this.selectedAlternative.clear();

    this.bookingsService.getAffectedBookings(spaceId).subscribe({
      next: bookings => {
        this.affectedBookings = bookings;
        this.loadingAffected = false;
        // Pre-cargar alternativas para cada reserva
        bookings.forEach(b => this.loadAlternatives(b.id));
      },
      error: () => { this.loadingAffected = false; },
    });
  }

  loadAlternatives(bookingId: number): void {
    this.loadingAlt.add(bookingId);
    this.bookingsService.getAlternativesForBooking(bookingId).subscribe({
      next: alts => {
        this.alternatives.set(bookingId, alts);
        this.loadingAlt.delete(bookingId);
        if (alts.length > 0) {
          this.selectedAlternative.set(bookingId, alts[0].id); // pre-selecciona la primera
        }
      },
      error: () => { this.loadingAlt.delete(bookingId); },
    });
  }

  onRelocate(bookingId: number): void {
    const newSpaceId = this.selectedAlternative.get(bookingId);
    if (!newSpaceId) return;
    this.relocatingId = bookingId;

    this.bookingsService.relocate(bookingId, newSpaceId).subscribe({
      next: () => {
        this.affectedBookings = this.affectedBookings.filter(b => b.id !== bookingId);
        this.relocatingId = null;
      },
      error: err => {
        alert(err.error?.message ?? 'No se pudo reasignar la reserva.');
        this.relocatingId = null;
      },
    });
  }

  closeRelocationPanel(): void { this.showRelocationPanel = false; }

  getAlts(bookingId: number): Space[] { return this.alternatives.get(bookingId) ?? []; }
  isLoadingAlt(bookingId: number): boolean { return this.loadingAlt.has(bookingId); }
  getSelectedAlt(bookingId: number): number | null { return this.selectedAlternative.get(bookingId) ?? null; }
  setSelectedAlt(bookingId: number, spaceId: number): void { this.selectedAlternative.set(bookingId, spaceId); }

  maintenanceLabel(space: Space): string {
    if (!space.isUnderMaintenance || !space.maintenanceUntil) return '';
    const d = new Date(space.maintenanceUntil);
    return `Hasta ${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  }
}
