# Environment Variables for Vercel Deployment

Detailed explanation of what environment variables you need and where to find them.

## What are Environment Variables?

Environment variables are secret configuration values that your app needs to run, but shouldn't be hardcoded in your code. They're stored securely in Vercel and automatically injected into your app when it runs.

## The 4 Environment Variables You Need

You need to add these 4 environment variables in Vercel:

### 1. `NEXT_PUBLIC_SUPABASE_URL`

**What it is:** The URL/address of your Supabase project  
**Where to find it:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings** (gear icon) → **API**
4. Look for **"Project URL"**
5. It will look like: `https://abcdefghijklmnop.supabase.co`

**Value example:**
```
https://abcdefghijklmnop.supabase.co
```

**Why you need it:** Your app uses this to connect to Supabase for user authentication (login, signup, etc.)

---

### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**What it is:** A public API key that allows your app to access Supabase (safe to be public, but limited permissions)  
**Where to find it:**
1. In the same place: Supabase Dashboard → **Settings** → **API**
2. Look for **"Project API keys"** section
3. Copy the **"anon"** or **"public"** key (NOT the service_role key!)
4. It's a long string that starts with `eyJ...`

**Value example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

**Why you need it:** This key authenticates your app with Supabase API (for user login, profile access, etc.)

**Note:** The "anon" key is safe to expose publicly (that's why it has `NEXT_PUBLIC_` prefix), but it has limited permissions. Don't worry about sharing it.

---

### 3. `DATABASE_URL`

**What it is:** The connection string to your Supabase PostgreSQL database  
**Where to find it:**
1. Go to Supabase Dashboard → **Settings** → **Database**
2. Scroll down to **"Connection string"** section
3. Click on the **"Connection pooling"** tab
4. Select **"Transaction"** mode (for the URL)
5. Copy the connection string
6. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres`
7. **Replace `[YOUR-PASSWORD]`** with your actual database password

**To get/find your password:**
- If you don't remember it, click **"Reset database password"** in the Database settings
- Set a new password and save it securely
- Replace `[YOUR-PASSWORD]` in the connection string

**Value example:**
```
postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**Why you need it:** Your Prisma database needs this to connect to Supabase PostgreSQL to store/retrieve events, venues, and specials.

**Security Note:** This contains your database password! Never commit this to git or share it publicly. Only add it in Vercel's environment variables.

---

### 4. `SUPABASE_SERVICE_ROLE_KEY`

**What it is:** A secret admin key that allows your server to perform admin operations (bypasses Row Level Security)  
**Where to find it:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Look for **"Project API keys"** section
3. Copy the **"service_role"** key (NOT the anon key!)
4. It's a long string that starts with `eyJ...` (similar to anon key, but different)

**Value example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.different_from_anon_key
```

**Why you need it:** Your API routes need this to fetch user profiles server-side (bypassing Row Level Security). This is needed for operations like checking user roles when submitting events.

**Security Warning:** ⚠️ **NEVER expose this key publicly!** Unlike the anon key, the service_role key has full admin access to your database. Keep it secret!

---

## How to Add Them in Vercel

### Step 1: Go to Your Project Settings

1. In Vercel dashboard, open your project
2. Click **Settings** (top menu)
3. Click **Environment Variables** (left sidebar)

### Step 2: Add Each Variable

For each variable:

1. Click **"Add New"** or **"Add"** button
2. **Key:** Enter the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. **Value:** Paste the value you copied from Supabase
4. **Environments:** Select all three:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Click **"Save"**

### Step 3: Repeat for All 4 Variables

Add all four:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `DATABASE_URL`
4. `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Redeploy

After adding variables:
- If you haven't deployed yet, click **"Deploy"** in your project
- If already deployed, go to **Deployments** tab → Click the **"..."** menu on latest deployment → **"Redeploy"**
- This ensures the new environment variables are loaded

---

## Visual Guide: Where to Find Each Value

### Finding Supabase URL and Anon Key:

```
Supabase Dashboard
└── Settings (⚙️)
    └── API
        ├── Project URL ← Copy this for NEXT_PUBLIC_SUPABASE_URL
        └── Project API keys
            └── anon public ← Copy this for NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Finding Database URL:

```
Supabase Dashboard
└── Settings (⚙️)
    └── Database
        └── Connection string
            └── Connection pooling tab
                └── Transaction mode
                    └── Copy connection string ← Use this for DATABASE_URL
                    └── Replace [YOUR-PASSWORD] with actual password
```

---

## Quick Reference Checklist

When setting up environment variables, make sure:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Starts with `https://` and ends with `.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Long string starting with `eyJ...` (the "anon" key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Long string starting with `eyJ...` (the "service_role" key - DIFFERENT from anon key!)
- [ ] `DATABASE_URL` - Starts with `postgresql://` and includes your actual password (not `[YOUR-PASSWORD]`)
- [ ] All four are set for Production, Preview, and Development
- [ ] You've redeployed after adding variables

---

## Troubleshooting

### "Invalid Supabase URL"
- Make sure you copied the entire URL including `https://`
- No extra spaces at the beginning or end
- Should end with `.supabase.co` (not `.com`)

### "Invalid API key"
- For `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Make sure you copied the **anon** key
- For `SUPABASE_SERVICE_ROLE_KEY`: Make sure you copied the **service_role** key (different from anon!)
- Copy the entire key (it's very long)
- No extra spaces

### "Database connection failed"
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- Password might contain special characters - make sure they're correct
- Try resetting your database password in Supabase and updating `DATABASE_URL`

### "Variables not working after deployment"
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy your app after adding variables
- Variables only apply to new deployments

---

## Security Best Practices

1. **Never commit these to git** - They're already in `.gitignore` (.env files)
2. **Don't share `DATABASE_URL`** - Contains your database password
3. **The anon key is OK to be public** - That's why it's called "anon" (anonymous)
4. **Rotate passwords periodically** - Change database password every few months

---

## Example: What Your Vercel Environment Variables Should Look Like

```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://abcdefghijklmnop.supabase.co
Environments: ☑️ Production ☑️ Preview ☑️ Development

Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
Environments: ☑️ Production ☑️ Preview ☑️ Development

Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.different_example
Environments: ☑️ Production ☑️ Preview ☑️ Development

Key: DATABASE_URL
Value: postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

---

That's it! Once you add these three variables and redeploy, your app will be able to:
- ✅ Connect to Supabase for user authentication
- ✅ Store events, venues, and specials in the database
- ✅ Work fully in production

