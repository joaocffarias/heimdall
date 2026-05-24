import { Controller, Post, Body, Param, Ip, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';

@ApiTags('Assinatura Digital')
@Controller('public/sign')
export class SignaturesController {
  constructor(private signaturesService: SignaturesService) {}

  @Post(':token')
  @ApiOperation({ summary: 'Processar assinatura digital via token (rota pública)' })
  sign(
    @Param('token') token: string,
    @Body() dto: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.signaturesService.sign(token, {
      ...dto,
      signerIp: ip,
      signerUserAgent: userAgent,
    });
  }
}
