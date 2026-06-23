import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Space } from '../../../core/models/space.model';

@Component({
  selector: 'app-spaces-crud',
  templateUrl: './spaces-crud.component.html',
  styleUrl: './spaces-crud.component.scss',
})
export class SpacesCrudComponent {
  showModal = false;
  editingId: number | null = null;
  form: FormGroup;
  savingId: number | null = null;

  // Mock data — reemplazar con SpacesService.getAll()
  spaces: Space[] = [
    { id: 1, name: 'Sala Creativa',       type: 'SALA', capacity: 8,  floor: '2', hasProjector: true,  hasAC: true  },
    { id: 2, name: 'Sala Ejecutiva',      type: 'SALA', capacity: 12, floor: '3', hasProjector: true,  hasAC: true  },
    { id: 3, name: 'Sala Colaborativa',   type: 'SALA', capacity: 6,  floor: '1', hasProjector: false, hasAC: true  },
    { id: 4, name: 'Escritorio Ventana A',type: 'DESK', capacity: 1,  floor: '2', hasProjector: false, hasAC: false },
    { id: 5, name: 'Escritorio Ventana B',type: 'DESK', capacity: 1,  floor: '2', hasProjector: false, hasAC: false },
    { id: 6, name: 'Escritorio Central',  type: 'DESK', capacity: 1,  floor: '1', hasProjector: false, hasAC: true  },
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name:         ['', Validators.required],
      type:         ['SALA', Validators.required],
      capacity:     [1, [Validators.required, Validators.min(1)]],
      floor:        ['', Validators.required],
      hasProjector: [false],
      hasAC:        [false],
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ type: 'SALA', capacity: 1, hasProjector: false, hasAC: false });
    this.showModal = true;
  }

  openEdit(space: Space): void {
    this.editingId = space.id;
    this.form.patchValue(space);
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onSave(): void {
    if (this.form.invalid) return;
    const data = this.form.value;
    if (this.editingId) {
      // TODO: this.spacesService.update(this.editingId, data)
      this.spaces = this.spaces.map(s => s.id === this.editingId ? { ...s, ...data } : s);
    } else {
      // TODO: this.spacesService.create(data)
      const newId = Math.max(...this.spaces.map(s => s.id)) + 1;
      this.spaces = [...this.spaces, { id: newId, ...data }];
    }
    this.closeModal();
  }

  onDelete(id: number): void {
    if (!confirm('¿Eliminar este espacio? Esta acción no se puede deshacer.')) return;
    // TODO: this.spacesService.delete(id)
    this.spaces = this.spaces.filter(s => s.id !== id);
  }
}
