import { NotFoundException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let repo: any;
  let audit: any;

  const faq = { id: 'f1', question: '¿Cómo reservo?', answer: 'Ve a Buscar Espacios.', category: 'Reservations' };

  beforeEach(() => {
    repo = {
      searchByQuestion: jest.fn().mockResolvedValue([faq]),
      searchByQuestionSimple: jest.fn().mockResolvedValue([faq]),
      listActiveCategories: jest.fn().mockResolvedValue(['Reservations', 'Spaces']),
      suggestions: jest.fn().mockResolvedValue([{ id: 'f1', question: '¿Cómo reservo?', category: 'Reservations' }]),
      listActive: jest.fn().mockResolvedValue({ items: [faq], total: 1, page: 1, limit: 50 }),
      create: jest.fn().mockResolvedValue(faq),
      findById: jest.fn().mockResolvedValue(faq),
      update: jest.fn().mockResolvedValue(faq),
      softDelete: jest.fn().mockResolvedValue({ ...faq, status: 'INACTIVE' }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ChatbotService(repo, audit);
  });

  it('ask: devuelve coincidencias cuando hay match', async () => {
    const res = await service.ask('reservo');
    expect(res.matched).toBe(true);
    expect(res.results).toHaveLength(1);
  });

  it('ask: fallback con categorías y sugerencias si no hay match', async () => {
    repo.searchByQuestion.mockResolvedValue([]); // ni término ni keyword
    const res = await service.ask('xyzz desconocido');
    expect(res.matched).toBe(false);
    expect(res.categories).toContain('Reservations');
    expect(res.suggestions).toHaveLength(1);
  });

  it('ask: reintenta con palabra clave más larga', async () => {
    repo.searchByQuestion
      .mockResolvedValueOnce([]) // término completo sin match
      .mockResolvedValueOnce([faq]); // keyword con match
    const res = await service.ask('como cancelar reserva');
    expect(res.matched).toBe(true);
    expect(repo.searchByQuestion).toHaveBeenCalledTimes(2);
  });

  it('ask: usa fallback simple si la búsqueda optimizada falla', async () => {
    repo.searchByQuestion.mockRejectedValueOnce(new Error('function f_unaccent does not exist'));
    const res = await service.ask('reservo');
    expect(res.matched).toBe(true);
    expect(repo.searchByQuestionSimple).toHaveBeenCalled();
  });

  it('createFaq audita CREATE_FAQ', async () => {
    await service.createFaq({ question: 'q', answer: 'a', category: 'General' }, 'admin', '127.0.0.1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_FAQ', success: true }),
    );
  });

  it('updateFaq 404 si no existe', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.updateFaq('x', { answer: 'b' }, 'admin')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deleteFaq hace borrado lógico y audita DELETE_FAQ', async () => {
    await service.deleteFaq('f1', 'admin', '127.0.0.1');
    expect(repo.softDelete).toHaveBeenCalledWith('f1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE_FAQ', success: true }),
    );
  });
});
