import { Controller, Get, Post, UseGuards, Request, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { SystemService } from './system.service';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Sistema')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get('backup/full')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async exportFullBackup(@Request() req, @Res() res: Response) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=heimdall-full-backup.zip');
    await this.systemService.exportFullBackup(req.user.tenantId, res);
  }

  @Post('restore')
  @Roles('SUPER_ADMIN')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async restoreBackup(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Arquivo não encontrado');
    }
    return this.systemService.restoreBackup(req.user.tenantId, file);
  }
}
