import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { WalletService } from './core/services/wallet.service';

const mockWalletService = {
  getAllUsers: () => of([]),
  getUser: () => of(null),
  recharge: () => of(null),
  transfer: () => of(null),
  getTransactions: () => of([]),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: WalletService, useValue: mockWalletService }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render wallet title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Mi billetera');
  });
});
