# Supabase Setup Guide

Complete step-by-step guide for setting up Supabase from scratch for Kingston Happenings.

## Step 1: Create Supabase Account & Project

1. **Sign up at [supabase.com](https://supabase.com)**
   - Click "Start your project"
   - Sign up with GitHub, Google, or email

2. **Create a New Project**
   - Click "New Project"
   - Fill in:
     - **Name**: `kingston-happenings` (or your choice)
     - **Database Password**: ⚠️ **SAVE THIS PASSWORD** - you'll need it for connection strings
     - **Region**: Choose closest to you (e.g., `US East` for North America)
     - **Pricing Plan**: Free tier is fine for development
   - Click "Create new project"
   - Wait 2-3 minutes for project to initialize

## Step 2: Create the Profiles Table

The app uses a `profiles` table in Supabase (separate from Prisma tables) to store user roles and additional info.

1. **Go to SQL Editor**
   - In Supabase Dashboard, click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run this SQL to create the profiles table:**

```sql
-- Create profiles table for user roles and additional info
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
  name TEXT,
  venue_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

3. **Click "Run"** (or press Cmd/Ctrl + Enter)
4. **Verify**: You should see "Success. No rows returned"

## Step 3: Get Your API Keys & Connection Strings

### 3.1 Get Supabase URL and API Keys

1. **Go to Settings → API**
   - In Supabase Dashboard, click **Settings** (gear icon) → **API**

2. **Copy these values:**
   - **Project URL**: Copy for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: Copy for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: ⚠️ **Keep this secret!** Copy for `SUPABASE_SERVICE_ROLE_KEY`

### 3.2 Get Database Connection Strings

1. **Go to Settings → Database**
   - In Supabase Dashboard, click **Settings** → **Database**

2. **Get Connection Pooling URL (for DATABASE_URL):**
   - Scroll to **Connection string** section
   - Click **Connection pooling** tab
   - Select **Session mode**
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password (from Step 1)
   - Example format: `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

3. **Get Direct Connection URL (for DIRECT_URL):**
   - Still in **Connection string** section
   - Click **Direct connection** tab
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password
   - Example format: `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

## Step 4: Configure Environment Variables

1. **Create `.env.local` file** in your project root:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

2. **Replace all placeholder values** with your actual values from Step 3

3. **Important**: 
   - Never commit `.env.local` to git (it should be in `.gitignore`)
   - The `SUPABASE_SERVICE_ROLE_KEY` has admin privileges - keep it secret!

## Step 5: Run Database Migrations

Now that Supabase is configured, create the Prisma tables:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy

# Or for development (creates migration files):
npx prisma migrate dev --name init
```

**Verify tables were created:**
- Go to Supabase Dashboard → **Table Editor**
- You should see: `Event`, `Venue`, `EventCategory`, `Like`, `User`, and `profiles` tables

## Step 6: Configure Authentication Settings (Optional)

1. **Go to Authentication → Settings**
   - In Supabase Dashboard, click **Authentication** → **Settings**

2. **Configure Email Settings:**
   - **Site URL**: Set to `http://localhost:3000` for development
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`

3. **Email Templates (Optional):**
   - You can customize confirmation and password reset emails
   - For development, you can disable email confirmation in **Auth → Settings → Email Auth**

## Step 7: Test the Connection

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test database connection:**
   ```bash
   npm run db:studio
   ```
   - This opens Prisma Studio at `http://localhost:5555`
   - You should see all your tables

3. **Test authentication:**
   - Go to `http://localhost:3000/register`
   - Create a test account
   - Check Supabase Dashboard → **Authentication → Users** to see the new user
   - Check **Table Editor → profiles** to see the profile was created

## Troubleshooting

### Issue: "Connection refused" or "Database connection failed"
- **Check**: Make sure `DATABASE_URL` and `DIRECT_URL` have the correct password
- **Check**: Verify the connection strings are from the correct tabs (pooling vs direct)

### Issue: "Table 'profiles' does not exist"
- **Solution**: Make sure you ran the SQL from Step 2 in the SQL Editor

### Issue: "Migration failed"
- **Check**: Use `DIRECT_URL` for migrations, not `DATABASE_URL`
- **Check**: Make sure your database password is correct
- **Try**: Run `npx prisma migrate reset` (⚠️ deletes all data) then `npx prisma migrate deploy`

### Issue: "Invalid API key"
- **Check**: Make sure you copied the full key (they're very long)
- **Check**: Make sure you're using `anon` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, not `service_role`

### Issue: "Profile not created on signup"
- **Check**: Make sure the trigger function was created (Step 2)
- **Check**: Look in Supabase Dashboard → **Database → Functions** to see if `handle_new_user` exists

## Other Services You'll Need

### For Deployment: Vercel (Free)

1. **Sign up at [vercel.com](https://vercel.com)**
   - Use GitHub to sign up (recommended)

2. **Connect your repository**
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add environment variables in Vercel:**
   - Go to Project → **Settings → Environment Variables**
   - Add all the same variables from `.env.local`:
     - `DATABASE_URL`
     - `DIRECT_URL`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Select **All environments** (Production, Preview, Development)
   - Click **Save**

4. **Deploy:**
   - Push to your main branch
   - Vercel will automatically deploy

### Update Supabase Redirect URLs for Production

After deploying to Vercel:

1. **Go to Supabase Dashboard → Authentication → URL Configuration**
2. **Add your production URL:**
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: Add `https://your-app.vercel.app/auth/callback`

## Summary Checklist

- [ ] Created Supabase account and project
- [ ] Created `profiles` table (Step 2 SQL)
- [ ] Copied all API keys and connection strings
- [ ] Created `.env.local` with all variables
- [ ] Ran Prisma migrations (`npx prisma migrate deploy`)
- [ ] Verified tables exist in Supabase Table Editor
- [ ] Tested database connection (`npm run db:studio`)
- [ ] Tested user registration (creates profile automatically)
- [ ] (Optional) Set up Vercel for deployment
- [ ] (Optional) Updated Supabase redirect URLs for production

## Next Steps

Once Supabase is set up:
1. Test the API endpoints (see `TESTING_GUIDE.md`)
2. Create your first admin user (manually set role in `profiles` table)
3. Start building features!
