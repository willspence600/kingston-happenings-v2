# Verify Database Tables Exist

## Step 1: Check if Tables Exist in Supabase

1. Go to Supabase Dashboard
2. Click **Table Editor** (left sidebar)
3. Do you see these tables?
   - `Venue`
   - `Event`
   - `EventCategory`
   - `Like`
   - `User`
   - `profiles`

**If you DON'T see these tables:**
- The SQL script wasn't run successfully
- You need to create them

---

## Step 2: If Tables Don't Exist - Create Them

### Option A: Run SQL in Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of the file: `/Users/jasminewu/kingston-happenings/webapp/create-tables-postgresql.sql`
4. Paste into SQL Editor
5. Click **"Run"** (or press Cmd+Enter)
6. Should see "Success" message

### Option B: Verify Tables Were Created

After running the SQL:
1. Go back to **Table Editor**
2. Refresh the page
3. You should now see all the tables listed above

---

## Step 3: Test Database Connection

After tables are created, try submitting an event again.

If you still get errors, check:
1. **Error message** - What exactly does it say?
2. **Browser console** (F12) - Any errors there?
3. **Vercel logs** - Check deployment logs for database errors

---

## Common Issues After Fixing DATABASE_URL

### "Can't reach database server"
- Verify DATABASE_URL is correct (port 6543)
- Check Supabase project is not paused
- Make sure password is correct

### "Table does not exist"
- Tables weren't created - run the SQL script

### "Relation does not exist"
- Same as above - tables missing

---

**Next Step:** Check if the tables exist in Supabase Table Editor, and let me know what you see!

