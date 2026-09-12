# BOOKING WORKFLOW AUDIT

**Scope:** Wedding / event equipment rental booking lifecycle across the public
booking wizard, the admin console, Supabase RPCs and Edge Functions.

**Purpose:** Record the *current* behaviour, the *problem* with it, and the
*target* behaviour for every step of the workflow **before** code changes, so the
refactor has a single agreed reference.

**Status vocabulary is kept as-is at the database level.** The UI relabels
`PENDING_PAYMENT_REVIEW` as **«طلب جديد — بانتظار المراجعة»** (a customer request
that has not yet been accepted), which is what the business actually means.

---

## 0. Current state map (as audited)

| Layer | Artefact | Responsibility today |
| --- | --- | --- |
| Public | `src/components/NewBookingWizardV2.tsx` | collects customer + items + deposit receipt, calls `create-receipt-upload`, then `create-public-booking` |
| Public | `supabase/functions/create-receipt-upload` | signs a private upload URL under `pending/` |
| Public | `supabase/functions/create-public-booking` | validates, calls `create_booking` RPC, writes DEPOSIT payment + receipt |
| Admin | `src/admin/BookingDetail.tsx` | review deposit, edit deposit amount, record balance, hand over, start return, complete, trash, delete |
| Admin | `src/admin/BookingsList.tsx` | list + filter |
| Admin | `src/admin/Dashboard.tsx` | counters |
| Admin | `src/admin/Calendar.tsx` | month grid by rental window |
| Admin | `src/admin/EquipmentInside.tsx` / `EquipmentOutside.tsx` | inventory inside / outside |
| Admin | `src/admin/ReturnsList.tsx` / `ReturnsDetail.tsx` | return sessions |
| Admin | `src/admin/TrashList.tsx` | soft-deleted bookings |
| Backend | `verify-payment` | APPROVE → `CONFIRMED`, REJECT → `PAYMENT_REJECTED` |
| Backend | `record-balance-payment` | partial/full cash balance; auto `READY_FOR_PICKUP` at 0 |
| Backend | `hand-over-equipment` | `READY_FOR_PICKUP` → `EQUIPMENT_OUT` + inventory out |
| Backend | `complete-booking` | `RETURN_PENDING` → `COMPLETED` |
| Backend | `expire-pending-bookings` | `PENDING_PAYMENT_REVIEW` → `EXPIRED` |
| RPC | `create_booking`, `set_deposit_amount`, `start_equipment_return`, `upsert_return_item`, `maybe_complete_return`, `get_return_items_for_booking`, `soft_delete_booking`, `restore_booking`, `permanently_delete_booking`, `get_trashed_bookings` | see migrations `20240101`–`20240213` |

**Statuses in use:** `PENDING_PAYMENT_REVIEW`, `PAYMENT_REJECTED`, `CONFIRMED`,
`READY_FOR_PICKUP`, `EQUIPMENT_OUT`, `RETURN_PENDING`, `COMPLETED`, `CANCELLED`,
`EXPIRED` (plus soft-delete via `deleted_at`).

## 1. PUBLIC REQUEST (customer submits)

**CURRENT** — Wizard requires name, phone, start/end dates, ≥1 equipment, and a
deposit receipt image. `create-public-booking` inserts a booking with
`status = PENDING_PAYMENT_REVIEW`, `payment_status = PENDING`, one `DEPOSIT`
payment row (`status = PENDING`, `method = TRANSFER`) and `receipt_path`.
`deposit_required` is pre-computed from `equipment.deposit_price × qty`.

**PROBLEM**
- The wizard reads like a *confirmed booking* ("احجز") while it is only a
  **request**; the success screen does not tell the customer that an admin will
  call them.
- `deposit_required` is derived from catalogue prices, but the real transfer
  amount often differs — admin must correct it later (`set_deposit_amount`),
  and that correction is a separate step that is easy to forget.
- No server-side availability re-check is surfaced to the customer.

**TARGET** — Wording shifts to «إرسال الطلب» / «طلب حجز». Success screen states
the three-step reality: request received → admin calls to confirm → deposit
approved. Deposit amount is treated as *indicative*; admin confirms the actual
amount at review time.

**FILES** — `src/components/NewBookingWizardV2.tsx`,
`supabase/functions/create-public-booking/index.ts`.

