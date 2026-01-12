# Quick Fix: Database Connection Error

## The Problem
You're getting: `Can't reach database server at aws-1-ca-central-1.pooler.supabase.com:6543`

**Good news:** Your `DATABASE_URL` is set correctly and the connection test passed! ✅

## The Solution

The Next.js dev server needs to be **restarted** to pick up environment variables from `.env.local`.

### Step 1: Stop Your Dev Server
1. Go to the terminal where `npm run dev` is running
2. Press `Ctrl+C` (or `Cmd+C` on Mac) to stop it

### Step 2: Start It Again
```bash
cd webapp
npm run dev
```

### Step 3: Test Again
Try submitting an event - it should work now!

---

## Why This Happens

Next.js loads `.env.local` when the server **starts**. If you:
- Added/updated `DATABASE_URL` in `.env.local` while the server was running
- Changed environment variables
- The server has been running for a while

Then you need to **restart** the server for changes to take effect.

---

## If It Still Doesn't Work

### Option 1: Verify DATABASE_URL Format

Your connection string should look like:
```
postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true
```

Make sure:
- ✅ No quotes around the value (or use double quotes, not single)
- ✅ Password is correct
- ✅ Project reference is correct (not `your-project-ref`)

### Option 2: Test Connection

Run this to verify the connection string works:
```bash
cd webapp
node check-database-connection.js
```

If this works but your app doesn't, it's definitely a dev server restart issue.

### Option 3: Check Next.js Environment Loading

Make sure `.env.local` is in the `webapp/` directory (same level as `package.json`).

---

## Still Having Issues?

1. **Check Supabase Project Status:**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Make sure your project is **not paused**

2. **Get Fresh Connection String:**
   - Supabase Dashboard → Settings → Database
   - Connection pooling tab
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your password
   - Update `.env.local`
   - Restart dev server

3. **Try Direct Connection:**
   - In Supabase, use "Direct connection" (port 5432) instead of pooling (6543)
   - Update `DATABASE_URL` in `.env.local`
   - Restart dev server

---

**Most likely solution:** Just restart your dev server! 🚀

