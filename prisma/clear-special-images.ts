import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { deleteImage } from '../src/lib/storage';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing images from Food & Drink specials...');

  const specials = await prisma.event.findMany({
    where: {
      imageUrl: { not: null },
      categories: { some: { name: 'food-deal' } },
    },
    select: { id: true, title: true, imageUrl: true },
  });

  if (specials.length === 0) {
    console.log('No food-deal events with images found.');
    return;
  }

  console.log(`Found ${specials.length} special(s) with images:`);
  for (const special of specials) {
    console.log(`  - ${special.title} (${special.id})`);
    if (special.imageUrl) {
      try {
        await deleteImage(special.imageUrl);
        console.log(`    Deleted storage file for ${special.id}`);
      } catch (err) {
        console.warn(`    Storage delete skipped for ${special.id}:`, err);
      }
    }
  }

  const result = await prisma.event.updateMany({
    where: {
      id: { in: specials.map((s) => s.id) },
    },
    data: { imageUrl: null },
  });

  console.log(`Cleared imageUrl on ${result.count} event(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
