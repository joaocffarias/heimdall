const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenant = await prisma.tenant.findFirst({
      select: { id: true, settings: true }
    });
    console.log('Success!', tenant);
  } catch (err) {
    console.error('Error!', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
