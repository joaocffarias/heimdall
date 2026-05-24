import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisitStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class SignaturesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Processa uma assinatura digital.
   * - Valida o token da visita
   * - Converte a assinatura (base64 PNG) e salva no MinIO
   * - Gera hash SHA-256 da assinatura + metadados
   * - Salva no banco e atualiza status da visita
   * - Notifica a portaria
   */
  async sign(token: string, dto: {
    signerName: string;
    signerEmail?: string;
    signerIp: string;
    signerUserAgent?: string;
    signatureImage: string; // base64 PNG
    signatureData: any;     // pontos do canvas
    approved: boolean;
    reason?: string;
  }) {
    // 1. Validar token
    const visit = await this.prisma.visit.findUnique({
      where: { signToken: token },
      include: { tenant: true },
    });

    if (!visit) throw new NotFoundException('Token de assinatura inválido');
    if (visit.signTokenExp && visit.signTokenExp < new Date()) {
      throw new BadRequestException('Token expirado');
    }
    if (visit.status !== VisitStatus.UNDER_REVIEW) {
      throw new BadRequestException('Esta visita já foi processada');
    }

    // 2. Converter base64 para buffer e salvar imagem no MinIO
    const imageBuffer = Buffer.from(
      dto.signatureImage.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );
    const imagePath = `signatures/${visit.id}/${Date.now()}.png`;
    await this.storage.upload(imagePath, imageBuffer, 'image/png');

    // 3. Gerar hashes SHA-256
    const signatureHash = crypto
      .createHash('sha256')
      .update(dto.signatureImage + dto.signerName + visit.id)
      .digest('hex');

    const metadataHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          visitId: visit.id,
          signerName: dto.signerName,
          ip: dto.signerIp,
          timestamp: new Date().toISOString(),
          approved: dto.approved,
        }),
      )
      .digest('hex');

    // 4. Salvar assinatura no banco
    await this.prisma.signature.create({
      data: {
        visitId: visit.id,
        signerName: dto.signerName,
        signerEmail: dto.signerEmail,
        signerIp: dto.signerIp,
        signerUserAgent: dto.signerUserAgent,
        signatureImagePath: imagePath,
        signatureHash,
        metadataHash,
        signatureData: dto.signatureData,
        approved: dto.approved,
        reason: dto.reason,
      },
    });

    // 5. Atualizar status da visita
    const newStatus = dto.approved ? VisitStatus.APPROVED : VisitStatus.REJECTED;
    const updatedVisit = await this.prisma.visit.update({
      where: { id: visit.id },
      data: {
        status: newStatus,
        signToken: null,    // invalidar token após uso
        signTokenExp: null,
        // exitAt não é mais preenchido aqui, será feito pela portaria no registerExit
      },
    });

    // 6. Notificar portaria sobre o resultado
    await this.notifications.notifyGuard(updatedVisit, dto.approved, dto.reason);

    return {
      success: true,
      approved: dto.approved,
      visitId: visit.id,
      visitorName: visit.visitorName,
      message: dto.approved ? 'Visita aprovada com sucesso!' : 'Visita rejeitada.',
      signatureHash,
    };
  }
}
