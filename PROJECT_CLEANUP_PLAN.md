# PROJECT CLEANUP PLAN — Wedding & Event Equipment Rental

Goal: make the repository CLEAN, COHERENT, MINIMAL, BUILDABLE, SECURE — preserving the real business lifecycle
(public booking → PENDING_PAYMENT_REVIEW → CONFIRMED → READY_FOR_PICKUP → EQUIPMENT_OUT → RETURN → COMPLETED).

---

## KEEP (production / required)

- `src/pages/Home.tsx`, `Equipment.tsx`, `Booking.tsx`, `BookingSuccess.tsx`, `Contact.tsx`
- `src/pages/admin/Login.tsx` — canonical admin login ( professional UI, redirects to `/admin/dashboard`)
- `src/admin/Dashboard.tsx`, `ReturnsList.tsx`, `ReturnsDetail.tsx`, `EquipmentInside.tsx`, `EquipmentOutside.tsx`, `Calendar.tsx`
- `src/admin/BookingDetail.tsx` — REPAIRED: gets routed ( was orphaned; carries cash-balance / handover / completion actions)
- `src/components/Layout.tsx` — REPAIRED ( duplicate import block removed)
- `src/components/EquipmentPreview.tsx`, `HowItWorks.tsx`, `ProtectedAdminRoute.tsx`
- `src/components/NewBookingWizardV2.tsx` — canonical public booking form; REPAIRED ( dead 5-step wizard code removed; single-page form remains: name, phone, date, equipment cards + quantity, receipt upload, submit — no customer email/password/account)
- `src/lib/supabase.ts` — REPAIRED ( duplicate comments removed;; anon/publishable key only)
- `src/App.tsx` — REPAIRED ( admin login import fixed; `/admin/booking/:bookingId` route restored for BookingDetail)
- `src/types.ts`, `src/main.tsx`, `src/index.css`, `vercel.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.env.example`
- vitest configs + active tests ( basic, admin_pages, equipment_rls.integration, public_booking_lifecycle.integration, return_flow.integration — moved under `src/__tests__/integration/` and cleanup-bug fixed)
- `supabase/migrations/*.sql` — ALL PRESERVED ( never delete applied migrations)
- `supabase/functions/**` — preserved ( lifecycle functions); debug/shortcut code removed;; `cors.ts`/`errors.ts` dead shared files removed
- `package.json` — dependencies all in use; preserved
---

## DELETE (verified unused or safe duplicates)

| File | Reason |
|---|---|
| `build_output.txt` | Past failed-build log dump; not referenced |
| `debugLine26.ps1` + `debugLine27.ps1` + `debugLine39.ps1` + `debugLines30to35.ps1` | One-off debug scripts for a past Home.tsx JSX fix; unreferenced |
| `fixHome.js` + `fixHome.ps1` + `fixHomeBlock.ps1` + `fixHomeRegex.ps1` | One-off debug scripts for past Home.tsx fix; unreferenced |
| `list_buckets.ts` | One-off storage diagnostic Deno script; unreferenced |
| `netlify.toml` | Stale config — production host is Vercel (`vercel.json` active) |
| `schema.sql` | Empty (0-byte) file; useless |
| `setup_project.ps1` | One-off setup helper duplicating README commands; unreferenced |
| `temp_test.js`, `temp_test_balance.js`, `test_upload.js` | Temporary minified debug test scripts; unreferenced |
| `scripts/` (13 files) | One-off Supabase diagnostic/verify scripts; unreferenced by package.json, build, or any active test |
| `src/components/BookingWizard.tsx` | Duplicate wizard; no importers (canonical: NewBookingWizardV2) |
| `src/components/BookingWizardFull.tsx` | Duplicate broken wizard (`@ts-nocheck`, incomplete body); no importers |
| `src/components/NewBookingWizard.tsx` | Duplicate wizard; no importers; was tsconfig-excluded |
| `src/components/RentalCalendar.tsx` | Becomes unreferenced after wizard dead-code removal ( live form uses native date input) |
| `src/admin/Login.tsx` | Duplicate admin login; superseded by `src/pages/admin/Login.tsx` (App.tsx updated) |
---

## MERGE

- Admin login: `src/pages/admin/Login.tsx` becomes THE canonical login ( App.tsx import updated).

---

## REPAIR

