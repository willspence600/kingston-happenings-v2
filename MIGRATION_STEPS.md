# Step-by-Step: Running Database Migrations

## Step 1: Get Your Connection String from Supabase

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Settings** (gear icon in left sidebar)
4. Click **Database** (under Project Settings)
5. Scroll down to **"Connection string"** section
6. Click the **"Transaction"** tab (not "Connection pooling")
7. You'll see a connection string like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

8. **Copy this entire string**

## Step 2: Replace the Password Placeholder

The connection string might have `[YOUR-PASSWORD]` in it. You need to replace it with your actual database password.

**If you don't know your password:**
- In the same Database settings page, look for **"Database password"** section
- Click **"Reset database password"**
- Set a new password (save it somewhere secure!)
- Then use this new password in the connection string

**Replace `[YOUR-PASSWORD]` with your actual password**

For example, if your password is `MyPassword123`, the connection string becomes:
```
postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## Step 3: Open Terminal

1. Open Terminal on your Mac (Spotlight search: "Terminal")
2. Navigate to your project:
   ```bash
   cd /Users/jasminewu/kingston-happenings/webapp
   ```

## Step 4: Set the Environment Variable and Run Migrations

Run these commands in Terminal:

```bash
# Replace the entire connection string below with YOUR actual connection string from Step 2
export DATABASE_URL="postgresql://postgres:YOUR-ACTUAL-PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres"

# Verify it's set (optional)
echo $DATABASE_URL

# Run the migrations
npx prisma migrate deploy
```

**Important:** 
- Replace the entire connection string with the one you copied
- Make sure to include the quotes `"..."` around it
- Replace `YOUR-ACTUAL-PASSWORD` with your real password

## Step 5: What Should Happen

You should see output like:
```
Prisma Migrate applying migrations

Migration 20251216205046_init applied successfully
Migration 20251217030443_add_venue_status applied successfully
Migration 20251217044905_add_recurrence_fields applied successfully

All migrations have been successfully applied.
```

If you see errors, see the troubleshooting section below.

## Step 6: Verify Tables Were Created

1. Go back to Supabase Dashboard
2. Click **Table Editor** (left sidebar)
3. You should see these tables:
   - `Event`
   - `Venue`
   - `EventCategory`
   - `Like`
   - `User`

If you see these tables, you're done! ✅

## Complete Example

Here's what your Terminal session should look like:

```bash
$ cd /Users/jasminewu/kingston-happenings/webapp

$ export DATABASE_URL="postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"

$ npx prisma migrate deploy
Environment variables loaded from .env
Prisma Migrate applying migrations

The following migration(s) have been applied:

migrations/
  └─ 20251216205046_init/
    └─ migration.sql

All migrations have been successfully applied.
```

## Troubleshooting

### "Error: Can't reach database server"
- Check your connection string is correct
- Make sure you replaced the password
- Try copying the connection string again from Supabase

### "Error: password authentication failed"
- Your password might be wrong
- Reset your database password in Supabase Dashboard
- Try the new password

### "Error: relation does not exist"
- Migrations might not have run yet
- Make sure `DATABASE_URL` is set correctly
- Run `npx prisma migrate deploy` again

### "Command not found: npx"
- Make sure you're in the `webapp` directory
- Install Node.js if you haven't: [nodejs.org](https://nodejs.org)
- Run `npm install` first

### "Module not found: @prisma/client"
- Run `npm install` first
- Then run `npx prisma generate`
- Then run migrations

## Need Help?

If you're still stuck:
1. Share the exact error message you're seeing
2. Confirm you're in the `webapp` directory
3. Confirm your `DATABASE_URL` is set (run `echo $DATABASE_URL`)

---

**Once migrations are done, your site will be able to save events and venues!** 🎉

