import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { authenticate } from 'ldap-authentication';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  async login(email: string, password: string, tenantSlug?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        active: true,
        tenant: tenantSlug ? { slug: tenantSlug } : undefined,
      },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    let valid = false;
    const settings = user.tenant?.settings as any || {};
    const ldapEnabled = settings.ldapEnabled;

    if (ldapEnabled) {
      try {
        // Extrai o atributo de busca (ex: 'mail' ou 'sAMAccountName') do filtro, por padrão 'mail'
        const filterMatch = settings.ldapSearchFilter?.match(/\(([^=]+)=/);
        const usernameAttribute = filterMatch ? filterMatch[1] : 'mail';

        const options = {
          ldapOpts: { url: settings.ldapUrl },
          adminDn: settings.ldapBindDn,
          adminPassword: settings.ldapBindCredentials,
          userPassword: password,
          userSearchBase: settings.ldapSearchBase,
          usernameAttribute,
          username: email
        };

        const ldapUser = await authenticate(options);
        if (ldapUser) {
          valid = true;
          this.logger.log(`Autenticação LDAP com sucesso para: ${email}`);
        }
      } catch (err: any) {
        this.logger.warn(`Falha no LDAP para ${email}. Motivo: ${err.message}. Tentando fallback local...`);
        valid = await bcrypt.compare(password, user.password);
      }
    } else {
      valid = await bcrypt.compare(password, user.password);
    }

    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      forcePasswordChange: user.forcePasswordChange,
    };

    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        tenantSlug: user.tenant.slug,
        forcePasswordChange: user.forcePasswordChange,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
  }

  async changePassword(userId: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        forcePasswordChange: false,
      },
      select: { id: true, name: true, forcePasswordChange: true },
    });
  }
}
