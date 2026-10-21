import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

// Everything created here is tagged with this prefix so `npm run db:clear-trial` can remove it cleanly.
const PREFIX = 'trial-';

const venues = [
  { id: `${PREFIX}venue-1`, name: 'Trial Venue: The Lakeside Tap', address: '1 Ontario St, Kingston, ON', neighborhood: 'Downtown' },
  { id: `${PREFIX}venue-2`, name: 'Trial Venue: Princess Street Social', address: '250 Princess St, Kingston, ON', neighborhood: 'Downtown' },
  { id: `${PREFIX}venue-3`, name: 'Trial Venue: Westbrook Hall', address: '1200 Bath Rd, Kingston, ON', neighborhood: 'West End' },
  { id: `${PREFIX}venue-4`, name: "Trial Venue: Queen's Commons", address: '99 University Ave, Kingston, ON', neighborhood: "Queen's University" },
];

const events = [
  { title: 'Indie Rock Showcase', categories: ['concert', 'nightlife'], startTime: '20:00', endTime: '23:00', price: '$12' },
  { title: 'Pub Trivia Night', categories: ['trivia', 'nightlife'], startTime: '19:00', endTime: '21:30', price: 'Free' },
  { title: 'Open Mic Comedy', categories: ['comedy', 'nightlife'], startTime: '21:00', endTime: '23:00', price: '$5' },
  { title: 'Pottery for Beginners', categories: ['workshop'], startTime: '18:00', endTime: '20:00', price: '$35' },
  { title: 'Sunset Run Club', categories: ['sports', 'community'], startTime: '17:30', endTime: '18:30', price: 'Free' },
  { title: 'Family Story Hour', categories: ['family'], startTime: '10:00', endTime: '11:00', price: 'Free' },
  { title: 'Jazz on the Patio', categories: ['concert'], startTime: '18:30', endTime: '21:00', price: '$10' },
  { title: 'Board Game Social', categories: ['community'], startTime: '19:00', endTime: '22:00', price: '$3' },
  { title: 'Evening Makers Market', categories: ['market', 'community'], startTime: '16:00', endTime: '20:00', price: 'Free' },
  { title: 'Karaoke Throwdown', categories: ['nightlife'], startTime: '21:30', endTime: '01:00', price: 'Free' },
];

const specials = [
  { title: '$6 Pints', categories: ['food-deal', 'drink'], startTime: '16:00', endTime: '19:00', price: '$6' },
  { title: 'Half-Price Wings', categories: ['food-deal', 'food'], startTime: '17:00', endTime: '22:00', price: '50% off' },
  { title: '$2 Tacos', categories: ['food-deal', 'food'], startTime: '11:30', endTime: '15:00', price: '$2' },
  { title: 'Happy Hour Cocktails', categories: ['food-deal', 'drink'], startTime: '15:00', endTime: '18:00', price: '$8' },
  { title: 'Burger & Beer Combo', categories: ['food-deal', 'food', 'drink'], startTime: '17:00', endTime: '21:00', price: '$18' },
  { title: 'Oyster Night', categories: ['food-deal', 'food'], startTime: '18:00', endTime: '21:00', price: '$1.50 each' },
  { title: 'Wine Wednesday', categories: ['food-deal', 'drink', '19plus'], startTime: '17:00', endTime: '23:00', price: 'Half-price bottles' },
  { title: 'Late Night Pizza Slice', categories: ['food-deal', 'food'], startTime: '22:00', endTime: '02:00', price: '$3' },
  { title: 'Brunch Mimosas', categories: ['food-deal', 'drink'], startTime: '10:00', endTime: '14:00', price: '$5' },
  { title: 'Poutine Special', categories: ['food-deal', 'food'], startTime: '12:00', endTime: '20:00', price: '$9' },
];

async function main() {
  const date = format(new Date(), 'yyyy-MM-dd');

  for (const venue of venues) {
    await prisma.venue.upsert({ where: { id: venue.id }, update: venue, create: { ...venue, status: 'approved' } });
  }

  // Re-runnable: wipe previous trial events first (categories/likes cascade).
  await prisma.event.deleteMany({ where: { id: { startsWith: PREFIX } } });

  const all = [
    ...events.map((e, i) => ({ ...e, id: `${PREFIX}event-${i + 1}`, description: `[TRIAL] Sample event for testing.` })),
    ...specials.map((s, i) => ({ ...s, id: `${PREFIX}special-${i + 1}`, description: `[TRIAL] Sample special for testing.` })),
  ];

  for (const [i, item] of all.entries()) {
    await prisma.event.create({
      data: {
        id: item.id,
        title: item.title,
        description: item.description,
        date,
        startTime: item.startTime,
        endTime: item.endTime,
        price: item.price,
        status: 'approved',
        venueId: venues[i % venues.length].id,
        categories: { create: item.categories.map((name) => ({ name })) },
      },
    });
  }

  console.log(`Created ${events.length} trial events and ${specials.length} trial specials for ${date}.`);
  console.log('Remove them with: npm run db:clear-trial');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
