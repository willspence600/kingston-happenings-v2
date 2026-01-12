# Database Connection Troubleshooting

## Current Issue: Can't Reach Database Server

Your connection string format looks correct, but Prisma can't connect. Let's verify a few things.

## Step 1: Verify Connection String Format

The Transaction pooler connection string should be in one of these formats:

### Format Option 1 (with project reference in username):
```
postgresql://postgres.vomqqjgfczemadqzcdeb:YOUR-PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Format Option 2 (with project in hostname):
```
postgresql://postgres:YOUR-PASSWORD@db.vomqqjgfczemadqzcdeb.supabase.co:6543/postgres?pgbouncer=true
```

**Your current format:** `postgresql://postgres:dxuXb6uYXYoS2338@db.vomqqjgfczemadqzcdeb.supabase.co:6543/postgres?pgbouncer=true`

This looks correct! But let's verify it's the exact string from Supabase.

## Step 2: Get the EXACT Connection String from Supabase

1. Go to Supabase Dashboard → Settings → Database
2. Click "Connection string"
3. Select "Transaction pooler" tab
4. Copy the connection string EXACTLY as shown
5. Replace `[YOUR-PASSWORD]` with your password

**Important:** Don't modify the format - use it exactly as Supabase shows it.

## Step 3: Check Supabase Database Settings

### Check if Database is Accessible:

1. Go to Supabase Dashboard → Settings → Database
2. Check "Connection pooling" section
3. Make sure "Connection pooling" is enabled
4. Note which pooler URL it shows

### Check Network/Access:

1. Supabase Dashboard → Settings → Database
2. Look for "Network restrictions" or "IP allowlist"
3. Make sure there are no IP restrictions blocking Vercel

### Check Project Status:

1. Make sure your Supabase project is NOT paused
2. Check the project dashboard - is it active?

## Step 4: Alternative - Try Direct Connection (Port 5432)

Sometimes Transaction pooler has issues. You can try Direct connection temporarily:

1. In Supabase → Settings → Database → Connection string
2. Select "Direct connection" (port 5432)
3. Copy that connection string
4. Update DATABASE_URL in Vercel
5. Redeploy

**Note:** Direct connection works but uses more connections. For production, Transaction pooler is better, but Direct connection can work as a temporary fix.

## Step 5: Verify Password Encoding

If your password has special characters, they might need URL encoding:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- etc.

Your password `dxuXb6uYXYoS2338` looks fine (no special chars that need encoding).

## Step 6: Test Connection String Locally

You can test if the connection string works from your local machine:

```bash
cd /Users/jasminewu/kingston-happenings/webapp

# Set the connection string
export DATABASE_URL="postgresql://postgres:dxuXb6uYXYoS2338@db.vomqqjgfczemadqzcdeb.supabase.co:6543/postgres?pgbouncer=true"

# Test connection
npx prisma db pull
```

If this works locally but not on Vercel, it's a network/configuration issue.
If it doesn't work locally either, the connection string is wrong.

## Common Issues & Solutions

### Issue: "Can't reach database server"

**Possible causes:**
1. **Wrong connection string format** - Use exact format from Supabase
2. **Wrong password** - Double-check password is correct
3. **Database paused** - Check Supabase project status
4. **Network restrictions** - Check Supabase database settings
5. **Connection pooling disabled** - Verify in Supabase settings

### Issue: Connection works locally but not on Vercel

**Solutions:**
1. Make sure DATABASE_URL is set in Vercel (not just locally)
2. Verify environment variable is set for Production environment
3. Redeploy after adding/updating variable
4. Check Vercel logs for connection errors

---

## Quick Fix: Try Direct Connection

If Transaction pooler doesn't work, try Direct connection:

1. Supabase → Settings → Database → Connection string
2. Select "Direct connection" (port 5432)
3. Copy connection string
4. Update DATABASE_URL in Vercel
5. Redeploy

This should work, even though Transaction pooler is preferred.

