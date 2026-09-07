# Wedding & Event Equipment Rental Management System

A modern, RTL-Arabic SaaS built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

## Features
- Public equipment catalog & simple booking form (no customer login):
  name + phone, rental date, required equipment + quantity, deposit-receipt upload, submit.
- Admin dashboard with bookings, payment verification, cash balance, handover, inventory, returns, completion, cleanup.
- Availability checks based on inventory status (server-authoritative.
- Deposit receipt upload via signed URL edge function (private storage bucket.
- Automatic 7-day personal-data cleanup via Supabase Edge Functions.


## Tech Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, Lucide.
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions.


## Development
```bash
# 1. Install dependencies
npm install

# 2. Create .env file (copy from .env.example)
cp .env.example .env

# 3. Run dev server
npm run dev
```

## Scripts
- `npm run dev` - Vite dev server
- `npm run build` - Production build
- `npm run preview` - Preview built site
- `npm test` - Vitest unit tests (business-logic only)
- `npm run test:integration` - Supabase integration tests (requires live project creds + `RUN_SUPABASE_INTEGRATION_TESTS=true`)

## Deployment
- **Frontend (Vercel)** - `vercel.json` provides the SPA fallback (`/(.*)` -> `/index.html`)
- **Supabase** - apply migrations in order (`supabase/migrations/*.sql`), create storage bucket `booking-receipts` (private), and deploy Edge Functions (`npx supabase functions deploy <name>` per function).
- Edge Functions are NOT auto-deployed - deploy manually after changes.


## Environment variables (example)
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## License
MIT