**BACKEND IMPACT** — None required; `create_booking` contract unchanged.

---

## 2. ADMIN REVIEW (request inbox)

**CURRENT** — New requests surface in `BookingsList`, `Dashboard`, `Calendar`
with the label «بانتظار مراجعة الدفع». `BookingDetail` renders *payment review*
actions (اعتماد / رفض الدفع) and a deposit-amount editor.

**PROBLEM**
- The admin console frames the job as *"review a payment"*, but the real job is
  *"review a customer request"*: call the customer, agree equipment, quantity,
  dates and price, and only then accept.
- `BookingDetail` shows accept/reject for the deposit **immediately**, so it is
  possible to accept a booking before the call ever happened.
- There is no single, consistent action bar: permissions are scattered ad-hoc
  ternaries (`pendingReview`, `canHandOver`, `canStartReturn`, `canComplete`)
  with no shared definition, and `canTrash = true` hard-codes "delete always
  allowed" for every status.

**TARGET** — The review step becomes explicit: **طلب جديد** banner + actions
`قبول الطلب`, `تعديل الطلب`, `رفض وحذف الطلب` (and `رفض الدفع` retained as the
lower-level payment action). All permission decisions come from one module.

**FILES** — `src/admin/BookingDetail.tsx`, `src/admin/BookingsList.tsx`.

**BACKEND IMPACT** — Accept reuses `verify-payment` (APPROVE). Reject-and-delete
needs a new atomic `reject_and_delete` path (see §4).
## 3. ACCEPT (request → confirmed booking)

**CURRENT** — `verify-payment` with `action = APPROVE` marks the DEPOSIT payment
`VERIFIED`, sets `deposit_paid = deposit_required`,
`payment_status = VERIFIED`, `confirmed_at = now()`, and moves the booking to
`CONFIRMED`.

**PROBLEM**
- Accepting is only reachable through a button labelled «اعتماد الدفع», which
  hides the fact that it also **confirms the rental** (and therefore reserves
  inventory for the rental window).
- Nothing forces the admin to have reconciled `deposit_required` with the
  receipt first (`set_deposit_amount` is optional).
- Double-accept is only guarded by the status check inside the function.

**TARGET** — `قبول الطلب` performs, in order: reconcile deposit amount → verify
deposit → `CONFIRMED`. Guarded by the shared permission map so it only renders
for `PENDING_PAYMENT_REVIEW`. Atomic from the admin's point of view.

**FILES** — `src/admin/BookingDetail.tsx`, `supabase/functions/verify-payment`.

**BACKEND IMPACT** — Keep `verify-payment` as the primitive; accept also
reconciles the deposit amount so the two steps cannot diverge.

---

## 4. REJECT (request → removed)

**CURRENT** — Two unrelated mechanisms:
1. `verify-payment` + `REJECT` → payment `REJECTED`, booking `PAYMENT_REJECTED`.
   The booking **stays in the list forever** with a rejected payment.
2. `soft_delete_booking` → `deleted_at` set, booking disappears into the trash
   and must be purged separately with `permanently_delete_booking`.

**PROBLEM**
- A rejected request is dead work: leaving it in the active list pollutes
  `BookingsList`, `Dashboard` counters and `Calendar`.
- The admin must know to perform *two* actions (reject payment, then delete) and
  in the right order; there is no single correct path.
- `permanently_delete_booking` returns the receipt path so the caller may remove
  the storage object — this pairing is duplicated in `TrashList` and
  `BookingDetail`, and a failure between RPC and storage leaves orphan files
  (`cleanup-orphan-receipts` is only a 48h sweep of `pending/`).

**TARGET** — One action: `رفض وحذف الطلب` (`reject_and_delete_booking`). It
## 5. EDIT (admin amends the request/booking)

**CURRENT** — Admin can only:
- change `notes` (direct table `UPDATE` from `BookingDetail`),
- change the deposit amount via
  `set_deposit_amount(p_booking_id, p_payment_id, p_amount)`.

Everything else (customer name/phone, dates, items, quantities, unit prices) is
**not editable** after the customer submits. A mistake means delete + ask the
customer to re-book.

**PROBLEM**
- No way to honour the phone call: the whole point of the review step is to
  adjust quantity/dates/price after talking to the customer.
