import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NavbarComponent } from './navbar/navbar.component';
import { SpaceCardComponent } from './space-card/space-card.component';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';

@NgModule({
  declarations: [NavbarComponent, SpaceCardComponent, LoadingSpinnerComponent],
  imports: [CommonModule, RouterModule],
  exports: [NavbarComponent, SpaceCardComponent, LoadingSpinnerComponent],
})
export class SharedModule {}
