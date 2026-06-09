import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { UsersService } from './users.service';
import { Reflector } from '@nestjs/core';

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, new RolesGuard(new Reflector()))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'GUARD')
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: any, @Request() req) {
    return this.usersService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.usersService.update(id, req.user.tenantId, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggleStatus(@Param('id') id: string, @Body('active') active: boolean) {
    return this.usersService.toggleStatus(id, active);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
