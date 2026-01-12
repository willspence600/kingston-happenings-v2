// Script to check all events in database and their status
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEvents() {
  try {
    console.log('Checking all events in database...\n');
    
    // Get all events regardless of status
    const allEvents = await prisma.event.findMany({
      include: {
        venue: true,
        categories: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Total events found: ${allEvents.length}\n`);
    
    // Group by status
    const byStatus = allEvents.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Events by status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n--- All Events ---');
    allEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Venue: ${event.venue.name}`);
      console.log(`   Created: ${event.createdAt}`);
      console.log(`   Updated: ${event.updatedAt}`);
    });
    
    // Check for approved events that might have been accidentally changed
    const approvedEvents = allEvents.filter(e => e.status === 'approved');
    console.log(`\n✅ Approved events (should be visible): ${approvedEvents.length}`);
    
    const cancelledEvents = allEvents.filter(e => e.status === 'cancelled');
    console.log(`❌ Cancelled events (hidden): ${cancelledEvents.length}`);
    
    if (cancelledEvents.length > 0) {
      console.log('\n⚠️  Cancelled events:');
      cancelledEvents.forEach(e => {
        console.log(`  - ${e.title} (${e.date}) - ID: ${e.id}`);
      });
    }
    
    const rejectedEvents = allEvents.filter(e => e.status === 'rejected');
    console.log(`🚫 Rejected events (deleted): ${rejectedEvents.length}`);
    
    const pendingEvents = allEvents.filter(e => e.status === 'pending');
    console.log(`⏳ Pending events (awaiting approval): ${pendingEvents.length}`);
    
  } catch (error) {
    console.error('Error checking events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvents();

