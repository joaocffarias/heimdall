import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar tenant padrão
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'principal' },
    update: {},
    create: {
      name: 'Estabelecimento Principal',
      slug: 'principal',
      address: 'Av. Principal, 1000',
      email: 'contato@estabelecimento.com',
      phone: '(11) 9999-9999',
    },
  });

  console.log(`✅ Tenant criado: ${tenant.name}`);

  // Criar super admin
  const superAdminPassword = await bcrypt.hash('admin@2025', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email_tenantId: { email: 'superadmin@heimdall.local', tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Super Administrador',
      email: 'superadmin@heimdall.local',
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log(`✅ Super Admin criado: ${superAdmin.email}`);

  // Criar porteiro padrão
  const guardPassword = await bcrypt.hash('portaria@2025', 12);
  const guard = await prisma.user.upsert({
    where: { email_tenantId: { email: 'portaria@heimdall.local', tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Porteiro Padrão',
      email: 'portaria@heimdall.local',
      password: guardPassword,
      role: UserRole.GUARD,
    },
  });

  console.log(`✅ Porteiro criado: ${guard.email}`);

  // Criar responsável padrão
  const responsiblePassword = await bcrypt.hash('responsavel@2025', 12);
  const responsible = await prisma.user.upsert({
    where: { email_tenantId: { email: 'responsavel@heimdall.local', tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Responsável Padrão',
      email: 'responsavel@heimdall.local',
      password: responsiblePassword,
      role: UserRole.RESPONSIBLE,
    },
  });

  console.log(`✅ Responsável criado: ${responsible.email}`);

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Credenciais de acesso:');
  console.log(`   Super Admin : superadmin@heimdall.local / admin@2025`);
  console.log(`   Porteiro    : portaria@heimdall.local   / portaria@2025`);
  console.log(`   Responsável : responsavel@heimdall.local / responsavel@2025`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
