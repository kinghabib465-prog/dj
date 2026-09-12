-- 20240215_auto_complete_return.sql
-- Business rule change: completing the return returns the equipment to stock
-- immediately. A fully settled return session now closes the booking as well,
-- so no separate "إكمال الحجز" step is needed for the equipment to be back.
-- Money stays independent: any outstanding balance can still be collected
-- from the booking page while the equipment is out or after completion.

-- ---------------------------------------------------------------------------
-- 1) maybe_complete_return: settle the booking together with the session
-- ---------------------------------------------------------------------------
create or replace function public.maybe_complete_return(p_booking_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return_id uuid;
  v_completed timestamptz;
  v_out_qty int;
  v_missing_qty int;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  select id, completed_at into v_return_id, v_completed
  from equipment_returns where booking_id = p_booking_id;
  if not found then
    raise exception 'Return session not found' using errcode = 'P0005';
  end if;

  if v_completed is not null then
    return;
  end if;

  select coalesce(sum(remaining_out_quantity), 0) into v_out_qty
  from return_items where return_id = v_return_id;
  select coalesce(sum(missing_quantity), 0) into v_missing_qty
  from return_items where return_id = v_return_id;

  if v_out_qty = 0 and v_missing_qty = 0 then
    update equipment_returns set completed_at = now() where id = v_return_id;

    update bookings set status = 'COMPLETED'
    where id = p_booking_id and status = 'RETURN_PENDING';

    insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
    values (auth.uid(), 'RETURN_COMPLETE', 'booking', p_booking_id,
            jsonb_build_object('return_id', v_return_id, 'booking_auto_completed', true), now());
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) record_balance_payment: collectable at return time and after completion
--    (never regresses the booking status on partial payment)
-- ---------------------------------------------------------------------------
create or replace function public.record_balance_payment(
  p_booking_id uuid,
  p_admin_id uuid,
  p_amount integer default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_booking record;
  v_payment_id uuid;
  v_amount integer;
  v_remaining integer;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('CONFIRMED', 'READY_FOR_PICKUP', 'RETURN_PENDING', 'COMPLETED') then
    raise exception 'Booking not in a payable status' using errcode = 'P0002';
  end if;

  if v_booking.remaining_amount <= 0 then
    raise exception 'No remaining amount to pay' using errcode = 'P0003';
  end if;

  v_amount := coalesce(p_amount, v_booking.remaining_amount);
  if v_amount <= 0 or v_amount > v_booking.remaining_amount then
    raise exception 'Invalid amount' using errcode = 'P0004';
  end if;

  insert into public.payments (booking_id, type, amount, method, status, verified_at, verified_by, created_at, updated_at)
  values (p_booking_id, 'BALANCE', v_amount, 'CASH', 'VERIFIED', now(), p_admin_id, now(), now())
  returning id into v_payment_id;

  v_remaining := v_booking.remaining_amount - v_amount;

  update public.bookings
  set remaining_amount = v_remaining,
      status = case
                 when v_booking.status = 'CONFIRMED' and v_remaining = 0
                   then 'READY_FOR_PICKUP'::booking_status
                 else v_booking.status
               end
  where id = p_booking_id;

  insert into public.audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (p_admin_id, 'BALANCE_PAYMENT_RECORDED', 'booking', p_booking_id,
          jsonb_build_object('payment_id', v_payment_id, 'amount', v_amount, 'remaining_after', v_remaining), now());

  return v_payment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) inventory truth: a completed return session means the units are back,
--    even if the booking still says RETURN_PENDING in old data.
-- ---------------------------------------------------------------------------
create or replace view public.inventory_status as
select
  e.id as equipment_id,
  e.name,
  e.total_quantity,
  coalesce(o.outside_qty, 0) as physical_outside_quantity,
  coalesce(d.damaged_qty, 0) as damaged_quantity,
  coalesce(m.missing_qty, 0) as missing_quantity,
  (e.total_quantity - coalesce(o.outside_qty,0) - coalesce(d.damaged_qty,0) - coalesce(m.missing_qty,0)) as rentable_quantity,
  (e.total_quantity - coalesce(o.outside_qty,0) - coalesce(m.missing_qty,0)) as physical_inside_quantity
from equipment e
left join (
  select
    bi.equipment_id,
    sum(bi.quantity) - coalesce(sum(ri.returned_good_quantity + ri.damaged_quantity),0) as outside_qty
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  left join return_items ri on ri.booking_item_id = bi.id
  where b.status in ('EQUIPMENT_OUT','RETURN_PENDING')
    and not exists (
      select 1 from equipment_returns er
      where er.booking_id = b.id and er.completed_at is not null
    )
  group by bi.equipment_id
) o on o.equipment_id = e.id
left join (
  select equipment_id, sum(damaged_quantity) as damaged_qty
  from return_items
  where damaged_quantity > 0
  group by equipment_id
) d on d.equipment_id = e.id
left join (
  select equipment_id, sum(missing_quantity) as missing_qty
  from return_items
  where missing_quantity > 0
  group by equipment_id
) m on m.equipment_id = e.id;

create or replace function public.get_equipment_outside_quantity(p_booking_id uuid)
returns integer language sql stable as $$
  select coalesce(
    sum(bi.quantity) - coalesce(sum(ri.returned_good_quantity + ri.damaged_quantity), 0), 0)
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  left join return_items ri on ri.booking_item_id = bi.id
  where bi.booking_id = p_booking_id
    and b.status in ('EQUIPMENT_OUT', 'RETURN_PENDING')
    and not exists (
      select 1 from equipment_returns er
      where er.booking_id = p_booking_id and er.completed_at is not null
    );
$$;

create or replace function public.get_equipment_outside_assignments()
returns table (
  booking_id uuid,
  booking_number text,
  customer_name text,
  customer_phone text,
  equipment_id uuid,
  equipment_name text,
  quantity_out integer,
  rental_start_at timestamptz,
  expected_return_at timestamptz,
  status booking_status
) language sql stable as $$
  select
    b.id as booking_id,
    b.booking_number,
    b.customer_name,
    b.customer_phone,
    e.id as equipment_id,
    e.name as equipment_name,
    (bi.quantity - coalesce(ri.returned_good_quantity + ri.damaged_quantity, 0))::int as quantity_out,
    b.rental_start_at,
    b.expected_return_at,
    b.status
  from bookings b
  join booking_items bi on bi.booking_id = b.id
  join equipment e on e.id = bi.equipment_id
  left join return_items ri on ri.booking_item_id = bi.id
  where b.status in ('EQUIPMENT_OUT', 'RETURN_PENDING')
    and (bi.quantity - coalesce(ri.returned_good_quantity + ri.damaged_quantity, 0)) > 0
    and not exists (
      select 1 from equipment_returns er
      where er.booking_id = b.id and er.completed_at is not null
    );
$$;

