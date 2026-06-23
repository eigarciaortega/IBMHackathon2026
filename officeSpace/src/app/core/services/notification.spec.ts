import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('push()', () => {
    it('adds a notification to the notifications signal', () => {
      service.push('Test message', 'success');
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Test message');
      expect(service.notifications()[0].type).toBe('success');
    });

    it('adds notification to history', () => {
      service.push('History entry', 'info');
      expect(service.history().length).toBe(1);
    });

    it('defaults to info type when no type provided', () => {
      service.push('Default type');
      expect(service.notifications()[0].type).toBe('info');
    });

    it('limits history to 20 items', () => {
      for (let i = 0; i < 25; i++) service.push(`Msg ${i}`, 'info');
      expect(service.history().length).toBe(20);
    });
  });

  describe('remove()', () => {
    it('removes a notification by id', () => {
      service.push('Msg A', 'success');
      const id = service.notifications()[0].id;
      service.remove(id);
      expect(service.notifications().find(n => n.id === id)).toBeUndefined();
    });

    it('does not affect other notifications when removing one', () => {
      service.push('Msg A', 'success');
      const idA = service.notifications()[0].id;
      // Use a distinct id for Msg B by adding 1 directly
      service.notifications.update(n => [...n, { id: idA + 1, message: 'Msg B', type: 'info', timestamp: new Date() }]);
      service.remove(idA);
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Msg B');
    });
  });

  describe('clearHistory()', () => {
    it('empties the history signal', () => {
      service.push('Entry 1', 'info');
      service.push('Entry 2', 'warning');
      service.clearHistory();
      expect(service.history().length).toBe(0);
    });
  });

  describe('disconnect()', () => {
    it('can be called without error when not connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });
});
