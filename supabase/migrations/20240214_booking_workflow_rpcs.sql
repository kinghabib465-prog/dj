-- 20240214_booking_workflow_rpcs.sql
-- Booking workflow primitives: reject-and-delete, edit details, price adjustment,
-- refund, server-derived remaining_out_quantity, deposit clamping.

-- ---------------------------------------------------------------------------
-- 0) payments: allow REFUND rows and refund bookkeeping columns
-- ---------------------------------------------------------------------------
alter type payment_type add value if not exists 'REFUND';

alter table public.payments
  add column if not exists note text;

-- ---------------------------------------------------------------------------
-- 1) upsert_return_item: derive remaining_out_quantity on the server
--    The client value is still accepted for backward compatibility but is
--    ignored, so the UI can never disagree with the constraint.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_return_item(
  p_return_item_id uuid,
  p_returned_good_quantity int,
  p_damaged_quantity int,
  p_missing_quantity int,
  p_remaining_out_quantity int default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_expected int;
  v_accounted int;
  v_remaining int;
  v_booking_id uuid;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  select * into v_item from return_items where id = p_return_item_id for update;
  if not found then
    raise exception 'RETURN_ITEM_NOT_FOUND' using errcode = 'P0005';
  end if;

  if coalesce(p_returned_good_quantity, 0) < 0
     or coalesce(p_damaged_quantity, 0) < 0
     or coalesce(p_missing_quantity, 0) < 0 then
    raise exception 'NEGATIVE_QUANTITY' using errcode = 'P0004';
  end if;

  v_expected := v_item.expected_quantity;
  v_accounted := coalesce(p_returned_good_quantity, 0)
               + coalesce(p_damaged_quantity, 0)
               + coalesce(p_missing_quantity, 0);

  if v_accounted > v_expected then
    raise exception 'ACCOUNTED_EXCEEDS_EXPECTED' using errcode = 'P0006';
  end if;

  -- Server-derived truth: whatever is not returned/damaged/missing is still out.
  v_remaining := greatest(0, v_expected - v_accounted);

  update return_items set
    returned_good_quantity = coalesce(p_returned_good_quantity, 0),
    damaged_quantity = coalesce(p_damaged_quantity, 0),
    missing_quantity = coalesce(p_missing_quantity, 0),
    remaining_out_quantity = v_remaining,
    updated_at = now()
  where id = p_return_item_id;

  select booking_id into v_booking_id
  from equipment_returns where id = v_item.return_id;

  if coalesce(p_damaged_quantity, 0) > 0 then
    insert into inventory_adjustments (
      equipment_id, type, quantity, booking_id, admin_id, reason, created_at)
    values (
      v_item.equipment_id, 'DAMAGE_MARK', p_damaged_quantity, v_booking_id,
      auth.uid(), 'Damaged on return', now()
    );
  end if;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'RETURN_ITEM_UPDATED', 'booking', v_booking_id,
          jsonb_build_object(
            'return_item_id', p_return_item_id,
            'returned_good', coalesce(p_returned_good_quantity, 0),
            'damaged', coalesce(p_damaged_quantity, 0),
            'missing', coalesce(p_missing_quantity, 0),
            'remaining_out', v_remaining
          ), now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) set_deposit_amount: clamp remaining_amount and never go negative
-- ---------------------------------------------------------------------------
create or replace function public.set_deposit_amount(
  p_booking_id uuid,
  p_payment_id uuid,
  p_amount integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status booking_status;
  v_subtotal integer;
  v_other_paid integer;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0004';
  end if;

  select status, subtotal into v_status, v_subtotal
  from bookings where id = p_booking_id;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;
  if v_status <> 'PENDING_PAYMENT_REVIEW' then
    raise exception 'INVALID_BOOKING_STATUS' using errcode = 'P0006';
  end if;

  update payments
  set amount = p_amount, updated_at = now()
  where id = p_payment_id and booking_id = p_booking_id and type = 'DEPOSIT';
  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0005';
  end if;

  -- Any other verified money already taken (e.g. a balance recorded early)
  -- must be subtracted too, so remaining_amount can never go negative.
  select coalesce(sum(amount), 0) into v_other_paid
  from payments
  where booking_id = p_booking_id
    and type in ('BALANCE', 'ADDITIONAL')
    and status = 'VERIFIED';

  update bookings
  set deposit_required = p_amount,
      remaining_amount = greatest(0, v_subtotal - p_amount - v_other_paid),
      updated_at = now()
  where id = p_booking_id;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'DEPOSIT_AMOUNT_SET', 'booking', p_booking_id,
          jsonb_build_object('amount', p_amount, 'other_paid', v_other_paid), now());
end;
$$;
-- ---------------------------------------------------------------------------
-- 3) reject_and_delete_booking: atomic rejection of a new request
--    Nothing was reserved or verified yet, so the request is removed outright
--    (no trash, no lingering PAYMENT_REJECTED rows). Returns the receipt path
--    so the caller can delete the uploaded file from storage.
-- ---------------------------------------------------------------------------
create or replace function public.reject_and_delete_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status booking_status;
  v_receipt_path text;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  select status, receipt_path into v_status, v_receipt_path
  from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;
  if v_status not in ('PENDING_PAYMENT_REVIEW', 'PAYMENT_REJECTED') then
    raise exception 'INVALID_BOOKING_STATUS' using errcode = 'P0006';
  end if;

  if v_receipt_path is null then
    select p.receipt_path into v_receipt_path
    from payments p
    where p.booking_id = p_booking_id and p.receipt_path is not null
    limit 1;
  end if;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'BOOKING_REQUEST_REJECTED', 'booking', p_booking_id,
          jsonb_build_object('reason', p_reason, 'previous_status', v_status), now());

  delete from return_items ri
  using equipment_returns er
  where ri.return_id = er.id and er.booking_id = p_booking_id;

  delete from equipment_returns where booking_id = p_booking_id;
  delete from inventory_adjustments where booking_id = p_booking_id;
  delete from payments where booking_id = p_booking_id;
  delete from booking_items where booking_id = p_booking_id;
  delete from bookings where id = p_booking_id;

  return coalesce(v_receipt_path, '');
