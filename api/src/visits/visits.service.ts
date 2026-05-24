import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VisitsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Listar visitas do dia (portaria) ────────────────────────────
  async findAll(tenantId: string, query?: string, startDate?: string, endDate?: string, status?: string) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    } else {
      // Padrão: Hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.createdAt = { gte: today, lt: tomorrow };
    }

    if (status) where.status = status as VisitStatus;
    if (query) {
      where.OR = [
        { visitorName: { contains: query, mode: 'insensitive' } },
        { visitorDoc: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.visit.findMany({
      where,
      include: {
        materials: { include: { photos: true } },
        signature: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Buscar visita por ID ────────────────────────────────────────
  async findOne(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        materials: { include: { photos: true } },
        signature: true,
        createdBy: { select: { name: true } },
        notificationLogs: { orderBy: { sentAt: 'desc' } },
      },
    });
    if (!visit) throw new NotFoundException('Visita não encontrada');
    return visit;
  }

  // ─── Buscar por token de assinatura (público) ────────────────────
  async findBySignToken(token: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { signToken: token },
      include: {
        materials: { include: { photos: true } },
        signature: true,
        tenant: true,
      },
    });
    if (!visit) throw new NotFoundException('Link de assinatura inválido ou expirado');
    if (visit.signTokenExp && visit.signTokenExp < new Date()) {
      throw new BadRequestException('Link de assinatura expirado');
    }
    if (visit.status === VisitStatus.APPROVED || visit.status === VisitStatus.REJECTED) {
      throw new BadRequestException('Esta visita já foi processada');
    }
    return visit;
  }

  // ─── Criar nova visita ───────────────────────────────────────────
  async create(tenantId: string, createdById: string, data: any) {
    const isMaterialExitOnly = !!data.isMaterialExitOnly;
    
    // Se for apenas saída de material, exige autorização imediata (UNDER_REVIEW)
    // Caso contrário, segue o fluxo de "Entrada Livre" (IN_PREMISES)
    const status = isMaterialExitOnly ? VisitStatus.UNDER_REVIEW : VisitStatus.IN_PREMISES;
    const token = isMaterialExitOnly ? uuidv4() : null;
    const exp = isMaterialExitOnly ? (() => {
      const e = new Date();
      e.setHours(e.getHours() + Number(process.env.SIGNATURE_TOKEN_EXPIRES_HOURS || 48));
      return e;
    })() : null;

    const visit = await this.prisma.visit.create({
      data: {
        tenantId,
        createdById,
        visitorName: data.visitorName,
        visitorDoc: data.visitorDoc,
        visitorCompany: data.visitorCompany,
        visitorPhone: data.visitorPhone,
        visitorEmail: data.visitorEmail,
        visitorType: data.visitorType || 'VISITANTE',
        isMaterialExitOnly,
        destination: data.destination,
        purpose: data.purpose,
        responsibleName: data.responsibleName,
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
        responsibleWhatsapp: data.responsibleWhatsapp,
        status,
        signToken: token,
        signTokenExp: exp,
        entryAt: new Date(),
      },
    });

    // Se for apenas saída, notifica o responsável imediatamente
    if (isMaterialExitOnly) {
      await this.notifications.notifyResponsible(visit);
    }

    return visit;
  }

  // ─── Enviar para análise (gera token + notifica) ─────────────────
  async submitForReview(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);

    if (visit.status !== VisitStatus.PENDING) {
      throw new BadRequestException('Visita já está em análise ou foi processada');
    }

    const token = uuidv4();
    const exp = new Date();
    exp.setHours(exp.getHours() + Number(process.env.SIGNATURE_TOKEN_EXPIRES_HOURS || 48));

    const updated = await this.prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.UNDER_REVIEW,
        signToken: token,
        signTokenExp: exp,
      },
    });

    // Enviar notificações ao responsável
    await this.notifications.notifyResponsible(updated);

    return updated;
  }

  // ─── Solicitar autorização de saída (com alteração de materiais) ──
  async requestExitReview(id: string, tenantId: string, materialChanges: string) {
    const visit = await this.findOne(id, tenantId);

    if (visit.status !== VisitStatus.IN_PREMISES) {
      throw new BadRequestException('Visita precisa estar nas dependências para solicitar saída');
    }

    const token = uuidv4();
    const exp = new Date();
    exp.setHours(exp.getHours() + Number(process.env.SIGNATURE_TOKEN_EXPIRES_HOURS || 48));

    const updated = await this.prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.UNDER_REVIEW,
        signToken: token,
        signTokenExp: exp,
        materialChanges,
      },
    });

    // Enviar notificações ao responsável
    await this.notifications.notifyResponsible(updated);

    return updated;
  }

  // ─── Registrar saída do visitante ────────────────────────────────
  async registerExit(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);

    if (visit.status !== VisitStatus.APPROVED) {
      throw new BadRequestException('Visita precisa estar aprovada para registrar saída');
    }

    return this.prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.COMPLETED,
        exitAt: new Date(),
      },
    });
  }

  // ─── Cancelar visita ────────────────────────────────────────────
  async cancel(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);
    if ([VisitStatus.COMPLETED, VisitStatus.CANCELLED].includes(visit.status as any)) {
      throw new BadRequestException('Visita não pode ser cancelada');
    }
    return this.prisma.visit.update({
      where: { id },
      data: { status: VisitStatus.CANCELLED },
    });
  }

  // ─── Estatísticas do dia ─────────────────────────────────────────
  async getDailyStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, pending, inPremises, underReview, approved, rejected, completed] = await Promise.all([
      this.prisma.visit.count({ where: { tenantId, createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.visit.count({ where: { tenantId, status: 'PENDING', createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.visit.count({ where: { tenantId, status: 'IN_PREMISES', createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.visit.count({ where: { tenantId, status: 'UNDER_REVIEW', createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.visit.count({ where: { tenantId, status: 'APPROVED', createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.visit.count({ where: { tenantId, status: 'REJECTED', createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.visit.count({ where: { tenantId, status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } } }),
    ]);

    return { total, pending, inPremises, underReview, approved, rejected, completed };
  }
}
