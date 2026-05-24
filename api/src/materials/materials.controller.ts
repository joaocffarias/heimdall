import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, UseInterceptors, UploadedFile, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { MaterialsService } from './materials.service';

@ApiTags('Materiais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits/:visitId/materials')
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  findAll(@Param('visitId') visitId: string) {
    return this.materialsService.findByVisit(visitId);
  }

  @Post()
  @ApiOperation({ summary: 'Adicionar material à visita' })
  create(@Param('visitId') visitId: string, @Body() dto: any) {
    return this.materialsService.create(visitId, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Adicionar múltiplos materiais de uma vez' })
  createMany(@Param('visitId') visitId: string, @Body() dto: { materials: any[] }) {
    return this.materialsService.createMany(visitId, dto.materials);
  }

  @Delete(':materialId')
  delete(@Param('materialId') id: string) {
    return this.materialsService.delete(id);
  }

  @Post(':materialId/photos')
  @ApiOperation({ summary: 'Upload de foto do material' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('materialId') materialId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.materialsService.addPhoto(materialId, file);
  }

  @Get('photos/:photoId/url')
  getPhotoUrl(@Param('photoId') photoId: string) {
    return this.materialsService.getPhotoUrl(photoId);
  }

  @Delete('photos/:photoId')
  deletePhoto(@Param('photoId') photoId: string) {
    return this.materialsService.deletePhoto(photoId);
  }
}
