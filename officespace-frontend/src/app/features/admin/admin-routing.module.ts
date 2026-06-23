import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SpacesCrudComponent } from './spaces-crud/spaces-crud.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'spaces', component: SpacesCrudComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
