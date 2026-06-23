import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Space } from '../../../core/models/space.model';

@Component({
  selector: 'app-search-spaces',
  templateUrl: './search-spaces.component.html',
  styleUrl: './search-spaces.component.scss',
})
export class SearchSpacesComponent {
  form: FormGroup;
  loading = false;
  searched = false;

  // Mock data — reemplazar con SpacesService.getAvailability()
  spaces: Space[] = [
    { id: 1, name: 'Sala Creativa', type: 'SALA', capacity: 8, floor: '2', hasProjector: true,  hasAC: true  },
    { id: 2, name: 'Sala Ejecutiva', type: 'SALA', capacity: 12, floor: '3', hasProjector: true,  hasAC: true  },
    { id: 3, name: 'Sala Colaborativa', type: 'SALA', capacity: 6, floor: '1', hasProjector: false, hasAC: true  },
    { id: 4, name: 'Escritorio Ventana A', type: 'DESK', capacity: 1, floor: '2', hasProjector: false, hasAC: false },
    { id: 5, name: 'Escritorio Ventana B', type: 'DESK', capacity: 1, floor: '2', hasProjector: false, hasAC: false },
    { id: 6, name: 'Escritorio Central', type: 'DESK', capacity: 1, floor: '1', hasProjector: false, hasAC: true  },
  ];

  today = new Date().toISOString().split('T')[0];

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      date:        [this.today],
      startTime:   ['09:00'],
      endTime:     ['10:00'],
      type:        [''],
      minCapacity: [''],
    });
  }

  onSearch(): void {
    this.loading = true;
    this.searched = false;
    // TODO: this.spacesService.getAvailability(this.form.value)
    setTimeout(() => { this.loading = false; this.searched = true; }, 600);
  }

  onReserve(space: Space): void {
    this.router.navigate(['/booking/confirm'], {
      state: { space, filters: this.form.value },
    });
  }

  get filteredSpaces(): Space[] {
    const { type, minCapacity } = this.form.value;
    return this.spaces.filter(s =>
      (!type || s.type === type) &&
      (!minCapacity || s.capacity >= +minCapacity)
    );
  }
}
