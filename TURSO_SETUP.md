# Turso Database Setup Guide

Complete step-by-step guide to set up Turso for your Kingston Happenings production database.

## What is Turso?

Turso is a cloud-hosted database service that uses libSQL (SQLite-compatible). It's perfect for production because:
- ✅ Free tier with generous limits (2GB storage, unlimited reads)
- ✅ Cloud-hosted (data persists even if server restarts)
- ✅ Fast and reliable
- ✅ Already configured in your codebase

## Step 1: Sign Up for Turso

1. Go to [https://turso.tech](https://turso.tech)
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with:
   - Email/password, or
   - GitHub account (recommended - easier)
4. Verify your email if required

## Step 2: Install Turso CLI

The CLI lets you manage your database from your terminal.

### macOS / Linux:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Windows (PowerShell):
```powershell
irm https://get.tur.so/install.ps1 | iex
```

**Or install manually:**
- Visit [Turso CLI Releases](https://github.com/tursodatabase/libsql-client-ts/releases)
- Download the appropriate binary for your system
- Add it to your PATH

### Verify Installation:
```bash
turso --version
```

You should see something like `turso version 0.x.x`

## Step 3: Login to Turso

```bash
turso auth login
```

This will open a browser window for you to authenticate. If using GitHub, it will ask for GitHub authentication.

## Step 4: Create Your Production Database

```bash
turso db create kingston-happenings-prod
```

**Note:** The database name can be anything. Common names:
- `kingston-happenings-prod`
- `kingston-happenings`
- `kh-prod`

You'll see output like:
```
Created database kingston-happenings-prod in Toronto, Canada (yyz)
```

## Step 5: Get Your Database Credentials

### Get Database URL:
```bash
turso db show kingston-happenings-prod --url
```

Output will look like:
```
libsql://kingston-happenings-prod-username.turso.io
```

### Create Database Token (for authentication):
```bash
turso db tokens create kingston-happenings-prod
```

Output will look like:
```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MDAwMDAwMDB9...
```

**Important:** Save this token securely! You'll need it for your environment variables.

## Step 6: Set Up Environment Variables

Add these to your hosting platform's environment variables. The method depends on where you're deploying:

### Option A: Vercel Deployment

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

   **Name:** `TURSO_DATABASE_URL`  
   **Value:** `libsql://kingston-happenings-prod-username.turso.io`  
   **Environment:** Production, Preview, Development (select all)

   **Name:** `TURSO_AUTH_TOKEN`  
   **Value:** `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` (your token from step 5)  
   **Environment:** Production, Preview, Development (select all)

4. Click **Save**

### Option B: Netlify Deployment

1. Go to your Netlify site dashboard
2. Click **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (same values as above)
5. Click **Save**

### Option C: Other Platforms

Add the environment variables in your platform's settings/configuration:
- Render: Dashboard → Environment
- Railway: Project → Variables
- DigitalOcean: App Settings → App-Level Environment Variables

## Step 7: Run Database Migrations

You need to create the database tables in your production database.

### Option A: Using Turso CLI (Recommended)

1. First, build the full database URL with token:
   ```bash
   # Get the URL
   DATABASE_URL=$(turso db show kingston-happenings-prod --url)
   
   # Get a token
   TOKEN=$(turso db tokens create kingston-happenings-prod)
   
   # Build full connection string
   FULL_URL="${DATABASE_URL}?authToken=${TOKEN}"
   ```

2. Run migrations:
   ```bash
   cd webapp
   DATABASE_URL="$FULL_URL" npx prisma migrate deploy
   ```

### Option B: Manual Migration Files

If you have specific migration files, you can apply them:

```bash
# Get database shell access
turso db shell kingston-happenings-prod

# Then in the shell, you can run SQL directly
# Or use the migration files:
cat prisma/migrations/20251216205046_init/migration.sql | turso db shell kingston-happenings-prod
```

### Option C: Using Prisma Studio (Visual Method)

```bash
# Set environment variables temporarily
export TURSO_DATABASE_URL="libsql://your-db-url.turso.io"
export TURSO_AUTH_TOKEN="your-token"

# Create a connection string for Prisma
export DATABASE_URL="${TURSO_DATABASE_URL}?authToken=${TURSO_AUTH_TOKEN}"

# Run migrations
cd webapp
npx prisma migrate deploy

# Or open Prisma Studio to verify
npx prisma studio
```

## Step 8: Verify Setup

### Check Database Connection:

```bash
# Test connection
turso db shell kingston-happenings-prod

# In the shell, try:
.tables
# Should show: Venue, Event, EventCategory, Like, User

SELECT COUNT(*) FROM Venue;
# Should return a number (might be 0 if empty)
```

### Test from Your App:

1. Deploy your app with the environment variables set
2. Try submitting an event through the form
3. Check if it appears on your site
4. Verify in Turso dashboard or CLI that data is stored

## Step 9: (Optional) Seed Initial Data

If you have seed data you want to add:

```bash
# Make sure DATABASE_URL is set with token
export DATABASE_URL="${TURSO_DATABASE_URL}?authToken=${TURSO_AUTH_TOKEN}"

# Run seed script
cd webapp
npm run db:seed
```

## Step 10: Create Backup Token (Recommended)

Create a separate read-only token for backups/monitoring:

```bash
# Create read-only token
turso db tokens create kingston-happenings-prod --read-only
```

Save this token separately - you can use it for read-only operations without risking writes.

## Troubleshooting

### "Command not found: turso"
- Make sure Turso CLI is installed
- Restart your terminal
- Check if it's in your PATH: `which turso` (Mac/Linux) or `where turso` (Windows)

### "Database not found"
- List your databases: `turso db list`
- Make sure you created the database: `turso db create kingston-happenings-prod`
- Check you're logged in: `turso auth whoami`

### "Authentication failed"
- Generate a new token: `turso db tokens create kingston-happenings-prod`
- Make sure you're using the full URL with token: `libsql://db-url.turso.io?authToken=your-token`
- Check token hasn't expired (tokens don't expire, but double-check it's correct)

### Migration Errors
- Make sure all migrations are in order
- Check Prisma schema matches migrations
- Try: `npx prisma migrate reset` (WARNING: deletes all data) then `npx prisma migrate deploy`

### "Connection refused" or Network Errors
- Check your internet connection
- Verify database URL is correct
- Check Turso status: [status.turso.tech](https://status.turso.tech)

## Useful Commands

```bash
# List all databases
turso db list

# Show database info
turso db show kingston-happenings-prod

# Show database URL
turso db show kingston-happenings-prod --url

# List database tokens
turso db tokens list kingston-happenings-prod

# Delete a token (if compromised)
turso db tokens revoke kingston-happenings-prod <token-id>

# Get database shell
turso db shell kingston-happenings-prod

# Backup database
turso db dump kingston-happenings-prod > backup.sql

# Restore database
turso db shell kingston-happenings-prod < backup.sql
```

## Monitoring Your Database

1. **Turso Dashboard**: Visit [app.turso.tech](https://app.turso.tech)
   - View database metrics
   - Monitor usage
   - See connections and queries

2. **Usage Limits**: Check your free tier limits
   - Storage: 2GB
   - Reads: Unlimited
   - Writes: Very generous

## Next Steps

Once Turso is set up:
1. ✅ Deploy your app with the environment variables
2. ✅ Test event submission
3. ✅ Verify data persists
4. ✅ Set up monitoring/alerting (optional)
5. ✅ Create regular backups (optional but recommended)

## Security Best Practices

1. **Never commit tokens to git** - Always use environment variables
2. **Use read-only tokens** for monitoring/backups when possible
3. **Rotate tokens** periodically (create new, update env vars, revoke old)
4. **Limit database access** - Only give tokens to services that need them

## Quick Reference

```bash
# Full setup command sequence
turso auth login
turso db create kingston-happenings-prod
turso db show kingston-happenings-prod --url
turso db tokens create kingston-happenings-prod

# Then add to your hosting platform:
# TURSO_DATABASE_URL = (from db show command)
# TURSO_AUTH_TOKEN = (from tokens create command)
```

---

**That's it!** Your database is now set up and ready for production. All your events, venues, and specials will persist in the cloud. 🎉
