import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from './guards';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login do usuário' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.tenantSlug);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alteração obrigatória de senha no primeiro acesso' })
  changePassword(@Request() req, @Body('password') password: string) {
    return this.authService.changePassword(req.user.sub, password);
  }
}
