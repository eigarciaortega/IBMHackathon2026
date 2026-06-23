import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Space } from '../../core/models/space.model';

@Component({
  selector: 'app-space-card',
  templateUrl: './space-card.component.html',
  styleUrl: './space-card.component.scss',
})
export class SpaceCardComponent {
  @Input() space!: Space;
  @Output() reserve = new EventEmitter<Space>();
}
