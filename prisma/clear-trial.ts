import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const PREFIX = 'trial-';

async function main() {
  // Categories and likes cascade on event delete; events cascade on venue delete.
  const events = await prisma.event.deleteMany({ where: { id: { startsWith: PREFIX } } });
  const venues = await prisma.venue.deleteMany({ where: { id: { startsWith: PREFIX } } });
  console.log(`Removed ${events.count} trial events/specials and ${venues.count} trial venues. Other listings untouched.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
