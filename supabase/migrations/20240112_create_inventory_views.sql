-- 20240112_create_inventory_views.sql

-- View for inventory status (total, inside, outside)
create or replace view inventory_status as
select
  e.id as equipment_id,
  e.name,
  e.total_quantity,
  (e.total_quantity - coalesce(oq.outside_quantity, 0)) as inside_quantity,
  coalesce(oq.outside_quantity, 0) as outside_quantity
from equipment e
left join (
  select
    bi.equipment_id,
    sum(bi.quantity) - coalesce(sum(ri.returned_good_quantity + ri.damaged_quantity), 0) as outside_quantity
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  left join return_items ri on ri.booking_item_id = bi.id
  where b.status in ('EQUIPMENT_OUT', 'RETURN_PENDING')
  group by bi.equipment_id
) oq on oq.equipment_id = e.id;

-- Function to get total outside quantity for a specific booking
create or replace function get_equipment_outside_quantity(p_booking_id uuid)
returns integer language sql stable as $$
  select
    sum(bi.quantity) - coalesce(sum(ri.returned_good_quantity + ri.damaged_quantity), 0)
  from booking_items bi
  left join return_items ri on ri.booking_item_id = bi.id
  where bi.booking_id = p_booking_id
  and (select status from bookings where id = p_booking_id) in ('EQUIPMENT_OUT', 'RETURN_PENDING');
$$;

-- Function to get unresolved missing count for a booking
create or replace function get_unresolved_missing_count(p_booking_id uuid)
returns integer language sql stable as $$
  select
    sum(ri.missing_quantity)
  from booking_items bi
  join return_items ri on ri.booking_item_id = bi.id
  where bi.booking_id = p_booking_id
    and ri.missing_quantity > 0;
$$;

-- Function to get equipment outside assignments (for admin UI)
create or replace function get_equipment_outside_assignments()
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
    (bi.quantity - coalesce(ri.returned_good_quantity + ri.damaged_quantity, 0)) as quantity_out,
    b.rental_start_at,
    b.expected_return_at,
    b.status
  from bookings b
  join booking_items bi on bi.booking_id = b.id
  join equipment e on e.id = bi.equipment_id
  left join return_items ri on ri.booking_item_id = bi.id
  where b.status in ('EQUIPMENT_OUT', 'RETURN_PENDING')
    and (bi.quantity - coalesce(ri.returned_good_quantity + ri.damaged_quantity, 0)) > 0;
$$;
