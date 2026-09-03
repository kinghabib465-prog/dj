-- 20240107_create_booking_function.sql

create or replace function create_booking(payload jsonb)
returns table (booking_number text, status booking_status) language plpgsql as $$
declare
  v_customer_name text;
  v_customer_phone text;
  v_rental_start_at timestamptz;
  v_expected_return_at timestamptz;
  v_event_location text;
  v_event_map_url text;
  v_notes text;
  v_receipt_path text;
  v_booking_id uuid;
  v_subtotal integer := 0;
  v_deposit_required integer := 0;
  v_item jsonb;
  v_equipment_id uuid;
  v_qty integer;
  v_unit_price integer;
  v_deposit_price integer;
  v_available integer;
begin
  -- Extract fields
  v_customer_name := payload->>'customerName';
  v_customer_phone := payload->>'customerPhone';
  v_rental_start_at := (payload->>'rentalStartAt')::timestamptz;
  v_expected_return_at := (payload->>'expectedReturnAt')::timestamptz;
  v_event_location := payload->>'eventLocation';
  v_event_map_url := payload->>'eventMapUrl';
  v_notes := payload->>'notes';
  v_receipt_path := payload->>'receiptObjectPath';

  -- Basic validation
  if v_customer_name is null or v_customer_phone is null or v_rental_start_at is null or v_expected_return_at is null or v_receipt_path is null then
    raise exception 'INVALID_REQUEST' using errcode = 'P0001';
  end if;
  if v_rental_start_at >= v_expected_return_at then
    raise exception 'INVALID_RENTAL_PERIOD' using errcode = 'P0002';
  end if;

  -- Insert booking row (booking_number will be set by trigger)
  insert into bookings (customer_name, customer_phone, rental_start_at, expected_return_at, event_location, event_map_url, notes, status, payment_status, subtotal, deposit_required, deposit_paid, remaining_amount, receipt_path, created_at, updated_at)
  values (v_customer_name, v_customer_phone, v_rental_start_at, v_expected_return_at, v_event_location, v_event_map_url, v_notes, 'PENDING_PAYMENT_REVIEW'::booking_status, 'PENDING'::payment_status, 0, 0, 0, 0, v_receipt_path, now(), now())
  returning id into v_booking_id;

  -- Process each item
  foreach v_item in array (select jsonb_array_elements(payload->'items')) loop
    v_equipment_id := (v_item->>'equipmentId')::uuid;
    v_qty := (v_item->>'quantity')::int;

    -- Lock equipment row
    perform 1 from equipment where id = v_equipment_id for update;

    -- Get price snapshot
    select rental_price, deposit_price into v_unit_price, v_deposit_price from equipment where id = v_equipment_id;

    -- Calculate totals
    v_subtotal := v_subtotal + v_qty * v_unit_price;
    v_deposit_required := v_deposit_required + v_qty * v_deposit_price;

    -- Check availability
    select available_quantity into v_available from get_equipment_availability(v_equipment_id, v_rental_start_at, v_expected_return_at);
    if v_available < v_qty then
      raise exception 'INSUFFICIENT_AVAILABILITY' using errcode = 'P0003';
    end if;

    -- Insert booking item
    insert into booking_items (booking_id, equipment_id, quantity, unit_price, deposit_amount, created_at, updated_at)
    values (v_booking_id, v_equipment_id, v_qty, v_unit_price, v_deposit_price, now(), now());
  end loop;

  -- Update booking totals
  update bookings set subtotal = v_subtotal, deposit_required = v_deposit_required, remaining_amount = v_subtotal - v_deposit_required where id = v_booking_id;

  -- Insert payment record
  insert into payments (booking_id, type, amount, method, receipt_path, status, created_at, updated_at)
  values (v_booking_id, 'DEPOSIT'::payment_type, v_deposit_required, 'TRANSFER'::payment_method, v_receipt_path, 'PENDING'::payment_status, now(), now());

  -- Return booking number and status
  return query select booking_number, status from bookings where id = v_booking_id;
end;
$$;
