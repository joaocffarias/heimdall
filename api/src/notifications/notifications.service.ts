import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.mailer = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: Number(this.config.get('SMTP_PORT', 587)),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  // ─── Notificar responsável para assinar ──────────────────────────
  async notifyResponsible(visit: any) {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const signUrl = `${webUrl}/sign/${visit.signToken}`;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: visit.tenantId }, select: { settings: true } });
    const settings = tenant?.settings as any || {};

    const message = this.buildSignMessage(visit, signUrl);

    // E-mail
    if (visit.responsibleEmail) {
      await this.sendEmail({
        to: visit.responsibleEmail,
        subject: `🛡️ Heimdall — Autorização necessária: ${visit.visitorName}`,
        html: this.buildEmailHtml(visit, signUrl),
        tenantSettings: settings
      });
      await this.logNotification(visit.id, 'VISIT_PENDING_REVIEW', 'EMAIL', visit.responsibleEmail);
    }

    // WhatsApp
    if (visit.responsibleWhatsapp) {
      await this.sendWhatsApp(visit.responsibleWhatsapp, message, settings);
      await this.logNotification(visit.id, 'VISIT_PENDING_REVIEW', 'WHATSAPP', visit.responsibleWhatsapp);
    }

    // SMS
    if (visit.responsiblePhone && this.config.get('TWILIO_ACCOUNT_SID')) {
      const smsText = `Heimdall: Visita de ${visit.visitorName} aguarda sua autorização. Acesse: ${signUrl}`;
      await this.sendSms(visit.responsiblePhone, smsText);
      await this.logNotification(visit.id, 'VISIT_PENDING_REVIEW', 'SMS', visit.responsiblePhone);
    }
  }

  // ─── Notificar portaria sobre o resultado ────────────────────────
  async notifyGuard(visit: any, approved: boolean, reason?: string) {
    const status = approved ? '✅ APROVADA' : '❌ REJEITADA';
    const msg = approved
      ? `Saída de ${visit.visitorName} foi APROVADA. Libere a saída no sistema.`
      : `Saída de ${visit.visitorName} foi REJEITADA. Motivo: ${reason || 'Não informado'}`;

    this.logger.log(`[Portaria] ${status}: Visit ${visit.id}`);
    // WebSocket é emitido pelo EventsGateway via Prisma events ou polling
  }

  // ─── Envio de E-mail ─────────────────────────────────────────────
  private async sendEmail(opts: { to: string; subject: string; html: string; tenantSettings?: any }) {
    try {
      let transporter = this.mailer;
      let from = this.config.get('SMTP_FROM', 'Heimdall <noreply@heimdall.local>');

      if (opts.tenantSettings?.smtpHost) {
        transporter = nodemailer.createTransport({
          host: opts.tenantSettings.smtpHost,
          port: Number(opts.tenantSettings.smtpPort) || 587,
          secure: opts.tenantSettings.smtpSecure === true,
          auth: {
            user: opts.tenantSettings.smtpUser,
            pass: opts.tenantSettings.smtpPass,
          },
        });
        if (opts.tenantSettings.smtpFrom) {
          from = opts.tenantSettings.smtpFrom;
        }
      }

      await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      this.logger.log(`📧 E-mail enviado para ${opts.to}`);
    } catch (err: any) {
      this.logger.error(`❌ Falha ao enviar e-mail para ${opts.to}: ${err.message}`);
    }
  }

  // ─── Envio de WhatsApp via Evolution API ─────────────────────────
  private async sendWhatsApp(phone: string, message: string, tenantSettings?: any) {
    const apiUrl = tenantSettings?.evolutionUrl || this.config.get('EVOLUTION_API_URL');
    const apiKey = tenantSettings?.evolutionKey || this.config.get('EVOLUTION_API_KEY');
    const instance = tenantSettings?.evolutionInstance || this.config.get('EVOLUTION_INSTANCE', 'heimdall');

    if (!apiUrl || !apiKey) {
      this.logger.warn('⚠️  Evolution API não configurada — WhatsApp não enviado');
      return;
    }

    // Normalizar número: apenas dígitos, com código do país
    const normalized = phone.replace(/\D/g, '');
    const number = normalized.startsWith('55') ? normalized : `55${normalized}`;

    try {
      const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number,
          text: message,
        }),
      });
      if (res.ok) {
        this.logger.log(`📱 WhatsApp enviado para ${number}`);
      } else {
        const err = await res.text();
        this.logger.error(`❌ WhatsApp falhou: ${err}`);
      }
    } catch (err: any) {
      this.logger.error(`❌ Falha ao enviar WhatsApp: ${err.message}`);
    }
  }

  // ─── Envio de SMS via Twilio ─────────────────────────────────────
  private async sendSms(phone: string, message: string) {
    const sid = this.config.get('TWILIO_ACCOUNT_SID');
    const token = this.config.get('TWILIO_AUTH_TOKEN');
    const from = this.config.get('TWILIO_FROM_NUMBER');

    if (!sid || !token || !from) {
      this.logger.warn('⚠️  Twilio não configurado — SMS não enviado');
      return;
    }

    try {
      // Importação dinâmica para não quebrar se pacote não estiver instalado
      const twilio = require('twilio');
      const client = twilio(sid, token);
      await client.messages.create({ body: message, from, to: phone });
      this.logger.log(`📲 SMS enviado para ${phone}`);
    } catch (err) {
      this.logger.error(`❌ Falha ao enviar SMS: ${err.message}`);
    }
  }

  // ─── Log de notificações no banco ───────────────────────────────
  private async logNotification(
    visitId: string,
    type: string,
    channel: string,
    recipient: string,
    status = 'sent',
    errorMsg?: string,
  ) {
    await this.prisma.notificationLog.create({
      data: {
        visitId,
        type: type as any,
        channel: channel as any,
        recipient,
        status,
        errorMsg,
      },
    }).catch(() => null);
  }

  // ─── Templates ───────────────────────────────────────────────────
  private buildSignMessage(visit: any, signUrl: string): string {
    return (
      `🛡️ *HEIMDALL — Autorização de Saída*\n\n` +
      `Olá, ${visit.responsibleName}!\n\n` +
      `O visitante *${visit.visitorName}* está aguardando sua autorização de saída.\n\n` +
      `📦 Observações da Portaria:\n_${visit.materialChanges || 'Nenhuma observação'}_\n\n` +
      `Para autorizar ou bloquear a saída, acesse o link abaixo:\n` +
      `🔗 ${signUrl}\n\n` +
      `_Link válido por 48 horas._`
    );
  }

  private buildEmailHtml(visit: any, signUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:20px}
  .card{background:#1e293b;border-radius:12px;padding:32px;max-width:560px;margin:0 auto;border:1px solid #334155}
  .logo{font-size:24px;font-weight:bold;color:#60a5fa;margin-bottom:24px}
  .field{margin:12px 0;padding:12px;background:#0f172a;border-radius:8px;border-left:3px solid #3b82f6}
  .label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
  .value{font-size:16px;color:#f1f5f9;margin-top:2px}
  .btn{display:inline-block;background:#3b82f6;color:#fff;padding:14px 28px;border-radius:8px;
       text-decoration:none;font-weight:bold;margin-top:24px;font-size:16px}
  .footer{margin-top:24px;font-size:12px;color:#475569;border-top:1px solid #334155;padding-top:16px}
</style></head>
<body>
<div class="card">
  <div class="logo">🛡️ Heimdall</div>
  <h2 style="color:#f1f5f9;margin:0 0 8px">Autorização de Saída Necessária</h2>
  <p style="color:#94a3b8;margin:0 0 24px">Olá, <strong>${visit.responsibleName}</strong>! Sua assinatura é necessária.</p>

  <div class="field"><div class="label">Visitante</div><div class="value">${visit.visitorName}</div></div>
  ${visit.visitorDoc ? `<div class="field"><div class="label">Documento</div><div class="value">${visit.visitorDoc}</div></div>` : ''}
  ${visit.visitorCompany ? `<div class="field"><div class="label">Empresa</div><div class="value">${visit.visitorCompany}</div></div>` : ''}
  
  <div class="field" style="border-left-color: #3b82f6; background: #0f172a; color: #e2e8f0;">
    <div class="label" style="color: #60a5fa;">📝 Observações da Portaria</div>
    <div class="value">${visit.materialChanges || 'Nenhuma observação'}</div>
  </div>

  <a href="${signUrl}" class="btn">✍️ Assinar e Autorizar Saída</a>

  <div class="footer">
    Este link é único e válido por 48 horas.<br>
    Ao acessar, você poderá ver os materiais, aprovar ou rejeitar a entrada.<br>
    <strong>Heimdall</strong> — Sistema de Controle de Acesso
  </div>
</div>
</body>
</html>`;
  }
}
