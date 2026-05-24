import { Controller, Get, Param, Res, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { ReportsService } from './reports.service';
import { Response } from 'express';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) { }

  @Get('visits/:id/pdf')
  @ApiOperation({ summary: 'Gerar PDF de comprovante da visita' })
  async downloadPdf(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const pdf = await this.reportsService.generateVisitPdf(id, req.user.tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="visita-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  }

  @Get('period/pdf')
  @ApiOperation({ summary: 'Gerar PDF de relatório por período' })
  async downloadPeriodPdf(
    @Request() req,
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const visits = await this.reportsService.getVisitsByPeriod(req.user.tenantId, startDate, endDate);
    const pdf = await this.reportsService.generatePeriodReportPdf(req.user.tenantId, startDate, endDate, visits);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-${startDate}-${endDate}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  }
}