- Direct `UPDATE` on `bookings` from the client relies on RLS alone and bypasses
  any recomputation of `subtotal` / `deposit_required` / `remaining_amount`.
- Editing near an active rental can silently change reserved inventory.

**TARGET** — `تعديل الطلب` opens an edit form covering name, phone, dates,
notes, and per-item quantity/unit price. Server side, one RPC
`update_booking_details` recomputes `subtotal`, `deposit_required`,
`remaining_amount` and re-validates availability, refusing the edit when
equipment is already `EQUIPMENT_OUT`.

**FILES** — `src/admin/BookingDetail.tsx` (new edit modal), new RPC
`update_booking_details`.

## 6. PAYMENT (deposit + balance)

**CURRENT**
- Deposit: approved at accept time (§3).
- Balance: `record-balance-payment` accepts partial amounts (`20240212`),
  appends a `BALANCE` payment, decrements `remaining_amount`, and flips to
  `READY_FOR_PICKUP` when it reaches 0.

**PROBLEM**
- `BookingDetail` renders **two** balance UIs: the inline `recordBalance()` form
  *and* an `invokeEdge("record-balance-payment")` action button that calls the
  same function with no amount — the second is a no-op that only produces a
  generic «تمت العملية بنجاح».
- Partial balances are allowed, but the status only advances at 0, so a
  partially paid booking sits in `CONFIRMED` with no visual hint of how much is
  outstanding beyond the raw number.
- `remaining_amount` can go negative if the deposit is edited upward after a
  balance was already recorded (`set_deposit_amount` does not clamp).

**TARGET** — One balance control, no duplicate button. Show paid vs remaining
explicitly, block over-payment, and clamp `remaining_amount ≥ 0` whenever the
deposit or subtotal changes.

**FILES** — `src/admin/BookingDetail.tsx`,
`supabase/functions/record-balance-payment`, `set_deposit_amount`.

**BACKEND IMPACT** — Clamp inside `set_deposit_amount` /
`update_booking_details`.

---

## 7. HANDOVER (equipment goes out)

**CURRENT** — `hand-over-equipment` requires `status = READY_FOR_PICKUP` **and**
`remaining_amount = 0`, then sets `EQUIPMENT_OUT` and `equipment_out_at`, and
moves inventory out.

**PROBLEM**
- In practice customers collect equipment while still owing part of the balance
  (the UI describes the balance as *"دفعة الرصيد النقدية عند أخذ المعدات"* — the
  cash taken **at handover**), yet the function hard-blocks handover until the
  balance is fully paid. UI and backend contradict each other.
