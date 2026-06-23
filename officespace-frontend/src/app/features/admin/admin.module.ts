import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SpacesCrudComponent } from './spaces-crud/spaces-crud.component';

@NgModule({
  declarations: [DashboardComponent, SpacesCrudComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AdminRoutingModule],
  providers: [TitleCasePipe],
})
export class AdminModule {}