end;
$$;
-- ---------------------------------------------------------------------------
-- 4) update_booking_details: amend a request or an un-handed-over booking
--    Customer identity, rental window, location and notes. Money is not
--    touched here (use set_deposit_amount / adjust_booking_price).
-- ---------------------------------------------------------------------------
create or replace function public.update_booking_details(
  p_booking_id uuid,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_rental_start_at timestamptz default null,
  p_expected_return_at timestamptz default null,
  p_event_location text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  -- Editable until the equipment physically leaves the warehouse.
  if v_booking.status not in ('PENDING_PAYMENT_REVIEW', 'PAYMENT_REJECTED', 'CONFIRMED', 'READY_FOR_PICKUP') then
    raise exception 'INVALID_BOOKING_STATUS' using errcode = 'P0006';
  end if;

  v_start := coalesce(p_rental_start_at, v_booking.rental_start_at);
  v_end := coalesce(p_expected_return_at, v_booking.expected_return_at);
  if v_start >= v_end then
    raise exception 'INVALID_RENTAL_PERIOD' using errcode = 'P0004';
  end if;

  update bookings set
    customer_name = coalesce(p_customer_name, customer_name),
    customer_phone = coalesce(p_customer_phone, customer_phone),
    rental_start_at = v_start,
    expected_return_at = v_end,
    event_location = coalesce(p_event_location, event_location),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_booking_id;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'BOOKING_DETAILS_UPDATED', 'booking', p_booking_id,
          jsonb_build_object(
            'rental_start_at', v_start,
            'expected_return_at', v_end
          ), now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) adjust_booking_price: post-handover money movement
--    p_delta_amount > 0 adds a charge (damage, missing, late fee);
--    p_delta_amount < 0 grants a discount. subtotal tracks the adjusted total.
-- ---------------------------------------------------------------------------
create or replace function public.adjust_booking_price(
  p_booking_id uuid,
  p_delta_amount integer,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_new_subtotal integer;
  v_new_remaining integer;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;
  if p_delta_amount is null or p_delta_amount = 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0004';
  end if;

  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  -- Only while the equipment is out or awaiting its return.
  if v_booking.status not in ('EQUIPMENT_OUT', 'RETURN_PENDING') then
    raise exception 'INVALID_BOOKING_STATUS' using errcode = 'P0006';
  end if;

  v_new_subtotal := greatest(0, v_booking.subtotal + p_delta_amount);

  -- A discount can never make the outstanding balance negative; an extra
  -- charge is added on top of whatever is still owed.
  v_new_remaining := greatest(0, v_booking.remaining_amount + (v_new_subtotal - v_booking.subtotal));

  update bookings set
    subtotal = v_new_subtotal,
    remaining_amount = v_new_remaining,
    updated_at = now()
  where id = p_booking_id;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'BOOKING_PRICE_ADJUSTED', 'booking', p_booking_id,
          jsonb_build_object(
            'delta', p_delta_amount,
            'reason', p_reason,
            'subtotal_after', v_new_subtotal,
            'remaining_after', v_new_remaining
          ), now());

  return v_new_remaining;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) record_refund: money returned to the customer
--    Inserts a REFUND payment row (positive amount, refund semantics) and
--    credits it against the outstanding balance. Never refunds more than the
--    amount actually collected.
-- ---------------------------------------------------------------------------
create or replace function public.record_refund(
  p_booking_id uuid,
  p_amount integer,
  p_method payment_method default 'CASH',
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_collected integer;
  v_already_refunded integer;
  v_refundable integer;
  v_payment_id uuid;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0004';
  end if;

  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  if v_booking.status not in ('EQUIPMENT_OUT', 'RETURN_PENDING', 'COMPLETED') then
    raise exception 'INVALID_BOOKING_STATUS' using errcode = 'P0006';
  end if;

  select coalesce(sum(amount), 0) into v_collected
  from payments
  where booking_id = p_booking_id
    and type in ('DEPOSIT', 'BALANCE', 'ADDITIONAL')
    and status = 'VERIFIED';

  select coalesce(sum(amount), 0) into v_already_refunded
  from payments
  where booking_id = p_booking_id
    and type = 'REFUND';

  v_refundable := greatest(0, v_collected - v_already_refunded);
  if p_amount > v_refundable then
    raise exception 'REFUND_EXCEEDS_COLLECTED' using errcode = 'P0007';
  end if;

  insert into payments (
    booking_id, type, amount, method, status, verified_at, verified_by,
    note, created_at, updated_at)
  values (
    p_booking_id, 'REFUND', p_amount, p_method, 'VERIFIED', now(), auth.uid(),
    p_note, now(), now())
  returning id into v_payment_id;

  update bookings
  set remaining_amount = greatest(0, remaining_amount - p_amount),
      updated_at = now()
  where id = p_booking_id;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'BOOKING_REFUND_RECORDED', 'booking', p_booking_id,
          jsonb_build_object(
            'payment_id', v_payment_id,
            'amount', p_amount,
            'method', p_method,
            'note', p_note,
            'refundable_before', v_refundable
          ), now());

  return v_payment_id;
end;
$$;