- There is no override/acknowledgement path (e.g. "hand over with outstanding
  balance").

**TARGET** — Handover is the physical event and must not be blocked by
accounting: it is allowed with an outstanding balance, records the outstanding
amount at handover, and logs a warning. The remaining amount stays tracked for
collection at return.

**FILES** — `src/admin/BookingDetail.tsx`,
## 8. RETURN (start of the return session)

**CURRENT** — `start_equipment_return(p_booking_id)` creates an
`equipment_returns` row and moves `EQUIPMENT_OUT` → `RETURN_PENDING`.
`ReturnsDetail` auto-starts a session if one does not exist (commit `9041e95`).

**PROBLEM**
- Two entry points create the session (BookingDetail «بدء الإرجاع» and
  ReturnsDetail auto-start) with subtly different guards.
- The auto-start path means merely opening a page mutates state.

**TARGET** — One owner: the return session is created when the admin opens the
return flow for an `EQUIPMENT_OUT` booking, and both pages delegate to the same
guarded helper (`startReturn`) rather than reimplementing the check.

**FILES** — `src/admin/ReturnsDetail.tsx`, `src/admin/BookingDetail.tsx`.

**BACKEND IMPACT** — None; `start_equipment_return` unchanged.

---

## 9. EARLY RETURN

**CURRENT** — Checks are by *status*, not by date. `ReturnsDetail` can start a
return at any time (commit `9041e95`). `expected_return_at` is displayed but
never enforced.

**PROBLEM**
- No distinction between "returned on time", "returned early" and "returned
  late"; the business wants early return to be allowed and *visible*.
- Nothing records *when* vs *when expected*, so no early/late badge is possible.

**TARGET** — Early return is explicitly allowed at any moment. The return
summary shows `actual − expected` as «إرجاع مبكر» / «في الوقت» / «إرجاع متأخر».
No extra approval is needed for early return.

**FILES** — `src/admin/ReturnsList.tsx`, `src/admin/ReturnsDetail.tsx`.

**BACKEND IMPACT** — Derive from `equipment_returns.started_at` vs
`bookings.expected_return_at`; no schema change required.

---

## 10. PARTIAL RETURN

**CURRENT** — `upsert_return_item(p_return_item_id, p_returned_good_quantity,
p_damaged_quantity, p_missing_quantity, p_remaining_out_quantity)`;
`maybe_complete_return` finalises. Covered by
`src/__tests__/integration/return_flow.integration.test.ts` (3 of 4, then 4 of 4).

**PROBLEM**
- `remaining_out_quantity` is **supplied by the client** instead of being
  derived from `quantity − returned_good − damaged − missing`; a bad client can
  desynchronise the session.
- The booking stays `RETURN_PENDING` while partially returned, so
  `EquipmentOutside` (which lists outside equipment) is the only place that
  reflects the real position.

**TARGET** — `remaining_out_quantity` is always computed server-side; the
partial-return position is surfaced on the booking and in `EquipmentOutside`.

**FILES** — `supabase/migrations` (`upsert_return_item`),
`src/admin/ReturnsDetail.tsx`.

**BACKEND IMPACT** — Recompute inside `upsert_return_item`; ignore the client
value.

---

## 11. DAMAGE

**CURRENT** — `return_items.damaged_quantity` is recorded. There is **no**
monetary consequence: no charge line, no change to `subtotal` or
`remaining_amount`.

**PROBLEM**
- Damage is captured but never billed; the admin must remember it out-of-band.
- No refund/damage interaction rules exist.

## 12. MISSING

**CURRENT** — `return_items.missing_quantity` plus
`get_unresolved_missing_count` (used by `cleanup-completed-bookings`).
Missing items block anonymisation/completion cleanup.

**PROBLEM**
- `BookingDetail`'s `canComplete` only requires `RETURN_PENDING` and
  `remaining_amount = 0`; it does **not** check unresolved missing items, so a
  booking with missing equipment can be moved to `COMPLETED` and then never
  cleaned up.
- No charge/refund path for missing items.

**TARGET** — Completion requires: nothing outside **and** no unresolved missing
**and** no outstanding balance. Missing items are billed through the same
`adjust_booking_price` primitive.

**FILES** — `src/admin/BookingDetail.tsx`, `src/admin/ReturnsDetail.tsx`.

**BACKEND IMPACT** — Extend `complete-booking` precondition with
`get_unresolved_missing_count` / `get_equipment_outside_quantity`.

---

## 13. PRICE ADJUSTMENT

**CURRENT** — Only `set_deposit_amount` exists (pre-acceptance). No way to add
a damage/missing/late charge or a goodwill discount after handover.

**PROBLEM** — All post-handover money movement is invisible to the system.

**TARGET** — One auditable primitive
`adjust_booking_price(p_booking_id, p_delta_amount, p_reason)`: appends an
`EXTRA` charge line, updates `remaining_amount`, clamps at ≥ 0, and writes an
`audit_logs` entry.

**FILES** — new RPC + migration, `src/admin/BookingDetail.tsx`,
`src/admin/ReturnsDetail.tsx`.

**BACKEND IMPACT** — New migration; must write `audit_logs` like the other
financial RPCs do.

---

## 14. REFUND

**CURRENT** — **Does not exist.** A refund (e.g. deposit returned because
damage/missing was less than the deposit, or early return of unused days) can
only be represented by editing numbers by hand.

**PROBLEM** — No refund record, no audit trail, no way to know what was
actually refunded.

**TARGET** — `record_refund(p_booking_id, p_amount, p_method, p_note)`: inserts
a negative-amount `REFUND` payment row, reduces the refundable balance, clamps
at ≥ 0, writes `audit_logs`. Bookings with an over-payment must be refundable
before completion.

**FILES** — new RPC + migration, `src/admin/BookingDetail.tsx`.

**BACKEND IMPACT** — New migration; payment `type` must also accept `REFUND`
(verify the `payments.type` check constraint allows it).

---

## 15. COMPLETION

**CURRENT** — `complete-booking` is invoked from `BookingDetail` when
`status = RETURN_PENDING && remaining_amount = 0`. It sets `COMPLETED`,
`completed_at`, and computes `scheduled_delete_at` for the retention sweep.

**PROBLEM**
- Precondition is too weak (§12: missing items and outside equipment are not
  checked at the moment of completion, only later by the cleanup job).
- `remaining_amount = 0` blocks completion of a booking where the admin granted
  an unrecorded discount, which pushes admins to edit the database directly.

**TARGET** — Completion is only offered when: no equipment outside, no
unresolved missing items, and no outstanding balance (after any price
adjustments and refunds). Otherwise the button is hidden and the blocking reason
is displayed.

**FILES** — `src/admin/BookingDetail.tsx`,
`supabase/functions/complete-booking`.

**BACKEND IMPACT** — Strengthen preconditions; return a machine-readable reason
so the UI can explain the block.

## 16. Cross-cutting problems

| # | Problem | Target |
| --- | --- | --- |
| C1 | Status labels duplicated verbatim in 5 files (`BookingDetail`, `BookingsList`, `Calendar`, `EquipmentOutside`, `TrashList`) — always drifting | one `src/domain/bookingWorkflow.ts` |
| C2 | Action permissions hard-coded as ad-hoc booleans per page | one `getAllowedActions(status, flags)` |
| C3 | `canTrash = true` for every status, including active rentals | permission derived from status + inventory exposure |
| C4 | Two balance-recording UIs that disagree | one control |
| C5 | «اعتماد الدفع» doubles as "accept request" with no wording for the request review | explicit accept/reject/edit actions |
| C6 | Rejected requests linger in active lists | reject-and-delete is the single path |
| C7 | No post-handover money movement (damage/missing/discount/refund) | `adjust_booking_price` + `record_refund` |
| C8 | Client-supplied `remaining_out_quantity` | server-derived |
| C9 | Completion ignores missing/outside equipment | enforced precondition |

---

## 17. Execution order

| Phase | Deliverable | Verified by |
| --- | --- | --- |
| A | `src/domain/bookingWorkflow.ts` + unit tests + all admin pages consume it | `npm test`, `npm run build` |
| B | Migrations: `reject_and_delete_booking`, `update_booking_details`, `adjust_booking_price`, `record_refund`, `upsert_return_item` hardening, clamp in `set_deposit_amount` | `supabase db push` (staging) |
| C | `BookingDetail`: request-review action bar (accept / edit / reject-and-delete) | build + manual |
| D | `BookingDetail` + list/dashboard/calendar/trash consume the domain map | build |
| E | Handover rules aligned (UI ↔ `hand-over-equipment`) | build + manual |
| F | Return + early-return + partial-return surfaces | build + integration |
| G | Price adjustment + refund UI | build |
| H | Public booking wording consistency («إرسال الطلب») | build |
| I | UI cleanup: remove duplicate balance button, dead code, unused imports | build + `npm test` |

**Gate:** `npm test`, `npm run test:integration`, `npm run build` must pass at the
end of every phase.

**TARGET** — Recording damage offers an explicit, admin-approved charge that
increases `remaining_amount` (or is deducted from the deposit, admin's choice).

**FILES** — `src/admin/ReturnsDetail.tsx`, new price-adjustment path.

**BACKEND IMPACT** — New `adjust_booking_price` RPC (see §13) covering damage,
missing and discounts in one auditable primitive.

`supabase/functions/hand-over-equipment`.

**BACKEND IMPACT** — Relax the `remaining_amount = 0` precondition (still
guarded by admin authorisation from `_shared/adminAuth.ts`) and record the
outstanding balance.

**BACKEND IMPACT** — New migration; must reuse the same availability check as
`create_booking` (migration `20240201`) so an edit cannot over-book.

rejects the deposit payment, records a rejection reason, soft-deletes the
booking (recoverable for a retention window) and returns the receipt path for
storage cleanup — served by a single atomic call so ordering can never be wrong.

**FILES** — `src/admin/BookingDetail.tsx`, new RPC
`reject_and_delete_booking`, `src/admin/TrashList.tsx`.

**BACKEND IMPACT** — New migration adding `reject_and_delete_booking`
(transactional: payment → booking → soft delete).
