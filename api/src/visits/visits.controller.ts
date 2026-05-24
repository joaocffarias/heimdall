import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, Delete, Res
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { VisitsService } from './visits.service';
import { MaterialsService } from '../materials/materials.service';

@ApiTags('Visitas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(
    private visitsService: VisitsService,
    private materialsService: MaterialsService,
  ) {}

  @Get('photos/:photoId/url')
  @ApiOperation({ summary: 'Obter URL pública de uma foto de material' })
  getPhotoUrl(@Param('photoId') photoId: string) {
    return this.materialsService.getPhotoUrl(photoId);
  }

  @Get('photos/:photoId/file')
  @ApiOperation({ summary: 'Baixar o arquivo de uma foto de material' })
  async getPhotoFile(@Param('photoId') photoId: string, @Res() res: any) {
    const { buffer, mimeType } = await this.materialsService.getPhotoFile(photoId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  }

  @Get('stats/today')
  @ApiOperation({ summary: 'Estatísticas do dia' })
  getDailyStats(@Request() req) {
    return this.visitsService.getDailyStats(req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar visitas do dia' })
  findAll(
    @Request() req,
    @Query('query') query: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status: string,
  ) {
    return this.visitsService.findAll(req.user.tenantId, query, startDate, endDate, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar visita por ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.visitsService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova visita' })
  create(@Body() dto: any, @Request() req) {
    return this.visitsService.create(req.user.tenantId, req.user.id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Enviar para análise e notificar responsável' })
  submit(@Param('id') id: string, @Request() req) {
    return this.visitsService.submitForReview(id, req.user.tenantId);
  }

  @Post(':id/request-exit')
  @ApiOperation({ summary: 'Solicitar autorização de saída com mudança de materiais' })
  requestExit(@Param('id') id: string, @Body() dto: { materialChanges: string }, @Request() req) {
    return this.visitsService.requestExitReview(id, req.user.tenantId, dto.materialChanges);
  }

  @Patch(':id/exit')
  @ApiOperation({ summary: 'Registrar saída do visitante' })
  registerExit(@Param('id') id: string, @Request() req) {
    return this.visitsService.registerExit(id, req.user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar visita' })
  cancel(@Param('id') id: string, @Request() req) {
    return this.visitsService.cancel(id, req.user.tenantId);
  }
}

// ─── Controller público para assinatura (sem autenticação) ───────────────────
import { Controller as PublicController } from '@nestjs/common';

@ApiTags('Assinatura Pública')
@PublicController('public/sign')
export class PublicSignController {
  constructor(
    private visitsService: VisitsService,
    private materialsService: MaterialsService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Buscar dados da visita pelo token de assinatura' })
  getByToken(@Param('token') token: string) {
    return this.visitsService.findBySignToken(token);
  }

  @Get('photos/:photoId/url')
  @ApiOperation({ summary: 'Obter URL pública de foto de material para assinatura' })
  getPhotoUrl(@Param('photoId') photoId: string) {
    return this.materialsService.getPhotoUrl(photoId);
  }

  @Get('photos/:photoId/file')
  @ApiOperation({ summary: 'Baixar o arquivo de uma foto de material publicamente' })
  async getPhotoFile(@Param('photoId') photoId: string, @Res() res: any) {
    const { buffer, mimeType } = await this.materialsService.getPhotoFile(photoId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  }
}
