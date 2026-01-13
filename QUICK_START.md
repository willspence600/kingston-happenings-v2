# Quick Start Guide

Get up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- (Optional) Vercel account for deployment

## Step-by-Step Setup

### 1. Clone & Install

```bash
# Install dependencies
npm install
```

### 2. Set Up Supabase

**Follow the detailed guide**: See `SUPABASE_SETUP.md` for complete instructions.

**Quick version:**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project (save the database password!)
3. Run the SQL from `SUPABASE_SETUP.md` Step 2 to create `profiles` table
4. Copy API keys and connection strings from Supabase Dashboard

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# (See SUPABASE_SETUP.md for where to find each value)
```

### 4. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

### 6. Test It Out

```bash
# Test API endpoints
./test-api.sh

# Or open Prisma Studio to view database
npm run db:studio
```

## What You Need

### Required Services

1. **Supabase** (Free tier)
   - Database (PostgreSQL)
   - Authentication
   - [Sign up here](https://supabase.com)

### Optional Services (for deployment)

2. **Vercel** (Free tier)
   - Hosting & deployment
   - [Sign up here](https://vercel.com)

## Common Issues

**"Database connection failed"**
→ Check your `DATABASE_URL` and `DIRECT_URL` in `.env.local`

**"Table 'profiles' does not exist"**
→ Run the SQL from `SUPABASE_SETUP.md` Step 2

**"Invalid API key"**
→ Make sure you copied the full key from Supabase Dashboard

## Next Steps

- ✅ Read `SUPABASE_SETUP.md` for detailed Supabase setup
- ✅ Read `TESTING_GUIDE.md` to test your API
- ✅ Check `README.md` for full documentation

## Need Help?

- Check `SUPABASE_SETUP.md` for Supabase troubleshooting
- Check `TESTING_GUIDE.md` for API testing
- Check `README.md` for full project documentation
