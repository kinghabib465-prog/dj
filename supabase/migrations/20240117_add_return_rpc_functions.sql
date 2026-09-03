-- 20240117_add_return_rpc_functions.sql

-- RPC: start_equipment_return
create or replace function start_equipment_return(p_booking_id uuid) returns void language plpgsql as $$
declare
  v_booking record;
  v_return_id uuid;
begin
  -- lock booking row
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if v_booking.status <> 'EQUIPMENT_OUT' then
    raise exception 'Booking not in EQUIPMENT_OUT status';
  end if;
  -- check if a return session already exists
  select id into v_return_id from equipment_returns where booking_id = p_booking_id;
  if v_return_id is null then
    insert into equipment_returns (booking_id, started_at, processed_by)
    values (p_booking_id, now(), auth.uid())
    returning id into v_return_id;
  end if;
  -- create return items for each booking item if not already present
  insert into return_items (return_id, booking_item_id, equipment_id, expected_quantity, returned_good_quantity, damaged_quantity, missing_quantity, remaining_out_quantity, created_at, updated_at)
  select v_return_id, bi.id, bi.equipment_id, bi.quantity, 0, 0, 0, bi.quantity, now(), now()
  from booking_items bi
  where bi.booking_id = p_booking_id
    and not exists (select 1 from return_items ri where ri.booking_item_id = bi.id);
  -- transition booking status to RETURN_PENDING
  update bookings set status = 'RETURN_PENDING' where id = p_booking_id;
  -- audit log
  insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  values (auth.uid(), 'START_EQUIPMENT_RETURN', 'booking', p_booking_id, jsonb_build_object('return_id', v_return_id), now());
end;
$$;


-- RPC: upsert_return_item
create or replace function upsert_return_item(
  p_return_item_id uuid,
  p_returned_good_quantity int,
  p_damaged_quantity int,
  p_missing_quantity int,
  p_remaining_out_quantity int
) returns void language plpgsql as $$
declare
  v_item record;
  v_expected int;
  v_accounted int;
begin
  select * into v_item from return_items where id = p_return_item_id for update;
  if not found then
    raise exception 'Return item not found';
  end if;
  v_expected := v_item.expected_quantity;
  v_accounted := p_returned_good_quantity + p_damaged_quantity + p_missing_quantity;
  if v_accounted > v_expected then
    raise exception 'Accounted quantity exceeds expected';
  end if;
  if p_remaining_out_quantity < 0 then
    raise exception 'Remaining out quantity cannot be negative';
  end if;
  if v_accounted + p_remaining_out_quantity <> v_expected then
    raise exception 'Inconsistent quantities';
  end if;
  update return_items set
    returned_good_quantity = p_returned_good_quantity,
    damaged_quantity = p_damaged_quantity,
    missing_quantity = p_missing_quantity,
    remaining_out_quantity = p_remaining_out_quantity,
    updated_at = now()
  where id = p_return_item_id;
  -- inventory adjustment for damaged items
  if p_damaged_quantity > 0 then
    insert into inventory_adjustments (
      equipment_id, type, quantity, booking_id, admin_id, reason, created_at)
    values (
      v_item.equipment_id,
      'DAMAGE_MARK',
      p_damaged_quantity,
      (select booking_id from equipment_returns where id = v_item.return_id),
      auth.uid(),
      'Damaged on return',
      now()
    );
  end if;
end;
$$;


-- RPC: maybe_complete_return
create or replace function maybe_complete_return(p_booking_id uuid) returns void language plpgsql as $$
declare
  v_return_id uuid;
  v_out_qty int;
  v_missing_qty int;
begin
  select id into v_return_id from equipment_returns where booking_id = p_booking_id;
  if not found then
    raise exception 'Return session not found';
  end if;
  select coalesce(sum(remaining_out_quantity),0) into v_out_qty from return_items where return_id = v_return_id;
  select coalesce(sum(missing_quantity),0) into v_missing_qty from return_items where return_id = v_return_id;
  if v_out_qty = 0 and v_missing_qty = 0 then
    update equipment_returns set completed_at = now() where id = v_return_id;
    insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
    values (auth.uid(), 'RETURN_COMPLETE', 'booking', p_booking_id, jsonb_build_object('return_id', v_return_id), now());
  end if;
end;
$$;

-- RPC: get_bookings_in_range
create or replace function get_bookings_in_range(p_start date, p_end date) returns table (
  id uuid,
  booking_number text,
  customer_name text,
  customer_phone text,
  expected_return_at timestamptz,
  status booking_status
) language sql stable as $$
  select
    b.id,
    b.booking_number,
    b.customer_name,
    b.customer_phone,
    b.expected_return_at,
    b.status
  from bookings b
  where b.rental_start_at::date <= p_end
    and b.expected_return_at::date >= p_start;
$$;



