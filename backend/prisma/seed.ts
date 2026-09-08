import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // Seed Officer
  const officer = await prisma.user.upsert({
    where: { email: 'officer@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'officer@ssb.gov.in',
      name: 'Rajesh Kumar',
      role: Role.OFFICER,
      passwordHash,
    },
  });

  // Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'admin@ssb.gov.in',
      name: 'Anil Sharma',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  console.log(`✅ Seeded officer: ${officer.email} (id: ${officer.id})`);
  console.log(`✅ Seeded admin:   ${admin.email} (id: ${admin.id})`);
  console.log('🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
