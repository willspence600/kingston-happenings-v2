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
- **JWT Authentication** — Custom auth with HTTP-only cookies

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
| **Supabase** | PostgreSQL database hosting + Auth |
| **Prisma** | ORM and database migrations |
| **Vercel** | Hosting and deployment |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and manipulation |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT token generation |

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

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooler for serverless) |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

### Example `.env.local`

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Authentication
JWT_SECRET="your-secret-key-min-32-characters"

# Supabase (for auth callbacks and client)
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

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
│   ├── auth.ts            # JWT helpers, password hashing
│   ├── prisma.ts          # Prisma client singleton
│   ├── supabaseAdmin.ts   # Supabase admin client
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

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the architecture patterns
3. Ensure `npm run lint` passes
4. Test locally with `npm run dev`
5. Submit a pull request

---

## License

This project is proprietary. All rights reserved.
