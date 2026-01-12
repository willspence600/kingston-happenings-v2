# Fix Database Connection Error

Your `DATABASE_URL` environment variable in Vercel is set to a placeholder instead of your actual database connection string.

## The Problem

The error shows:
```
Can't reach database server at `db.your-project-ref.supabase.co:5432`
```

This means `DATABASE_URL` still has `your-project-ref` instead of your real Supabase project reference.

## Solution: Update DATABASE_URL in Vercel

### Step 1: Get Your Correct Connection String

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Settings** (gear icon) → **Database**
4. Scroll to **"Connection string"** section
5. Click the **"Connection pooling"** tab (important!)
6. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
   ```

7. **Replace `[YOUR-PASSWORD]`** with your actual database password
   - If you don't know it: Click "Reset database password" in the same page
   - Set a new password and save it securely

### Step 2: Update in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your **kingston-happenings** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Find `DATABASE_URL` in the list
6. Click **Edit** (or delete and recreate)
7. **Replace the entire value** with your actual connection string from Step 1
8. Make sure it's set for: Production, Preview, Development (check all boxes)
9. Click **Save**

### Step 3: Redeploy

**IMPORTANT:** Environment variables only apply to NEW deployments!

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu (three dots) on your latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (2-5 minutes)

### Step 4: Verify It Works

1. Visit your live site
2. Try accessing a page that uses the database (like browsing events)
3. The error should be gone!

## Common Issues

### "Still showing placeholder"

- Make sure you replaced the ENTIRE connection string
- Double-check there's no `your-project-ref` text left
- Verify the connection string format is correct

### "Still can't connect after redeploy"

1. **Check the connection string format:**
   - Should start with `postgresql://`
   - Should include your actual project reference (not `your-project-ref`)
   - Should include your actual password (not `YOUR-PASSWORD`)
   - Should use port `6543` for connection pooling

2. **Verify password is correct:**
   - Try resetting database password in Supabase
   - Update `DATABASE_URL` with new password
   - Redeploy again

3. **Check Supabase project status:**
   - Make sure project is not paused
   - Go to Supabase Dashboard and verify project is active

### Connection String Format Examples

**Correct format (Connection Pooling):**
```
postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:6543/postgres?pgbouncer=true
```

**Wrong format (has placeholder):**
```
postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:5432/postgres
```

## Quick Checklist

- [ ] Got connection string from Supabase (Connection pooling tab)
- [ ] Replaced `[YOUR-PASSWORD]` with actual password
- [ ] Updated `DATABASE_URL` in Vercel
- [ ] Set for Production, Preview, Development
- [ ] Redeployed application
- [ ] Tested the site - error is gone

---

**After fixing this, your database connection will work and the login page should function properly!**

