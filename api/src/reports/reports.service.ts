import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) { }

  async generateVisitPdf(visitId: string, tenantId: string): Promise<Buffer> {
    const visit = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId },
      include: {
        materials: { include: { photos: true } },
        signature: true,
        tenant: true,
      },
    });

    if (!visit) throw new NotFoundException('Visita não encontrada');

    // Usando pdfmake para gerar PDF
    const PdfPrinter = require('pdfmake');
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const now = new Date();
    const formatDate = (d: Date | null) =>
      d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';

    const materialsRows = visit.materials.map((m) => [
      { text: m.name, style: 'tableCell' },
      { text: m.category, style: 'tableCell' },
      { text: String(m.quantity), style: 'tableCell' },
      { text: m.serialNumber || '—', style: 'tableCell' },
      { text: m.brand || '—', style: 'tableCell' },
    ]);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#1e293b' },
      styles: {
        header: { fontSize: 20, bold: true, color: '#1e3a5f', margin: [0, 0, 0, 4] },
        subheader: { fontSize: 12, bold: true, color: '#334155', margin: [0, 16, 0, 4] },
        label: { fontSize: 9, color: '#64748b', bold: true },
        value: { fontSize: 10, color: '#1e293b' },
        tableHeader: { bold: true, fontSize: 9, fillColor: '#1e293b', color: '#ffffff' },
        tableCell: { fontSize: 9, color: '#334155' },
        approved:    { bold: true, color: '#16a34a', fontSize: 12 },
        rejected:    { bold: true, color: '#dc2626', fontSize: 12 },
        inpremises:  { bold: true, color: '#2563eb', fontSize: 12 },
        pending:     { bold: true, color: '#d97706', fontSize: 12 },
      },
      content: [
        // Cabeçalho
        {
          columns: [
            { text: 'HEIMDALL', style: 'header', width: '*' },
            { text: `Emitido em: ${formatDate(now)}`, alignment: 'right', fontSize: 9, color: '#94a3b8', width: 'auto' },
          ],
        },
        { text: 'Comprovante de Controle de Materiais', fontSize: 12, color: '#64748b', margin: [0, 0, 0, 16] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },

        // Status
        (() => {
          const statusMap: Record<string, { label: string; style: string }> = {
            APPROVED:    { label: '[ APROVADA ]',        style: 'approved' },
            COMPLETED:   { label: '[ CONCLUIDA ]',       style: 'approved' },
            IN_PREMISES: { label: '[ NO LOCAL ]',        style: 'inpremises' },
            UNDER_REVIEW:{ label: '[ EM REVISAO ]',      style: 'pending' },
            PENDING:     { label: '[ PENDENTE ]',        style: 'pending' },
            REJECTED:    { label: '[ REJEITADA ]',       style: 'rejected' },
            CANCELLED:   { label: '[ CANCELADA ]',       style: 'rejected' },
          };
          const s = statusMap[visit.status] ?? { label: `[ ${visit.status} ]`, style: 'pending' };
          return { text: s.label, style: s.style, margin: [0, 12, 0, 12] };
        })(),

        // Dados do visitante
        { text: 'DADOS DO VISITANTE', style: 'subheader' },
        {
          columns: [
            [
              { text: 'Nome', style: 'label' },
              { text: visit.visitorName, style: 'value' },
              { text: 'Documento', style: 'label', margin: [0, 8, 0, 0] },
              { text: visit.visitorDoc, style: 'value' },
            ],
            [
              { text: 'Empresa', style: 'label' },
              { text: visit.visitorCompany || '—', style: 'value' },
              { text: 'Telefone', style: 'label', margin: [0, 8, 0, 0] },
              { text: visit.visitorPhone || '—', style: 'value' },
            ],
          ],
          margin: [0, 0, 0, 8],
        },

        // Dados da visita
        { text: 'DADOS DA VISITA', style: 'subheader' },
        {
          columns: [
            [
              { text: 'Destino / Setor', style: 'label' },
              { text: visit.destination, style: 'value' },
              { text: 'Entrada', style: 'label', margin: [0, 8, 0, 0] },
              { text: formatDate(visit.entryAt), style: 'value' },
            ],
            [
              { text: 'Motivo', style: 'label' },
              { text: visit.purpose, style: 'value' },
              { text: 'Saída', style: 'label', margin: [0, 8, 0, 0] },
              { text: formatDate(visit.exitAt), style: 'value' },
            ],
          ],
          margin: [0, 0, 0, 8],
        },

        // Lista de materiais
        { text: `MATERIAIS (${visit.materials.length} item${visit.materials.length !== 1 ? 's' : ''})`, style: 'subheader' },
        visit.materials.length > 0 ? {
          table: {
            headerRows: 1,
            widths: ['*', 80, 40, 80, 80],
            body: [
              [
                { text: 'Material', style: 'tableHeader' },
                { text: 'Categoria', style: 'tableHeader' },
                { text: 'Qtd', style: 'tableHeader' },
                { text: 'Nº Série', style: 'tableHeader' },
                { text: 'Marca', style: 'tableHeader' },
              ],
              ...materialsRows,
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        } : { text: 'Nenhum material registrado.', color: '#94a3b8', margin: [0, 0, 0, 16] },

        // Fotos de materiais
        ...(await (async () => {
          const materialPhotosContent: any[] = [];
          let hasPhotos = false;
          for (const mat of visit.materials) {
            if (mat.photos && mat.photos.length > 0) {
              hasPhotos = true;
              materialPhotosContent.push({ text: `Imagens do material: ${mat.name}`, style: 'label', margin: [0, 8, 0, 8] });
              for (const photo of mat.photos) {
                try {
                  const buffer = await this.storage.get(photo.storagePath);
                  const base64 = `data:${photo.mimeType};base64,${buffer.toString('base64')}`;
                  materialPhotosContent.push({ image: base64, width: 200, margin: [0, 0, 0, 12] });
                } catch (e) {
                  materialPhotosContent.push({ text: '[ Erro ao carregar imagem ]', color: 'red', fontSize: 8, margin: [0, 0, 0, 12] });
                }
              }
            }
          }
          return hasPhotos ? [
            { text: 'IMAGENS CAPTURADAS', style: 'subheader' },
            ...materialPhotosContent
          ] : [];
        })()),

        // Assinatura
        visit.signature ? [
          { text: 'ASSINATURA DIGITAL', style: 'subheader' },
          {
            columns: [
              [
                { text: 'Responsável', style: 'label' },
                { text: visit.signature.signerName, style: 'value' },
                { text: 'Assinado em', style: 'label', margin: [0, 8, 0, 0] },
                { text: formatDate(visit.signature.signedAt), style: 'value' },
              ],
              [
                { text: 'E-mail', style: 'label' },
                { text: visit.signature.signerEmail || '—', style: 'value' },
                { text: 'IP', style: 'label', margin: [0, 8, 0, 0] },
                { text: visit.signature.signerIp, style: 'value' },
              ],
            ],
          },
          { text: 'Hash SHA-256', style: 'label', margin: [0, 8, 0, 2] },
          { text: visit.signature.signatureHash, fontSize: 7, color: '#94a3b8' },
        ] : { text: 'Sem assinatura registrada.', color: '#94a3b8' },

        // Rodapé
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }], margin: [0, 16, 0, 8] },
        {
          text: `Documento gerado automaticamente pelo sistema Heimdall • ${visit.tenant?.name || ''}  • ID: ${visit.id}`,
          fontSize: 8,
          color: '#94a3b8',
          alignment: 'center',
        },
      ],
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async generatePeriodReportPdf(tenantId: string, startDate: string, endDate: string, visits: any[]): Promise<Buffer> {
    const PdfPrinter = require('pdfmake');
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const formatDate = (d: Date | string | null) =>
      d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';

    const formatMaterials = (materials: any[]) => {
      if (!materials || materials.length === 0) return '—';
      return materials.map((m) => `${m.name} (${m.quantity})`).join('\n');
    };

    const rows = visits.map((v) => [
      {
        stack: [
          { text: 'Entrada:', style: 'dateLabelCell' },
          { text: v.entryAt ? formatDate(v.entryAt) : formatDate(v.createdAt), style: 'tableCell' },
          { text: 'Saída:', style: 'dateLabelCell', margin: [0, 3, 0, 0] },
          { text: v.exitAt ? formatDate(v.exitAt) : '—', style: 'tableCellMuted' },
        ],
      },
      { text: v.visitorName, style: 'tableCell' },
      { text: v.visitorType || 'VISITANTE', style: 'tableCell' },
      { text: v.destination, style: 'tableCell' },
      { text: v.createdBy?.name || '—', style: 'tableCell' },
      { text: v.signature?.signerName || '—', style: 'tableCell' },
      { text: formatMaterials(v.materials), style: 'tableCell' },
      { text: v.status, style: 'tableCell' },
    ]);

    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [30, 40, 30, 40],
      defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#1e293b' },
      styles: {
        header: { fontSize: 18, bold: true, color: '#1e3a5f', margin: [0, 0, 0, 4] },
        subheader: { fontSize: 11, bold: true, color: '#334155', margin: [0, 10, 0, 4] },
        tableHeader: { bold: true, fontSize: 9, fillColor: '#1e293b', color: '#ffffff' },
        tableCell: { fontSize: 8, color: '#334155' },
        tableCellMuted: { fontSize: 8, color: '#94a3b8' },
        dateLabelCell: { fontSize: 7, color: '#64748b', bold: true },
      },
      content: [
        {
          columns: [
            { text: 'HEIMDALL', style: 'header', width: '*' },
            { text: `Gerado em: ${formatDate(new Date())}`, alignment: 'right', fontSize: 9, color: '#94a3b8', width: 'auto' },
          ],
        },
        { text: 'Relatório de Visitas por Período', fontSize: 12, color: '#64748b', margin: [0, 0, 0, 10] },
        { text: `Período: ${startDate} até ${endDate}`, fontSize: 10, color: '#1e293b', margin: [0, 0, 0, 16] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 780, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }] },

        {
          table: {
            headerRows: 1,
            widths: [90, '*', 55, 70, 75, 75, 90, 55],
            body: [
              [
                { text: 'Entrada / Saída', style: 'tableHeader' },
                { text: 'Visitante', style: 'tableHeader' },
                { text: 'Vínculo', style: 'tableHeader' },
                { text: 'Destino', style: 'tableHeader' },
                { text: 'Registrado por', style: 'tableHeader' },
                { text: 'Autorizado por', style: 'tableHeader' },
                { text: 'Itens / Qtd', style: 'tableHeader' },
                { text: 'Status', style: 'tableHeader' },
              ],
              ...rows,
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 15, 0, 0],
        },
      ],
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async getVisitsByPeriod(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.visit.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        createdBy: { select: { name: true } },
        signature: { select: { signerName: true } },
        materials: { select: { name: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
