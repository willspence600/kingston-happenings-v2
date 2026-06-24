import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { venue: true }
  });

  console.log("=== Last 3 Events ===");
  events.forEach((e: any) => {
    console.log(`ID: ${e.id}`);
    console.log(`Title: ${e.title}`);
    console.log(`Status: ${e.status}`);
    console.log(`ImageUrl: ${e.imageUrl}`);
    console.log(`Venue Name: ${e.venue.name}`);
    console.log(`Venue ImageUrl: ${e.venue.imageUrl}`);
    console.log("-------------------");
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
