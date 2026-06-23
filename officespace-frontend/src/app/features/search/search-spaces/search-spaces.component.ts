import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { BookingSuggestion } from '../../../core/models/booking.model';
import { BookingsService } from '../../../core/services/bookings.service';

@Component({
  selector: 'app-search-spaces',
  templateUrl: './search-spaces.component.html',
  styleUrl: './search-spaces.component.scss',
})
export class SearchSpacesComponent {
  form: FormGroup;
  loading = false;
  searched = false;
  errorMsg = '';
  spaces: Space[] = [];
  today = new Date().toISOString().split('T')[0];

  // Bot suggestions
  loadingSuggestions = false;
  suggestions: BookingSuggestion[] = [];
  showSuggestions = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private bookingsService: BookingsService,
  ) {
    // Tiempo mínimo inicial: ahora + 5 min (solo relevante si la fecha es hoy)
    const earliest = this.nowPlus5();

    this.form = this.fb.group({
      date:        [this.today],
      startTime:   [earliest],
      endTime:     [this.addHour(earliest)],
      type:        [''],
      minCapacity: [''],
    });

    // Cuando cambia "Desde" → actualizar "Hasta" a +1 hora
    this.form.get('startTime')!.valueChanges.subscribe(start => {
      if (!start) return;
      this.form.get('endTime')!.setValue(this.addHour(start), { emitEvent: false });
    });

    // Cuando cambia la fecha → resetear los horarios al inicial según el día elegido
    this.form.get('date')!.valueChanges.subscribe(date => {
      const defaultStart = date === this.today ? this.nowPlus5() : '08:00';
      this.form.get('startTime')!.setValue(defaultStart); // dispara subscription → actualiza endTime
    });
  }

  // "ahora + 5 minutos" en formato HH:mm
  nowPlus5(): string {
    const d = new Date(Date.now() + 5 * 60_000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // Suma 1 hora a un string HH:mm
  addHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Mínimo para el input "Desde": solo aplica cuando la fecha es hoy
  get minStartTime(): string | null {
    return this.form.get('date')?.value === this.today ? this.nowPlus5() : null;
  }

  onSearch(): void {
    this.loading = true;
    this.searched = false;
    this.errorMsg = '';

    const { date, startTime, endTime, type, minCapacity } = this.form.value;
    this.bookingsService.getAvailableSpaces({
      date,
      startTime,
      endTime,
      type: type || undefined,
      minCapacity: minCapacity ? +minCapacity : undefined,
    }).subscribe({
      next: spaces => {
        this.spaces = spaces;
        this.loading = false;
        this.searched = true;
      },
      error: () => {
        this.errorMsg = 'No se pudo conectar con el servidor. Verifica que los servicios estén corriendo.';
        this.loading = false;
        this.searched = true;
      },
    });
  }

  onReserve(space: Space): void {
    this.router.navigate(['/booking/confirm'], {
      state: { space, filters: this.form.value },
    });
  }

  onSuggest(): void {
    this.loadingSuggestions = true;
    this.showSuggestions = true;
    this.suggestions = [];
    this.bookingsService.getSuggestions().subscribe({
      next: sugs => {
        this.suggestions = sugs;
        this.loadingSuggestions = false;
      },
      error: () => {
        this.loadingSuggestions = false;
      },
    });
  }

  applySuggestion(sug: BookingSuggestion): void {
    this.form.patchValue({
      date:      sug.date,
      startTime: sug.startTime,
      endTime:   sug.endTime,
      type:      sug.spaceType,
    });
    this.showSuggestions = false;
    this.onSearch();
  }

  get availableCount(): number {
    return this.spaces.filter(s => s.isAvailable !== false).length;
  }

  get filteredSpaces(): Space[] {
    return this.spaces;
  }
}
