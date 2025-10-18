/**
 * Seed Demo Data
 * Creates sample users for quick testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding demo data...\n');

  // Create demo users
  const users = [
    { name: 'Alice Smith', cardLast4: '1111' },
    { name: 'Bob Johnson', cardLast4: '2222' },
    { name: 'Carol Williams', cardLast4: '3333' },
  ];

  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        primaryPanMasked: `4111********${userData.cardLast4}`,
        cardLast4: userData.cardLast4,
      },
    });
    console.log(`✅ Created user: ${user.name} (****${user.cardLast4})`);
  }

  // Create initial pool record
  const pool = await prisma.pool.create({
    data: {
      amountTotal: 0,
    },
  });
  console.log(`\n✅ Created pool: $${pool.amountTotal}`);

  console.log('\n✨ Seeding complete!\n');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


