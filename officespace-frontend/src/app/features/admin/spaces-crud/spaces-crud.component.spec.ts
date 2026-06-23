import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpacesCrudComponent } from './spaces-crud.component';

describe('SpacesCrudComponent', () => {
  let component: SpacesCrudComponent;
  let fixture: ComponentFixture<SpacesCrudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpacesCrudComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpacesCrudComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