1. `src/App.tsx` — fix admin-login import; add `/admin/booking/:bookingId` route (restores cash-balance/handover/completion admin flow).
2. `src/components/Layout.tsx` — remove duplicated import block.
3. `src/components/NewBookingWizardV2.tsx` — delete dead `renderStep` 5-step wizard ( never called,, unused `notes`/`step` state, unused `RentalCalendar` import;; single-page form remains..
4. `src/lib/supabase.ts` — dedupe repeated comments..
5. `tsconfig.json` — drop `exclude` for deleted `NewBookingWizard.tsx`.
6. `src/__tests__/return_flow.integration.test.ts` — fix invalid `afterAll` delete (`.eq("return_id", supabase.rpc(...))` bug); remove debug log; move to `src/__tests__/integration/`.
---

## UNKNOWN / REVIEW (not hidden — tracked honestly)

- Integration tests require live Supabase creds (`.env.local`) + `RUN_SUPABASE_INTEGRATION_TESTS=true` to exercise the API — environment-dependent by design.
- `supabase/functions/expire-pending-bookings`, `cleanup-completed-bookings`, `cleanup-orphan-receipts` — scheduled/server flows; left as-is..
- Edge-function deployments are NOT triggered by `git push` — need `supabase functions deploy` ( or Supabase CI) to apply the cleaned source remotely.

## EXECUTION RESULT

REMOVED: ( filled after execution)
PRESERVED: migrations (19), edge functions (8 active), active tests, core src библиотека
REPAIRED: ( see REPAIR 1–13)
BUILD: ( result)
TEST:( result)
7. `supabase/functions/create-receipt-upload/index.ts` — remove debug shortcuts (`x-test`, `x-debug`, `x-debug-body`, `x-early`) и unsafe `console.log` spam — including logging ALL request headers (leaks Bearer tokens) and `Storage response` (leaks signedUrl). Keep only `console.error`.
8. `supabase/functions/verify-payment/index.ts` — remove `?debug=true` shortcut, debug logs,and `fetchError` field leaked in success response..
9. `supabase/functions/record-balance-payment/index.ts` — remove debug logs + dead commented-out block;; add CORS headers to all responses..
10. `supabase/functions/hand-over-equipment/index.ts` — remove debug log;; add OPTIONS/CORS handling (browser-invoked by BookingDetail).
11. `supabase/functions/complete-booking/index.ts` — fix broken admin check ( old `supabase.rpc("is_admin")` on service-role client doesn't represent caller JWT); adopt `requireAdmin`;; add OPTIONS/CORS handling..
12. `.gitignore` — add `supabase/.temp/`.
13. `README.md` — deployment = Vercel ( drop Netlify), remove trailing garbage lines,, tidy env-var docs..
| `src/__tests__/integration/equipment_rls.test.ts.bak` | Obsolete duplicate of active `equipment_rls.integration.test.ts`; no references |
| `supabase/functions/_shared/cors.ts` | Dead duplicate CORS helper — every function uses `corsHelper.ts`; no importers |
| `supabase/functions/_shared/errors.ts` | Dead — `HttpError` never imported by any function |
| `supabase/.temp/*` (9 files) | Generated CLI cache (regenerated on demand); unrelated to source |
## EXECUTION RESULT

REMOVED (47 tracked files + supabase/.temp):
- Root junk: build_output.txt, netlify.toml, schema.sql (empty), setup_project.ps1, list_buckets.ts, temp_test.js, temp_test_balance.js, test_upload.js, debugLine26/27/39.ps1, debugLines30to35.ps1, fixHome*.ps1/js.
- scripts/ (13 one-off Supabase diagnostic scripts).
- supabase/.temp/ (9 generated CLI-cache files.
- Duplicate wizards: BookingWizard.tsx, BookingWizardFull.tsx, NewBookingWizard.tsx, RentalCalendar.tsx.
- src/admin/Login.tsx (duplicate admin login.
- src/__tests__/integration/equipment_rls.test.ts.bak (obsolete duplicate.
- Dead edge-shared: _shared/cors.ts, _shared/errors.ts (never imported.

PRESERVED: all 19 migrations; 8 edge-function dirs + _shared/{adminAuth,corsHelper,supabase}.ts; all active src pages/components/admin/tests; vercel.json, package.json, tailwind.config.js, vitest*, .env.example.

REPAIRED:
1. src/App.tsx - admin-login import fixed; /admin/booking/:bookingId route restored for BookingDetail.
2. src/components/Layout.tsx - duplicated import block removed.
3. src/components/NewBookingWizardV2.tsx - dead 5-step renderStep wizard + unused state removed; runtime availability bug fixed (v.outside_quantity); typed fileChange; style tag fixed. Single canonical public form remains: name+phone+date+equipment cards+qty+receipt+submit.
4. src/lib/supabase.ts - deduped comments.
5. tsconfig.json - stale exclude dropped.
6. return_flow.integration.test.ts - moved to integration/; import fixed; debug console.log removed; invalid afterAll delete fixed.
7. src/admin/ReturnsDetail.tsx - TS never assignment fixed.
8. create-receipt-upload - ALL console.log debug removed (incl request-header dump that leaked Bearer tokens + storage-response leak with signedUrl); debug headers removed.
9. verify-payment - ?debug=true shortcut, debug logs, dead fetches, leaked fetchError in success response - all removed.
10. record-balance-payment - debug logs + dead commented block removed; double CORS spread fixed.
11. hand-over-equipment - CORS + OPTIONS added (browser-invoked.
12. complete-booking - migrated broken service-role is_admin() check to requireAdmin; CORS + OPTIONS added.
13. .gitignore - supabase/.temp/ added.
14. README.md - Vercel-first docs; garbage removed.

DEPENDENCIES REMOVED: none (all existing deps in use.
BUILD: PASS (npm run build.
TYPECHECK: PASS (npx tsc --noEmit.
UNIT TESTS: PASS (npm test - 2 files/2 tests.
INTEGRATION TESTS: environment-gated (RUN_SUPABASE_INTEGRATION_TESTS=true + live creds; describe.skip by default.
SECURITY: no secrets in tracked source; edge functions no longer log tokens/signedUrls; .env* + supabase/.temp/ ignored.

CUSTOMER BOOKING FINAL FIELDS (single-page form: 1 name+surname 2 phone 3 date (start+end 4 equipment cards+quantity 5 receipt upload 6 submit -> PENDING_PAYMENT_REVIEW. No customer account/email.

BACKEND PRESERVED: create-public-booking, create-receipt-upload, verify-payment, record-balance-payment, hand-over-equipment, complete-booking, expire/cleanup scheduled functions; all migrations intact.

GIT: committed (hash in final report.
