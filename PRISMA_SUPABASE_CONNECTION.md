# Prisma + Supabase Connection Issue

## Current Error
Prisma can't reach the database server at the pooler address.

## Possible Solutions

### Solution 1: Use Direct Connection (Port 5432) for Prisma

Prisma sometimes has issues with connection poolers. Try using Direct connection instead:

1. **In Supabase Dashboard:**
   - Settings → Database → Connection string
   - Select **"Direct connection"** (NOT Transaction pooler)
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your password

2. **Update in Vercel:**
   - Settings → Environment Variables
   - Edit `DATABASE_URL`
   - Use the Direct connection string (port 5432)
   - Save and redeploy

**Direct connection format:**
```
postgresql://postgres:YOUR-PASSWORD@db.vomqqjgfczemadqzcdeb.supabase.co:5432/postgres
```

### Solution 2: Verify Connection String Format

For Transaction pooler, the format should be:
```
postgresql://postgres.vomqqjgfczemadqzcdeb:YOUR-PASSWORD@aws-1-ca-central-1.pooler.supabase.com:6543/postgres
```

Notice:
- Project ref is in the username: `postgres.vomqqjgfczemadqzcdeb`
- Host is the pooler: `aws-1-ca-central-1.pooler.supabase.com`
- Port is 6543

### Solution 3: Check Supabase Project Settings

1. **Project Status:**
   - Make sure project is not paused
   - Check Supabase dashboard

2. **Network Restrictions:**
   - Settings → Database
   - Check if there are IP restrictions
   - Make sure Vercel IPs aren't blocked

3. **Connection Pooling:**
   - Make sure connection pooling is enabled
   - Check pooler status

### Solution 4: Test Connection Locally

Test if the connection string works from your computer:

```bash
cd /Users/jasminewu/kingston-happenings/webapp

# Set the connection string
export DATABASE_URL="postgresql://postgres:dxuXb6uYXYoS2338@db.vomqqjgfczemadqzcdeb.supabase.co:5432/postgres"

# Test connection
npx prisma db pull
```

If this works locally but not on Vercel, it's a network/configuration issue.
If it doesn't work locally either, the connection string or credentials are wrong.

