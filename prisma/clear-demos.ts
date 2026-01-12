import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Also try .env

const prisma = new PrismaClient();

const DEMO_PREFIX = 'demo-';

async function main() {
  console.log('🧹 Clearing demo events...');

  // Find all demo events
  const demoEvents = await prisma.event.findMany({
    where: {
      id: {
        startsWith: DEMO_PREFIX,
      },
    },
    select: { id: true, title: true },
  });

  if (demoEvents.length === 0) {
    console.log('ℹ️  No demo events found.');
    return;
  }

  console.log(`Found ${demoEvents.length} demo events to remove:`);
  demoEvents.forEach((e) => console.log(`  - ${e.title}`));

  // Delete categories and likes first (foreign key constraints)
  await prisma.eventCategory.deleteMany({
    where: {
      eventId: {
        startsWith: DEMO_PREFIX,
      },
    },
  });

  await prisma.like.deleteMany({
    where: {
      eventId: {
        startsWith: DEMO_PREFIX,
      },
    },
  });

  // Delete demo events
  const result = await prisma.event.deleteMany({
    where: {
      id: {
        startsWith: DEMO_PREFIX,
      },
    },
  });

  console.log(`✅ Removed ${result.count} demo events`);
  console.log('');
  console.log('💡 Real user-submitted events were NOT affected.');
  console.log('💡 To add demo events back, run: npm run db:seed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

