import { PrismaClient } from '@prisma/client';
import { addDays, format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const EVENT_PREFIX = 'two-week-fake-';

const venues = [
  {
    id: 'fake-venue-market-square',
    name: 'Market Square',
    address: '216 Ontario St, Kingston, ON',
    neighborhood: 'Downtown',
  },
  {
    id: 'fake-venue-waterfront',
    name: 'Waterfront Park',
    address: 'Ontario St, Kingston, ON',
    neighborhood: 'Waterfront',
  },
  {
    id: 'fake-venue-princess-st',
    name: 'Princess Street Hall',
    address: '300 Princess St, Kingston, ON',
    neighborhood: 'Downtown',
  },
  {
    id: 'fake-venue-west-end',
    name: 'West End Community Centre',
    address: '1300 Bath Rd, Kingston, ON',
    neighborhood: 'West End',
  },
  {
    id: 'fake-venue-queens',
    name: "Queen's Campus Green",
    address: '99 University Ave, Kingston, ON',
    neighborhood: "Queen's University",
  },
];

const templates = [
  {
    title: 'Live Music Night',
    description: 'A relaxed evening of local bands, familiar covers, and original Kingston sounds.',
    categories: ['concert', 'nightlife'],
    startTime: '20:00',
    endTime: '23:00',
    price: '$10',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
  },
  {
    title: 'Trivia & Pints',
    description: 'Bring a team, grab a table, and test your knowledge across music, movies, history, and local lore.',
    categories: ['trivia', 'nightlife'],
    startTime: '19:00',
    endTime: '21:30',
    price: 'Free',
    imageUrl: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800',
  },
  {
    title: 'Makers Market',
    description: 'Browse handmade goods, vintage finds, baked treats, and art from Kingston-area vendors.',
    categories: ['market', 'community'],
    startTime: '10:00',
    endTime: '15:00',
    price: 'Free',
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
  },
  {
    title: 'Waterfront Yoga',
    description: 'An all-levels outdoor yoga class with lake views. Bring a mat and water.',
    categories: ['sports', 'workshop'],
    startTime: '08:30',
    endTime: '09:30',
    price: '$15',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
  },
  {
    title: 'Comedy Showcase',
    description: 'Local comics and touring guests share new material in a casual evening show.',
    categories: ['comedy', 'nightlife'],
    startTime: '20:30',
    endTime: '22:30',
    price: '$18',
    imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800',
  },
  {
    title: 'Family Craft Afternoon',
    description: 'Drop in for family-friendly crafts, snacks, and a low-key community hangout.',
    categories: ['family', 'workshop'],
    startTime: '13:00',
    endTime: '16:00',
    price: 'Free',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800',
  },
  {
    title: 'Food Truck Pop-Up',
    description: 'Rotating local food trucks with quick bites, patio seating, and afternoon specials.',
    categories: ['food-deal', 'food'],
    startTime: '12:00',
    endTime: '18:00',
    price: '$8-$18',
    imageUrl: null,
  },
  {
    title: 'Open Mic Night',
    description: 'Music, poetry, comedy, and spoken word. Sign up at the door and cheer on local performers.',
    categories: ['concert', 'community'],
    startTime: '19:30',
    endTime: '22:30',
    price: 'Free',
    imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800',
  },
];

async function main() {
  const today = new Date();
  const daysToSeed = 14;
  const eventsPerDay = 4;

  console.log(`Seeding ${daysToSeed * eventsPerDay} fake events from ${format(today, 'yyyy-MM-dd')}...`);

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { id: venue.id },
      update: venue,
      create: venue,
    });
  }

  await prisma.eventCategory.deleteMany({
    where: { eventId: { startsWith: EVENT_PREFIX } },
  });
  await prisma.like.deleteMany({
    where: { eventId: { startsWith: EVENT_PREFIX } },
  });
  await prisma.event.deleteMany({
    where: { id: { startsWith: EVENT_PREFIX } },
  });

  let created = 0;

  for (let dayOffset = 0; dayOffset < daysToSeed; dayOffset++) {
    const date = format(addDays(today, dayOffset), 'yyyy-MM-dd');

    for (let slot = 0; slot < eventsPerDay; slot++) {
      const template = templates[(dayOffset * eventsPerDay + slot) % templates.length];
      const venue = venues[(dayOffset + slot) % venues.length];
      const id = `${EVENT_PREFIX}${date}-${slot + 1}`;

      await prisma.event.create({
        data: {
          id,
          title: `${template.title} (${format(addDays(today, dayOffset), 'MMM d')})`,
          description: template.description,
          date,
          startTime: template.startTime,
          endTime: template.endTime,
          venueId: venue.id,
          price: template.price,
          imageUrl: template.imageUrl,
          featured: slot === 0,
          status: 'approved',
          categories: {
            create: template.categories.map((name) => ({ name })),
          },
        },
      });

      created++;
    }
  }

  console.log(`Created ${created} fake events across ${daysToSeed} days.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
