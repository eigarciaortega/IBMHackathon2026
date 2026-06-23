import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntity } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/audit.service';
import { CreateFaqDto } from '../dto/create-faq.dto';
import { UpdateFaqDto } from '../dto/update-faq.dto';
import { ChatbotRepository, FaqRow } from '../repositories/chatbot.repository';

/**
 * ChatbotService — Bot FAQ basado en datos (decisión H-06).
 * SIN IA, sin APIs externas. Búsqueda por coincidencia parcial sin acentos
 * usando f_unaccent(lower(question)) (compatible con el índice funcional).
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly chatbotRepository: ChatbotRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Búsqueda con fallback defensivo: intenta la consulta optimizada con
   * f_unaccent; si falla (p. ej. la función/migración no existe), cae a una
   * búsqueda simple con contains/ILIKE. Así POST /chatbot/ask nunca se rompe.
   */
  private async search(term: string, limit = 5): Promise<FaqRow[]> {
    try {
      return await this.chatbotRepository.searchByQuestion(term, limit);
    } catch (error) {
      this.logger.warn(
        `Búsqueda optimizada (f_unaccent) falló; usando fallback simple. ${
          error instanceof Error ? error.message : ''
        }`,
      );
      return this.chatbotRepository.searchByQuestionSimple(term, limit);
    }
  }

  // ---- Consulta (ADMIN/COLLABORATOR) ----
  async ask(question: string) {
    const term = question.trim();

    // 1) Coincidencia parcial sobre la pregunta completa.
    let matches: FaqRow[] = await this.search(term);

    // 2) Si no hay match, intentar con la palabra clave más larga (>=4 chars).
    if (matches.length === 0) {
      const keyword = term
        .split(/\s+/)
        .filter((w) => w.length >= 4)
        .sort((a, b) => b.length - a.length)[0];
      if (keyword) {
        matches = await this.search(keyword);
      }
    }

    if (matches.length > 0) {
      return { matched: true, results: matches };
    }

    // 3) Fallback: sin coincidencia → categorías y FAQs sugeridas.
    const [categories, suggestions] = await Promise.all([
      this.chatbotRepository.listActiveCategories(),
      this.chatbotRepository.suggestions(5),
    ]);
    return {
      matched: false,
      message: 'No encontré una respuesta exacta. Revisa estas categorías o preguntas frecuentes.',
      categories,
      suggestions,
    };
  }

  // ---- Listado (ADMIN/COLLABORATOR) ----
  listFaq(category: string | undefined, page?: number, limit?: number) {
    return this.chatbotRepository.listActive(category, page, limit);
  }

  // ---- Gestión (solo ADMIN) ----
  async createFaq(dto: CreateFaqDto, actorId: string, ipAddress?: string) {
    const faq = await this.chatbotRepository.create({
      question: dto.question,
      answer: dto.answer,
      category: dto.category,
    });
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.CREATE_FAQ,
      entityType: AuditEntity.FAQ,
      entityId: faq.id,
      success: true,
      newValues: { category: faq.category },
      ipAddress,
    });
    return faq;
  }

  async updateFaq(id: string, dto: UpdateFaqDto, actorId: string, ipAddress?: string) {
    const existing = await this.chatbotRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('FAQ no encontrada.');
    }
    const updated = await this.chatbotRepository.update(id, {
      ...(dto.question !== undefined ? { question: dto.question } : {}),
      ...(dto.answer !== undefined ? { answer: dto.answer } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
    });
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.UPDATE_FAQ,
      entityType: AuditEntity.FAQ,
      entityId: id,
      success: true,
      newValues: { ...dto },
      ipAddress,
    });
    return updated;
  }

  /** Borrado lógico (status = INACTIVE). */
  async deleteFaq(id: string, actorId: string, ipAddress?: string) {
    const existing = await this.chatbotRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('FAQ no encontrada.');
    }
    const updated = await this.chatbotRepository.softDelete(id);
    await this.auditService.record({
      userId: actorId,
      action: AuditAction.DELETE_FAQ,
      entityType: AuditEntity.FAQ,
      entityId: id,
      success: true,
      newValues: { status: 'INACTIVE' },
      ipAddress,
    });
    return updated;
  }
}
