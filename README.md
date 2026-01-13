# Kingston Happenings

A modern event discovery platform for Kingston, Ontario. Discover live music, food specials, trivia nights, festivals, and everything happening in the Limestone City—all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)
![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3ECF8E?logo=supabase)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technical Architecture & Stack](#2-technical-architecture--stack)
3. [Data Model & Database Schema](#3-data-model--database-schema)
4. [Environment Variables & Configuration](#4-environment-variables--configuration)
5. [Local Development Setup](#5-local-development-setup)
6. [Project Structure](#6-project-structure)
7. [Deployment Guide](#7-deployment-guide)

---

## 1. Project Overview

**Kingston Happenings** is a community-driven events platform designed to help residents and visitors discover what's happening in Kingston, Ontario. The platform aggregates events from local venues, organizers, and community members into a single, searchable interface.

### Key Features

#### For Event-Goers
- 🔍 **Browse Events** — Filter by category, date range, or venue
- 📅 **Calendar View** — Visual calendar with event indicators
- ❤️ **Save Favorites** — Like and track events you're interested in
- 🍔 **Food & Drink Specials** — Dedicated section for daily deals
- 🔄 **Recurring Events** — See weekly trivia, open mics, etc.

#### For Event Organizers
- ➕ **Submit Events** — Easy form to add events (pending approval)
- 📊 **Track Submissions** — View status of submitted events
- 🏢 **Create Venues** — Add new venues that don't exist yet

#### For Administrators
- ✅ **Approve/Reject Events** — Moderation queue for new submissions
- 🏢 **Manage Venues** — Approve new venues, edit details
- 👥 **User Management** — View and manage user accounts

---

## 2. Technical Architecture & Stack

### Frontend Framework
- **Next.js 16** (App Router) — React framework with server-side rendering
- **React 19** — UI library with latest features
- **TypeScript 5** — Type-safe development

### Backend/API
- **Next.js API Routes** — Serverless API endpoints in `/app/api/`
- **Prisma ORM 5.22** — Type-safe database access
- **Supabase Authentication** — Managed auth with email/password, session management

### Database
- **PostgreSQL** (via Supabase) — Primary database
- **Prisma** — ORM for schema management and queries

### Styling
- **Tailwind CSS v4** — Utility-first CSS framework
- **Custom Design System** — Kingston-inspired color palette
- **Framer Motion** — Animations and transitions

### Third-Party Services

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database hosting + Authentication |
| **Prisma** | ORM and database migrations |
| **Vercel** | Hosting and deployment |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and manipulation |

---

## 3. Data Model & Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    User     │       │    Venue    │       │  EventCategory  │
├─────────────┤       ├─────────────┤       ├─────────────────┤
│ id          │       │ id          │       │ id              │
│ name        │       │ name        │       │ name            │
│ email       │       │ address     │       └────────┬────────┘
│ password    │       │ neighborhood│                │
│ role        │       │ website     │                │
└──────┬──────┘       │ imageUrl    │                │
       │              │ status      │                │
       │              │ promotionTier                │
       │              └──────┬──────┘                │
       │                     │                       │
       │    ┌────────────────┴───────────────┐      │
       │    │                                │      │
       ▼    ▼                                │      │
┌─────────────────────┐                      │      │
│       Event         │◄─────────────────────┘      │
├─────────────────────┤                             │
│ id                  │                             │
│ title               │         ┌───────────────────┘
│ description         │         │
│ date                │         ▼
│ startTime           │  ┌─────────────────────┐
│ endTime             │  │ _EventToEventCategory│
│ venueId (FK)        │  ├─────────────────────┤
│ submittedById (FK)  │  │ A (Event.id)        │
│ status              │  │ B (EventCategory.id)│
│ isRecurring         │  └─────────────────────┘
│ recurrencePattern   │
│ parentEventId       │  ┌─────────────────────┐
│ price               │  │       Like          │
│ ticketUrl           │  ├─────────────────────┤
│ imageUrl            │  │ id                  │
│ featured            │  │ userId (FK)         │
└─────────────────────┘  │ eventId (FK)        │
                         └─────────────────────┘
```

### Core Tables

| Table | Description |
|-------|-------------|
| `User` | Registered users (attendees, organizers, admins) |
| `Venue` | Physical locations where events take place |
| `Event` | Individual event listings |
| `EventCategory` | Categories like "live-music", "trivia", etc. |
| `Like` | User favorites (many-to-many User↔Event) |

### Key Fields

**User.role** (enum):
- `user` — Regular attendee
- `organizer` — Can submit events
- `admin` — Full moderation access

**Event.status** (enum):
- `pending` — Awaiting admin approval
- `approved` — Visible to public
- `rejected` — Declined by admin
- `cancelled` — Event cancelled

**Venue.status** (enum):
- `pending` — Awaiting approval
- `approved` — Visible in venue list
- `rejected` — Not approved

---

## 4. Environment Variables & Configuration

### Required Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string (pooler for serverless) | Supabase Dashboard → Settings → Database → Connection pooling |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) | Supabase Dashboard → Settings → Database → Direct connection |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Supabase Dashboard → Settings → API → service_role key |

### Example `.env.local`

```env
# Database (Supabase PostgreSQL)
# Connection pooling mode (for app runtime) - port 6543
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"

# Direct connection mode (for migrations) - port 5432
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Important Notes:**
- Replace `[YOUR-PASSWORD]` with your actual Supabase database password
- Replace `[PROJECT-REF]` with your actual Supabase project reference
- `DATABASE_URL` uses port **6543** (connection pooling) for better serverless performance
- `DIRECT_URL` uses port **5432** (direct connection) for migrations
- Never commit `.env.local` to git (should be in `.gitignore`)

### Getting Your Environment Variables

#### 1. Supabase URL and Anon Key
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy **Project URL** for `NEXT_PUBLIC_SUPABASE_URL`
5. Copy **anon/public** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 2. Database Connection String
1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. For `DATABASE_URL`: Select **Connection pooling** tab → Copy connection string → Replace `[YOUR-PASSWORD]` with your password
4. For `DIRECT_URL`: Select **Direct connection** tab → Copy connection string → Replace `[YOUR-PASSWORD]` with your password

#### 3. Service Role Key
1. In Supabase Dashboard, go to **Settings** → **API**
2. Under **Project API keys**, copy the **service_role** key
3. ⚠️ **Security Warning**: Never expose this key publicly! It has admin privileges.

### Setting Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: The actual value
   - **Environments**: Select all (Production, Preview, Development)
3. Click **Save**
4. **Important**: Redeploy after adding/updating variables (they only apply to new deployments)

---

## 5. Local Development Setup

### Prerequisites

- **Node.js 18+** — JavaScript runtime
- **npm** or **pnpm** — Package manager
- **PostgreSQL** — Database (or use Supabase)

### Installation

```bash
# 1. Navigate to webapp directory
cd webapp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev

# 6. (Optional) Seed the database
npx prisma db seed

# 7. Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma db push` | Push schema changes (no migration) |

### Running Database Migrations

After setting up your environment variables, you need to create the database tables:

```bash
# Make sure DATABASE_URL is set in your environment
# For local development, it should be in .env.local

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev

# Or apply existing migrations to production
npx prisma migrate deploy
```

**For Production Migrations:**
- Use `DIRECT_URL` (port 5432) for migrations, not `DATABASE_URL`
- Set `DIRECT_URL` temporarily: `export DIRECT_URL="your-direct-connection-string"`
- Run: `npx prisma migrate deploy`

**Verifying Migrations:**
- Check Supabase Dashboard → Table Editor
- You should see: `Event`, `Venue`, `EventCategory`, `Like`, `User` tables

---

## 6. Project Structure

```
webapp/src/
├── app/                    # Next.js App Router pages & API
│   ├── api/               # API route handlers
│   │   ├── auth/          # Login, logout, register, session
│   │   ├── events/        # Event CRUD + approval endpoints
│   │   ├── likes/         # Like/unlike events
│   │   ├── user/          # User profile management
│   │   └── venues/        # Venue CRUD + approval
│   ├── about/             # About page
│   ├── account/           # User account settings
│   ├── admin/             # Admin dashboard
│   ├── calendar/          # Calendar view
│   ├── events/            # Events list & detail pages
│   │   ├── [id]/          # Event detail page
│   │   └── page.tsx       # Browse events page
│   ├── login/             # Login page
│   ├── my-events/         # User's saved/submitted events
│   ├── register/          # Registration page
│   ├── submit/            # Event submission form
│   ├── venues/            # Venues list & detail pages
│   ├── globals.css        # Global styles & Tailwind
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
│
├── components/             # Reusable React components
│   ├── ui/                # Generic UI primitives
│   │   ├── Modal.tsx      # Modal dialog component
│   │   ├── Toast.tsx      # Toast notification component
│   │   ├── DatePicker.tsx # Custom date picker
│   │   └── index.ts       # Barrel export
│   ├── events/            # Event-specific components
│   │   ├── EventCard.tsx  # Event card display
│   │   ├── CategoryFilter.tsx
│   │   └── index.ts
│   ├── venues/            # Venue-specific components
│   │   ├── VenueSelector.tsx
│   │   └── index.ts
│   ├── layout/            # Layout components
│   │   ├── Navigation.tsx # Header navigation
│   │   ├── Footer.tsx     # Site footer
│   │   └── index.ts
│   └── index.ts           # Main barrel export
│
├── constants/              # Application constants
│   ├── categories.ts      # Category labels, colors, lists
│   └── index.ts
│
├── contexts/               # React Context providers
│   ├── AuthContext.tsx    # Authentication state & methods
│   └── EventsContext.tsx  # Events data & filtering
│
├── lib/                    # Core utilities & clients
│   ├── auth.ts            # Supabase auth helpers, user session management
│   ├── prisma.ts          # Prisma client singleton
│   ├── supabaseAdmin.ts   # Supabase admin client (service role)
│   ├── supabaseClient.ts  # Supabase browser client
│   └── supabaseServer.ts  # Supabase server client
│
├── services/               # API service layer
│   └── api/               # Client-side API functions
│       ├── events.ts      # Event API calls
│       ├── venues.ts      # Venue API calls
│       ├── likes.ts       # Like/unlike API calls
│       └── index.ts
│
├── types/                  # TypeScript definitions
│   ├── event.ts           # Event, Venue, User types
│   └── index.ts
│
└── utils/                  # Pure utility functions
    ├── events.ts          # Event sorting, filtering
    ├── date.ts            # Date formatting, holidays
    ├── formatting.ts      # String formatting helpers
    └── index.ts
```

### Architecture Principles

**Separation of Concerns:**
- `components/` — UI rendering only
- `services/` — API communication
- `utils/` — Pure business logic
- `contexts/` — State management
- `types/` — Type definitions
- `constants/` — Static configuration

**Import Convention:**
```typescript
// Use barrel exports for clean imports
import { EventCard, Modal, Toast } from '@/components';
import { categoryLabels, categoryColors } from '@/constants/categories';
import type { Event, Venue } from '@/types/event';
import { sortEventsByPromotion } from '@/utils/events';
import { fetchEvents } from '@/services/api';
```

**Component Organization:**
- `ui/` — Generic, reusable UI components (Modal, Toast, DatePicker)
- `events/` — Event-domain components (EventCard, CategoryFilter)
- `venues/` — Venue-domain components (VenueSelector)
- `layout/` — App-wide layout (Navigation, Footer)

---

## 7. Deployment Guide

### Recommended: Vercel (Best for Next.js)

Vercel is made by the creators of Next.js and offers:
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS/SSL
- ✅ Easy custom domain setup
- ✅ Automatic deployments from GitHub
- ✅ Serverless functions (perfect for Next.js API routes)

### Step 1: Prepare Your Code

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/kingston-happenings.git
   git push -u origin main
   ```

2. **Make sure `.env.local` is in `.gitignore`** (should already be there)

### Step 2: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with **GitHub** (recommended - easiest integration)

### Step 3: Import Your Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Select your `kingston-happenings` repository
4. Click **"Import"**

### Step 4: Configure Project Settings

1. **Framework Preset**: Should auto-detect "Next.js" - keep it
2. **Root Directory**: Leave as root (or set to project root if needed)
3. **Build Command**: `npm run build` (or leave default)
4. **Output Directory**: `.next` (leave default)
5. **Install Command**: `npm install` (leave default)

### Step 5: Add Environment Variables

Before deploying, add all your environment variables in Vercel:

1. Click **"Environment Variables"** in project settings
2. Add each variable (see Section 4 for details):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL` (connection pooling mode)
   - `DIRECT_URL` (direct connection for migrations)
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Select all environments (Production, Preview, Development)
4. Click **"Save"** for each variable

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-5 minutes)
3. Your site will be live at `https://your-project-name.vercel.app`

### Step 7: Run Database Migrations

Your production database needs tables:

```bash
# Set your production DIRECT_URL temporarily
export DIRECT_URL="postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres"

# Run migrations
npx prisma migrate deploy
```

**Note:** Use port `5432` (direct connection) for migrations, not `6543` (pooling mode).

### Step 8: Set Up Custom Domain (Optional)

1. In your Vercel project, go to **Settings** → **Domains**
2. Enter your domain (e.g., `kingstonhappenings.ca` or `www.kingstonhappenings.ca`)
3. Click **"Add"**
4. Vercel will show you DNS records to add:
   - **Root Domain**: Add `A` record pointing to Vercel's IP
   - **Subdomain (www)**: Add `CNAME` record pointing to `cname.vercel-dns.com`
5. Add DNS records at your domain registrar
6. Wait 5-60 minutes for DNS to propagate
7. Vercel will automatically provision SSL certificate

### Step 9: Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads at your Vercel URL (or custom domain)
- [ ] Database migrations completed (check Supabase Table Editor)
- [ ] User registration works
- [ ] User login works
- [ ] Event submission works
- [ ] Events appear on the site
- [ ] Admin panel works (if you set yourself as admin)
- [ ] Data persists (try submitting an event, refresh, it should still be there)
- [ ] HTTPS/SSL certificate is active (green lock in browser)

### Setting Yourself as Admin

1. **Sign up on your live site** (if you haven't already)
2. **Go to Supabase Dashboard** → Table Editor → `profiles` table
3. **Find your row** (look for your email or name)
4. **Edit the `role` column**: Change from `user` to `admin`
5. **Refresh your live site** - You should now have admin access!

### Continuous Deployment

Once set up:
- **Every push to main branch** = automatic deployment
- **Pull requests** = preview deployments (Vercel creates unique URLs)
- **Manual deployments** = possible from dashboard

### Troubleshooting Deployment

**"Build Failed"**
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally

**"Database Connection Error"**
- Verify `DATABASE_URL` is set correctly in Vercel
- Check password is correct (no `[YOUR-PASSWORD]` placeholder)
- Make sure you're using connection pooling mode (port 6543) for app
- Verify Supabase database is accessible

**"Environment Variables Not Working"**
- Make sure variables are added for **Production** environment
- Variable names must match exactly (case-sensitive)
- Redeploy after adding variables (they don't update on existing deployments)
- Check variable values don't have extra spaces

**"Site Shows 404 or Blank Page"**
- Check build logs for errors
- Verify Next.js configuration is correct
- Make sure `package.json` is in the correct location

---

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the architecture patterns
3. Ensure `npm run lint` passes
4. Test locally with `npm run dev`
5. Submit a pull request

---

## License

This project is proprietary. All rights reserved.
