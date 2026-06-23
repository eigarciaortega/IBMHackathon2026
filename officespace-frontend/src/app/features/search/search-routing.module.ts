import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchSpacesComponent } from './search-spaces/search-spaces.component';

const routes: Routes = [
  { path: '', component: SearchSpacesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SearchRoutingModule {}
