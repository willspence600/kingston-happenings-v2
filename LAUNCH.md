# Kingston Happenings v2 — Launch Handoff

Handoff notes for setting up the app on Supabase + Vercel free tiers.

## Stack
- **Next.js 16** (App Router, React 19), TypeScript, Tailwind v4
- **Prisma 5** -> PostgreSQL (Supabase DB)
- **Supabase**: Auth + `profiles` table + Storage (`event-images` bucket)
- Repo root: `/Users/willspence/code/v2-kingston-happenings/kingston-happenings-v2`
- Current branch: `fix/final-pre-launch` (ahead of `main`)

## Architecture facts
- **Auth model**: Supabase Auth holds users (UUIDs). A `public.profiles` table stores `role` (`user`/`organizer`/`admin`), `name`, `venue_name`. Created via `supabase-setup.sql`, **not** Prisma. App user IDs are Supabase Auth UUIDs stored as strings; `submittedById` on events references these.
- **Prisma owns**: `Venue`, `Event`, `EventCategory`, `Like` tables. Schema at `prisma/schema.prisma`. Migration: `prisma/migrations/20260113000000_init_postgresql/migration.sql`.
- **Profiles trigger**: `handle_new_user()` auto-creates a profile row on signup from `raw_user_meta_data`. Admin is set manually in Supabase Table Editor (`profiles.role = 'admin'`).
- **Images**:
  - Uploaded images go to Supabase Storage bucket `event-images` (public, 5MB limit, auto-created by `src/lib/storage.ts`).
  - DB stores **relative** paths (`/storage/v1/object/public/event-images/...`); `getAbsoluteImageUrl()` in `src/utils/url.ts` maps them.
  - `next.config.ts` rewrites `/img/:path*` -> `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/:path*` (neutral path to dodge ad blockers).
  - `next/image` optimization enabled; `remotePatterns` allows `images.unsplash.com` (seed data). **If real uploaded images are served from the Supabase hostname directly, add that hostname to `remotePatterns`** (currently only Unsplash + same-origin `/img` proxy).
  - Food & drink specials intentionally have NO images.
- **Dev-only**: `/dev/bandwidth` dashboard + `BandwidthInterceptor` are gated by `NODE_ENV === 'development'`, so they are inert in production.

## Environment variables (see `env.example`)
Required in `.env` (Prisma CLI), `.env.local` (Next.js dev), and **Vercel project settings**:

```
NEXT_PUBLIC_SUPABASE_URL          # https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     # publishable key
SUPABASE_SERVICE_ROLE_KEY         # secret key - server only, never client
DATABASE_URL                      # Transaction Pooler, port 6543, ?pgbouncer=true
DIRECT_URL                        # Direct/session connection, port 5432 (for migrations)
```

## Local Supabase vs. hosted Supabase
- **Local** (current dev setup): `supabase start` runs Docker containers; API at `http://localhost:54321`, DB at `localhost:54322`. Config in `supabase/config.toml` (project_id `kingston-happenings-v2`). Local profiles schema lives in `supabase/migrations/00000000000000_init_profiles.sql`.
- **Hosted (launch target)**: Create a Supabase project on the free tier, then:
  1. Set the 5 env vars from the hosted project's Settings -> API + Database.
  2. Run `supabase-setup.sql` in the **hosted** SQL Editor to create `profiles` + trigger + RLS.
  3. Apply Prisma schema to hosted DB: `npx prisma migrate deploy` (uses `DIRECT_URL`).
  4. Create the `event-images` storage bucket (the app auto-creates it on first upload via the service role, or make it manually).
  5. Optionally seed: `npm run db:seed` (demo data) - likely skip for production, or seed then clear with `npm run db:clear-demos`.
  6. Set yourself admin in `profiles`.
- Free tier has ~5 GB storage egress; image optimization already minimizes this (`next/image` + caching dropped image bandwidth ~99%).

## Vercel deployment
- **Build**: `npm run build` = `prisma generate && next build`. `postinstall` also runs `prisma generate`.
- Set all 5 env vars in Vercel (Production + Preview).
- **Critical**: Vercel needs `DATABASE_URL` = Supabase **Transaction Pooler (port 6543, `?pgbouncer=true`)** for serverless runtime, and `DIRECT_URL` = direct (5432) for migrations. Using a direct connection in serverless exhausts connections.
- `public/robots.txt` already blocks bots from crawling API routes.
- Supabase Auth: after deploy, add the Vercel production URL to Supabase **Auth -> URL Configuration** (Site URL + Redirect URLs). `src/app/auth/callback/route.ts` handles the auth callback.

## Useful scripts
```
npm run dev                     # local dev
npm run db:seed                 # seed demo data
npm run db:clear-demos          # remove demo events
npm run db:clear-special-images # null out food-deal images + delete storage files
npm run db:studio               # Prisma Studio
```

## Untracked / ignore for launch
`old env` (likely real secrets - do NOT commit), `prisma/check-imageUrl.ts`, `test-json.js`, `test.html`, `June17note.md`.
