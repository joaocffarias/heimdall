import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { authenticate } from 'ldap-authentication';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  findAll() {
    return this.prisma.tenant.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  create(data: any) {
    return this.prisma.tenant.create({ data });
  }

  update(id: string, data: any) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async getSettings(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { settings: true, logoPath: true },
    });
    return tenant;
  }

  updateSettings(id: string, settings: any) {
    return this.prisma.tenant.update({
      where: { id },
      data: { settings },
    });
  }

  async testLdapConnection(id: string, config: any) {
    try {
      const filterMatch = config.ldapSearchFilter?.match(/\(([^=]+)=/);
      const usernameAttribute = filterMatch ? filterMatch[1] : 'mail';

      const options = {
        ldapOpts: { url: config.ldapUrl },
        adminDn: config.ldapBindDn,
        adminPassword: config.ldapBindCredentials,
        userPassword: config.testPassword,
        userSearchBase: config.ldapSearchBase,
        usernameAttribute,
        username: config.testUser
      };

      const ldapUser = await authenticate(options);
      if (!ldapUser) {
        throw new Error('Usuário não encontrado no LDAP ou senha incorreta.');
      }
      return { success: true, message: 'Conexão LDAP bem sucedida!' };
    } catch (err: any) {
      throw new BadRequestException(`Falha na conexão LDAP: ${err.message}`);
    }
  }

  async uploadLogo(id: string, file: any) {
    const ext = file.originalname.split('.').pop();
    const path = `tenants/${id}/logo.${ext}`;
    
    await this.storage.upload(path, file.buffer, file.mimetype);
    
    return this.prisma.tenant.update({
      where: { id },
      data: { logoPath: path },
    });
  }

  async getLogoUrl(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { logoPath: true },
    });
    
    if (!tenant?.logoPath) return { url: null };
    
    return { url: this.storage.getPublicUrl(tenant.logoPath) };
  }

  async getPublicLogo() {
    const tenant = await this.prisma.tenant.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { logoPath: true },
    });
    
    if (!tenant?.logoPath) return { url: null };
    
    return { url: this.storage.getPublicUrl(tenant.logoPath) };
  }
}
