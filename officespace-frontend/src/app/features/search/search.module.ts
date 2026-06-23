import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SearchRoutingModule } from './search-routing.module';
import { SearchSpacesComponent } from './search-spaces/search-spaces.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [SearchSpacesComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, SearchRoutingModule],
})
export class SearchModule {}
