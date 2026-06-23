import { Injectable } from '@nestjs/common';
import { FaqStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
}

@Injectable()
export class ChatbotRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- CRUD ----
  create(data: Prisma.ChatbotFaqCreateInput) {
    return this.prisma.chatbotFaq.create({ data });
  }

  findById(id: string) {
    return this.prisma.chatbotFaq.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ChatbotFaqUpdateInput) {
    return this.prisma.chatbotFaq.update({ where: { id }, data });
  }

  /** Borrado lógico: status = INACTIVE. */
  softDelete(id: string) {
    return this.prisma.chatbotFaq.update({ where: { id }, data: { status: FaqStatus.INACTIVE } });
  }

  async listActive(category: string | undefined, page = 1, limit = 50) {
    const take = limit > 0 ? Math.min(limit, 100) : 50;
    const where: Prisma.ChatbotFaqWhereInput = {
      status: FaqStatus.ACTIVE,
      ...(category ? { category } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chatbotFaq.findMany({
        where,
        orderBy: { category: 'asc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.chatbotFaq.count({ where }),
    ]);
    return { items, total, page, limit: take };
  }

  // ---- Búsqueda (H-06): coincidencia parcial sin acentos, compatible con el
  // índice funcional GIN trgm sobre f_unaccent(lower(question)). ----
  searchByQuestion(term: string, limit = 5): Promise<FaqRow[]> {
    const pattern = `%${term}%`;
    return this.prisma.$queryRaw<FaqRow[]>(Prisma.sql`
      SELECT id, question, answer, category
      FROM chatbot_faq
      WHERE status::text = 'ACTIVE'
        AND f_unaccent(lower(question)) ILIKE f_unaccent(lower(${pattern}))
      ORDER BY question ASC
      LIMIT ${limit}
    `);
  }

  /**
   * Búsqueda de RESPALDO sin f_unaccent (fallback defensivo).
   * Se usa si la consulta optimizada falla (p. ej. la migración personalizada
   * que crea f_unaccent no fue aplicada). Sigue siendo case-insensitive (ILIKE
   * vía `mode: 'insensitive'`), pero NO ignora acentos.
   */
  async searchByQuestionSimple(term: string, limit = 5): Promise<FaqRow[]> {
    const rows = await this.prisma.chatbotFaq.findMany({
      where: { status: FaqStatus.ACTIVE, question: { contains: term, mode: 'insensitive' } },
      select: { id: true, question: true, answer: true, category: true },
      orderBy: { question: 'asc' },
      take: limit,
    });
    return rows;
  }

  async listActiveCategories(): Promise<string[]> {
    const rows = await this.prisma.chatbotFaq.findMany({
      where: { status: FaqStatus.ACTIVE },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  suggestions(limit = 5) {
    return this.prisma.chatbotFaq.findMany({
      where: { status: FaqStatus.ACTIVE },
      select: { id: true, question: true, category: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
