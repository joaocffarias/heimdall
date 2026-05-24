import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { TenantsService } from './tenants.service';
import { Reflector } from '@nestjs/core';

@ApiTags('Estabelecimentos')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN')
  findAll() { return this.tenantsService.findAll(); }

  @Get('public/logo')
  async getPublicLogo() {
    return this.tenantsService.getPublicLogo();
  }

  @Post()
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN')
  create(@Body() dto: any) { return this.tenantsService.create(dto); }

  @Get('current/settings')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN', 'ADMIN')
  getSettings(@Request() req) {
    return this.tenantsService.getSettings(req.user.tenantId);
  }

  @Patch('current/settings')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN')
  async updateSettings(@Request() req, @Body() settings: any) {
    return this.tenantsService.updateSettings(req.user.tenantId, settings);
  }

  @Post('current/ldap/test')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN', 'ADMIN')
  async testLdapConnection(@Request() req, @Body() config: any) {
    return this.tenantsService.testLdapConnection(req.user.tenantId, config);
  }

  @Post('current/logo')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.tenantsService.uploadLogo(req.user.tenantId, file);
  }

  @Get('current/logo/url')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getLogoUrl(@Request() req) {
    return this.tenantsService.getLogoUrl(req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN', 'ADMIN')
  findOne(@Param('id') id: string) { return this.tenantsService.findOne(id); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: any) { return this.tenantsService.update(id, dto); }
}
