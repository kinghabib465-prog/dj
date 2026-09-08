-- 20240210_add_booking_trash.sql
-- Add soft-delete (trash) support for bookings

-- 1) Add deleted_at column to bookings
alter table public.bookings
  add column if not exists deleted_at timestamp with time zone;

create index if not exists idx_bookings_deleted_at on public.bookings(deleted_at);

-- 2) Soft delete: move booking to trash (admin only)
create or replace function soft_delete_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  update bookings
  set deleted_at = now()
  where id = p_booking_id and deleted_at is null;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'BOOKING_MOVED_TO_TRASH', 'booking', p_booking_id, jsonb_build_object('deleted_at', now()), now());
end;
$$;

-- 3) Restore booking from trash (admin only)
create or replace function restore_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  update bookings
  set deleted_at = null
  where id = p_booking_id and deleted_at is not null;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'BOOKING_RESTORED_FROM_TRASH', 'booking', p_booking_id, jsonb_build_object(), now());
end;
$$;

-- 4) Permanent delete: remove booking + related rows + receipt (admin only)
-- Returns the receipt object path so the caller can remove the storage file.
create or replace function permanently_delete_booking(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_path text;
begin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  -- Grab receipt path before deleting (from booking or its payments)
  select b.receipt_path into v_receipt_path
  from bookings b
  where b.id = p_booking_id;

  if v_receipt_path is null then
    select p.receipt_path into v_receipt_path
    from payments p
    where p.booking_id = p_booking_id and p.receipt_path is not null
    limit 1;
  end if;

  -- Delete related rows (FK cascade handles booking_items & payments)
  delete from return_items ri
  using equipment_returns er
  where ri.return_id = er.id and er.booking_id = p_booking_id;

  delete from equipment_returns where booking_id = p_booking_id;
  delete from inventory_adjustments where booking_id = p_booking_id;
  delete from audit_logs where entity = 'booking' and entity_id = p_booking_id;
  delete from payments where booking_id = p_booking_id;
  delete from booking_items where booking_id = p_booking_id;
  delete from bookings where id = p_booking_id;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  return coalesce(v_receipt_path, '');
end;
$$;

-- 5) Helper to list trash items (admin only)
create or replace function get_trashed_bookings()
returns table (
  id uuid,
  booking_number text,
  customer_name text,
  customer_phone text,
  status booking_status,
  deleted_at timestamp with time zone,
  completed_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select b.id, b.booking_number, b.customer_name, b.customer_phone, b.status, b.deleted_at, b.completed_at
  from bookings b
  where b.deleted_at is not null
  order by b.deleted_at desc;
$$;