# Production Database Setup Guide

## How Data Persists in Production

Your Kingston Happenings website uses a **cloud-hosted database** that persists all your data (venues, events, specials, user likes) even when the server restarts or redeploys.

## Current Architecture

Your app uses **two separate databases**:

### 1. **Turso (libSQL) Database** - Events, Venues, Specials
- **What it stores**: All events, venues, food & drink specials, event categories, and user likes
- **Location**: Cloud-hosted by Turso (managed service)
- **Database Type**: libSQL (compatible with SQLite, but cloud-hosted)
- **Why separate**: This handles all your event/content data

### 2. **Supabase PostgreSQL** - User Authentication & Profiles
- **What it stores**: User accounts, email/password, user roles (user/organizer/admin)
- **Location**: Cloud-hosted by Supabase
- **Database Type**: PostgreSQL
- **Why separate**: Handles authentication and user management

## Setting Up for Production

### Step 1: Set Up Turso Database (Required)

Turso is already configured in your code. You just need to create a Turso database and add the credentials.

1. **Sign up for Turso** (free tier available)
   - Go to [turso.tech](https://turso.tech)
   - Sign up for a free account
   - Free tier includes: 500 databases, 2GB storage, unlimited reads

2. **Create a Database**
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Login to Turso
   turso auth login
   
   # Create a database for your production app
   turso db create kingston-happenings-prod
   
   # Create a database token for your app
   turso db tokens create kingston-happenings-prod
   ```

3. **Get Your Database URL**
   ```bash
   turso db show kingston-happenings-prod --url
   ```

4. **Add Environment Variables** (in your hosting platform)
   
   Add these to your hosting platform's environment variables (Vercel, Netlify, etc.):
   ```env
   TURSO_DATABASE_URL=libsql://your-database-url.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   ```

5. **Run Migrations on Production**
   ```bash
   # From your local machine, point to production database
   DATABASE_URL="libsql://your-database-url.turso.io?authToken=your-token" \
   npx prisma migrate deploy
   
   # Or if using Turso CLI:
   turso db shell kingston-happenings-prod < prisma/migrations/20251216205046_init/migration.sql
   ```

### Step 2: Verify Supabase Setup

Your Supabase database should already be set up (for user authentication):

1. **Check Supabase Environment Variables** are set:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Ensure Profiles Table Exists**
   - Go to Supabase Dashboard → SQL Editor
   - Run the contents of `supabase-setup.sql` if you haven't already

## How It Works in Production

### Data Flow:

```
User Action → Next.js API Route → Prisma Client → Turso Database (cloud)
                                            ↓
                                    Data Persists Permanently
```

### Example: Submitting an Event

1. User fills out the form on your website
2. Form submits to `/api/events` (Next.js API route)
3. API route uses Prisma to save to Turso database
4. Data is stored in the cloud database permanently
5. All users can see the event immediately (if approved)

### What Happens When You Deploy:

- ✅ **Data persists** - All events, venues, specials remain in Turso database
- ✅ **Users persist** - All user accounts remain in Supabase
- ✅ **Likes persist** - All saved/liked events remain in Turso database
- ✅ **No data loss** - Database is completely separate from your code/server

## Important Notes

### Database Backup

**Turso automatically backs up your database**, but you can also:
- Export data: `turso db dump kingston-happenings-prod > backup.sql`
- Import data: `turso db shell kingston-happenings-prod < backup.sql`

### Free Tier Limits (Turso)

- **Storage**: 2GB (usually plenty for thousands of events)
- **Reads**: Unlimited
- **Writes**: Very generous free tier
- **Databases**: 500 databases

### Monitoring

- **Turso Dashboard**: Monitor database usage, connections, queries
- **Supabase Dashboard**: Monitor user signups, authentication

## Alternative Database Options

If you prefer a different database, you can modify the setup:

### Option 1: Use Supabase PostgreSQL for Everything

You could migrate events/venues to Supabase PostgreSQL instead of Turso:

1. Change Prisma schema provider to `postgresql`
2. Update `DATABASE_URL` to use Supabase Postgres connection string
3. Benefits: Single database, easier to manage
4. Drawbacks: More complex migration, potentially higher costs at scale

### Option 2: Use PlanetScale (MySQL)

Similar to Turso but uses MySQL:

1. Sign up for PlanetScale
2. Create database
3. Update Prisma schema provider to `mysql`
4. Update connection string

### Option 3: Use Vercel Postgres / Neon

Serverless Postgres options:

1. Use Vercel Postgres or Neon (serverless Postgres)
2. Update Prisma schema provider to `postgresql`
3. Benefits: Serverless, auto-scaling

## Current Recommendation

**Stick with Turso** - Your current setup is ideal because:
- ✅ Simple SQLite-compatible database (easy to work with)
- ✅ Generous free tier
- ✅ Fast and reliable
- ✅ Already configured in your code
- ✅ Automatic backups

## Troubleshooting

### "Database not found" errors
- Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set correctly
- Verify database exists: `turso db list`
- Check token is valid: `turso db show kingston-happenings-prod`

### Migration errors
- Make sure all migrations are run: `npx prisma migrate deploy`
- Check database connection string is correct

### Data not persisting
- Verify environment variables are set in production (not just `.env.local`)
- Check database logs in Turso dashboard
- Ensure Prisma is using Turso adapter (check logs)

## Quick Checklist for Deployment

- [ ] Created Turso database
- [ ] Set `TURSO_DATABASE_URL` environment variable
- [ ] Set `TURSO_AUTH_TOKEN` environment variable
- [ ] Ran migrations on production database
- [ ] Verified Supabase environment variables are set
- [ ] Tested event submission works
- [ ] Tested venue creation works
- [ ] Verified data persists after server restart

---

**Summary**: Your data persists in cloud databases (Turso + Supabase) that are completely separate from your code. Even if you redeploy, restart servers, or make changes, all your events, venues, and user data remain safe in the cloud.
