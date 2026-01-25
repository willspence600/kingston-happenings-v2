# Kingston Happenings Web App

A modern event discovery platform for Kingston, Ontario. Find concerts, food specials, trivia nights, and everything happening in the Limestone City.

## Features

- **Homepage** - Today's events at a glance with featured and upcoming events
- **Browse Events** - Filter by category, search, and date
- **Calendar View** - Monthly calendar with event indicators
- **Venue Directory** - Explore Kingston's venues and their events
- **Submit Events** - Form for organizers to submit new events
- **User Authentication** - Sign up/sign in with Supabase Auth

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL (unified database for users, events, venues, and specials)
- **Fonts**: DM Serif Display + Outfit
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Date Handling**: date-fns

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings > API** in your Supabase dashboard
4. Copy your **Project URL** and **anon/public key**

### 3. Create the Profiles Table

The app stores user roles in a `profiles` table. Run the SQL setup script:

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the contents of `supabase-setup.sql` (in the webapp folder)
4. Click **Run**

This creates:
- A `profiles` table with `id`, `role`, `name`, `venue_name` columns
- RLS policies so users can only access their own profile
- A trigger to auto-create profiles when users sign up

### 4. Get Database Connection String

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Copy the **Connection pooling** connection string (port 6543)
4. Replace `[YOUR-PASSWORD]` with your database password

### 5. Configure Environment Variables

Create a `.env.local` file in the project root (this repo) for Next.js.
Also create a `.env` file for Prisma CLI (Prisma loads `.env` by default, not `.env.local`).

Tip: you can keep a single source of truth by copying the same values into both files.

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_secret_key_here

# Supabase Database Connection (for Prisma)
# Runtime (pooler / 6543)
DATABASE_URL="postgres://postgres.your-project-ref:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Migrations (direct or pooler session / 5432)
DIRECT_URL="postgres://postgres.your-project-ref:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

**See `SUPABASE_DATABASE_SETUP.md` for detailed setup instructions.**

### 6. Set Up Database Tables

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev

# (Optional) Seed with sample data
npm run db:seed
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## User Roles

The app supports three user roles:

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Event-Goer** (`user`) | Regular users | Browse events, save favorites |
| **Organizer** (`organizer`) | Event organizers | Submit events, manage their submissions |
| **Admin** (`admin`) | Platform administrators | Approve/reject events, manage all content |

### Setting Yourself as Admin

After signing up, you can promote yourself to admin via the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **profiles**
3. Find your row (look for your name or user ID)
4. Click on the row to edit it
5. Change the `role` column from `user` or `organizer` to `admin`
6. Press Enter or click outside to save

**That's it!** Refresh the app and you'll have admin access.

> **Note**: Normal users cannot change their own role through the app - this can only be done via the Supabase dashboard, which is protected by your Supabase credentials.

### Creating the Admin Account (Alternative)

If you prefer to create a dedicated admin account:

1. Register a new account in the app (e.g., `admin@kingstonhappenings.ca`)
2. Go to Supabase **Table Editor** → **profiles**
3. Find the new user's row and set `role` to `admin`

## Authentication Flow

1. **Sign Up**: Users choose Event-Goer or Organizer role during registration
2. **Profile Created**: A profile row is created in `profiles` table with chosen role
3. **Sign In**: Email/password authentication via Supabase
4. **Role Loaded**: App fetches role from `profiles` table
5. **Session Persistence**: Sessions persist across page refreshes
6. **Sign Out**: Clears session and returns to logged-out state

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage
│   ├── events/            # Events browse + detail pages
│   ├── calendar/          # Calendar view
│   ├── venues/            # Venues directory + detail pages
│   ├── submit/            # Event submission form
│   ├── about/             # About page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── admin/             # Admin dashboard (admin only)
│   └── api/               # API routes
├── components/            # Reusable components
│   ├── Navigation.tsx     # Header navigation
│   ├── Footer.tsx         # Site footer
│   ├── EventCard.tsx      # Event display card
│   └── CategoryFilter.tsx # Category filter buttons
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication state (fetches from profiles)
├── lib/                   # Utilities
│   ├── supabaseClient.ts  # Browser Supabase client
│   ├── supabaseServer.ts  # Server Supabase client
│   ├── auth.ts            # Server-side auth helpers
│   └── prisma.ts          # Prisma client
├── data/                  # Mock data
│   └── mockData.ts        # Sample events and venues
└── types/                 # TypeScript types
    └── event.ts           # Event, Venue types
```

## Design System

### Colors
- **Primary**: Warm terracotta (#C45D35) - Kingston's historic limestone inspiration
- **Secondary**: Deep forest green (#2D4A3E) - Lake Ontario and nature
- **Accent**: Soft peach (#E8A87C) - Sunset over the waterfront

### Typography
- **Display**: DM Serif Display - Elegant headings
- **Body**: Outfit - Clean, modern body text

## Event Categories

- Concerts
- Food & Drink Specials
- Trivia Nights
- Theatre & Arts
- Sports
- Festivals
- Markets
- Workshops & Classes
- Nightlife
- Family Friendly
- Community Events

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:seed    # Seed database with sample data
npm run db:reset   # Reset database (removes all data)
npm run db:studio  # Open Prisma Studio
```

## Troubleshooting

### "Missing Supabase environment variables"
Make sure you have created `.env.local` with the correct Supabase URL and anon key.

### "Invalid login credentials"
- Check that the email and password are correct
- Ensure the user exists in Supabase Auth

### Admin can't access admin dashboard
1. Go to Supabase **Table Editor** → **profiles**
2. Verify your row has `role` set to `admin`
3. Try logging out and back in to refresh the session

### "relation 'profiles' does not exist"
You need to run the SQL setup script. Go to Supabase **SQL Editor** and run the contents of `supabase-setup.sql`.

## Related

- [Event Scraper](/scraper) - Python scraper for discovering Kingston events
