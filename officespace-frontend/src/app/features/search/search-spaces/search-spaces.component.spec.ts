import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchSpacesComponent } from './search-spaces.component';

describe('SearchSpacesComponent', () => {
  let component: SearchSpacesComponent;
  let fixture: ComponentFixture<SearchSpacesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SearchSpacesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchSpacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
