// Quick script to test database connection
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not set!');
    console.log('\nPlease add DATABASE_URL to your .env.local file:');
    console.log('DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true"');
    process.exit(1);
  }

  // Check connection string format
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.includes('your-project-ref') || dbUrl.includes('YOUR-PASSWORD')) {
    console.error('\n❌ DATABASE_URL contains placeholder values!');
    console.log('Please replace the placeholder values with your actual Supabase connection details.');
    process.exit(1);
  }

  if (!dbUrl.includes('supabase')) {
    console.warn('\n⚠️  DATABASE_URL does not appear to be a Supabase connection string');
  }

  try {
    // Test connection
    await prisma.$connect();
    console.log('\n✅ Successfully connected to database!');
    
    // Try a simple query
    const venueCount = await prisma.venue.count();
    console.log(`✅ Database query successful! Found ${venueCount} venues.`);
    
    await prisma.$disconnect();
    console.log('\n✅ Connection test passed!');
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\nPossible solutions:');
      console.log('1. Verify your DATABASE_URL is correct in .env.local');
      console.log('2. Get the connection string from Supabase Dashboard → Settings → Database → Connection pooling');
      console.log('3. Make sure your database password is correct');
      console.log('4. Check if your Supabase project is paused');
      console.log('5. Try using the Direct connection (port 5432) instead of Connection pooling (port 6543)');
    }
    
    if (error.message.includes("password authentication failed")) {
      console.log('\nPossible solutions:');
      console.log('1. Reset your database password in Supabase Dashboard → Settings → Database');
      console.log('2. Update DATABASE_URL in .env.local with the new password');
      console.log('3. Make sure special characters in password are URL-encoded (e.g., @ → %40)');
    }
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();

