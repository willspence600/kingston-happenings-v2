# Supabase Database Setup Guide

Complete guide to use Supabase PostgreSQL for all your data (events, venues, specials, and users).

## Overview

Your app now uses **one unified database** - Supabase PostgreSQL - for everything:
- ✅ User authentication and profiles
- ✅ Events, venues, and food & drink specials
- ✅ Event categories and user likes

No need for separate databases anymore!

## Step 1: Get Your Supabase Database Connection String

1. **Go to your Supabase Dashboard**
   - Visit [app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to Database Settings**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **Database** under Project Settings

3. **Get Connection String**
   - Scroll down to **Connection string** section
   - Select **Connection pooling** tab (recommended for serverless)
   - Copy the **Connection string** - it will look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
     ```

   **OR** use **Transaction mode** (for migrations):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

4. **Replace Password Placeholder**
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - If you don't know it, click **Reset database password** to set a new one
   - Save this password securely!

## Step 2: Set Up Environment Variables

### For Local Development

Create/update `.env.local` in your `webapp/` directory:

```env
# Supabase Configuration (for authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Database Connection (for Prisma)
DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true"
```

### For Production (Vercel/Netlify/etc.)

Add the same environment variables in your hosting platform:

**Vercel:**
1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - `DATABASE_URL` = your Supabase connection string
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL (should already exist)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key (should already exist)

**Netlify:**
1. Go to **Site settings** → **Environment variables**
2. Add the same variables

**Important:** Use **Connection pooling** mode (port 6543) for production to handle concurrent connections better.

## Step 3: Run Database Migrations

Now you need to create the tables in your Supabase database:

### Option A: Using Prisma Migrate (Recommended)

```bash
cd webapp

# Make sure DATABASE_URL is set in your environment
# For local development, it should be in .env.local

# Generate Prisma client
npx prisma generate

# Create a new migration (this will create tables)
npx prisma migrate dev --name init_to_postgresql

# Or if you just want to apply existing migrations:
npx prisma migrate deploy
```

### Option B: Manual SQL (Alternative)

If migrations don't work, you can run the SQL directly in Supabase:

1. Go to **SQL Editor** in Supabase dashboard
2. Run the migration SQL from `prisma/migrations/20251216205046_init/migration.sql`
3. Run any additional migrations you have

**Note:** The SQL might need minor adjustments for PostgreSQL syntax if it was written for SQLite. Prisma handles this automatically with migrations.

## Step 4: Verify Setup

### Test Database Connection:

```bash
cd webapp
npx prisma studio
```

This should open Prisma Studio and show your tables. If you see an error, check:
- DATABASE_URL is correct
- Password is correct
- Database is accessible

### Test from Your App:

1. Start your dev server: `npm run dev`
2. Try submitting an event
3. Check if it appears in Supabase:
   - Go to **Table Editor** in Supabase dashboard
   - You should see the `Event`, `Venue`, etc. tables
   - Data should appear there

## Step 5: (Optional) Migrate Existing Data

If you have existing data in SQLite/Turso:

### Export from Old Database:

```bash
# If using SQLite
sqlite3 dev.db .dump > backup.sql

# If using Turso
turso db dump your-db-name > backup.sql
```

### Import to Supabase:

You'll need to convert the SQL to PostgreSQL format and import it. This is complex, so it's usually easier to:

1. Export data as JSON/CSV
2. Use Prisma to import programmatically
3. Or manually re-enter critical data

For production, it's often easiest to just start fresh and re-enter key venues/events.

## Connection String Modes Explained

### Connection Pooling (Port 6543) - Recommended for Production
- Better for serverless/high concurrency
- Use this for your app's `DATABASE_URL`
- Format: `...supabase.co:6543/postgres?pgbouncer=true`

### Transaction Mode (Port 5432) - For Migrations
- Better for migrations and admin tasks
- Use this only when running `prisma migrate`
- Format: `...supabase.co:5432/postgres`

You can create two environment variables:
- `DATABASE_URL` = pooling mode (for app)
- `DIRECT_DATABASE_URL` = transaction mode (for migrations)

Then in `package.json`:
```json
"db:migrate": "DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy"
```

## Security Best Practices

1. **Never commit connection strings to git**
   - Always use environment variables
   - Add `.env.local` to `.gitignore` (should already be there)

2. **Use connection pooling in production**
   - Better performance and connection management
   - Port 6543 with `pgbouncer=true`

3. **Rotate passwords periodically**
   - Go to Supabase Dashboard → Settings → Database
   - Click "Reset database password"

4. **Use Row Level Security (RLS)**
   - Already set up for `profiles` table
   - Consider adding RLS policies for events/venues if needed

## Troubleshooting

### "Error: Can't reach database server"
- Check your connection string is correct
- Verify password is correct (no special characters need URL encoding)
- Check if your IP is allowed (Supabase allows all by default, but check if you restricted it)

### "Error: relation does not exist"
- Tables haven't been created yet
- Run migrations: `npx prisma migrate deploy`
- Check Prisma schema matches your database

### "Error: too many connections"
- Use connection pooling (port 6543)
- Make sure Prisma client is using connection pooling
- Check Supabase connection limits

### "Error: password authentication failed"
- Reset your database password in Supabase dashboard
- Update DATABASE_URL with new password
- Make sure password doesn't have special characters that need encoding

### Migration Errors
- If using pooling mode for migrations, switch to transaction mode (port 5432)
- Make sure you're using the correct connection string format
- Check Prisma logs for more details

## Free Tier Limits

Supabase free tier includes:
- **Database Size:** 500 MB (plenty for thousands of events)
- **Bandwidth:** 5 GB/month
- **API Requests:** 500,000/month
- **Concurrent Connections:** Limited (use connection pooling!)

## Monitoring

1. **Supabase Dashboard**:
   - Monitor database size, connections, queries
   - View table data in Table Editor
   - Check API usage

2. **Database Logs**:
   - Supabase Dashboard → Logs → Postgres Logs
   - See slow queries, errors, etc.

## Next Steps

Once set up:
1. ✅ Verify events can be submitted
2. ✅ Verify venues can be created
3. ✅ Check data appears in Supabase dashboard
4. ✅ Deploy to production with environment variables
5. ✅ Test production deployment

## Summary

You now have:
- ✅ **One unified database** (Supabase PostgreSQL)
- ✅ **All data in one place** (users, events, venues, specials)
- ✅ **Easy to manage** (Supabase dashboard)
- ✅ **Scalable** (PostgreSQL)
- ✅ **Free tier available** (500 MB)

No more managing multiple databases! 🎉
