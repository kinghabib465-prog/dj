# Wedding & Event Equipment Rental Management System

A modern, RTL‑Arabic SaaS built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

## Features (Planned)
- Public equipment catalog & booking wizard (no customer login)
- Admin dashboard with bookings, equipment, payments, returns, reports
- Real‑time inventory availability based on time ranges
- Deposit receipt upload & admin verification workflow
- Automatic 7‑day personal‑data cleanup via Supabase Edge Functions
- PWA support, ready for Netlify, Tauri, and Capacitor

## Development
```bash
# 1. Install dependencies
npm install

# 2. Create .env file (copy from .env.example)
cp .env.example .env

# 3. Run dev server
npm run dev
```

## Deployment
- **Netlify** – just connect the repo; the `netlify.toml` handles SPA redirects.
- **Supabase** – run the SQL migrations (`supabase/migrations/*.sql`) and set up storage bucket `booking-receipts` (private).

## Scripts
- `npm run dev` – Vite dev server
- `npm run build` – Production build
- `npm run preview` – Preview built site
- `npm run test` – Vitest unit tests (business‑logic only)

## Environment variables (example)
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## License
MIT
# dj
"# dj" 
"# gdj" 
"# dj" 
# dj
