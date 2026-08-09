# The Grid by Ball Pit Motorsports

The Grid is a tenant-ready motorsports operating system for events, sessions, vehicles, consumables, maintenance, weather, media, and reusable workflows. Ball Pit Motorsports is the first workspace, not a hard-coded single customer.

## Foundation

- Next.js responsive web application
- Supabase PostgreSQL, authentication, storage, and row-level security
- Vercel deployment target
- Workspace-scoped operational data
- Event-first records and versioned checklist workflows

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `npm install`.
4. Run `npm run dev`.

Never commit `.env.local`, service-role keys, access tokens, or production credentials.

## Deployment wiring

1. Import this repository into the Ball Pit Motorsports Vercel team.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel for Preview and Production.
3. Link a Supabase project locally and apply migrations only after review.
4. Configure Supabase Auth redirect URLs for the Vercel preview URL and final Grid domain.

## Current MVP status

The private vertical slice is implemented:

- Supabase email/password authentication and protected application routes
- Ball Pit Motorsports workspace onboarding with starter vehicles
- Event Index creation with vehicle, driver, team, track, organization and consumables
- Automatic event-level weather retrieval by track and date
- Session entry keyed to Event ID, with automatic fastest-session calculation
- Versioned pre-event safety checklist
- Responsive Ball Pit/Drive North Texas visual system

The production Supabase schema includes tenant-aware events, sessions and checklist records with row-level security. Historical Google Sheets import remains the next migration milestone.

## Safe connection check

`GET /api/health/supabase` verifies project reachability and publishable-key acceptance with an authenticated, non-data Supabase Auth settings request. The response includes only a diagnostic category and upstream HTTP status; it never includes project URLs, keys, tokens, error bodies, or database content. Vercel builds fail when required application environment variables are absent; local and generic CI builds may run without hosted credentials.
