-- 20240116_add_get_return_items_for_booking.sql

-- Function to get return items for a booking
create or replace function get_return_items_for_booking(p_booking_id uuid)
returns table (
  id uuid,
  equipment_name text,
  expected_quantity integer,
  returned_good_quantity integer,
  damaged_quantity integer,
  missing_quantity integer,
  remaining_out_quantity integer
) language sql stable as $$
  select
    ri.id,
    e.name as equipment_name,
    ri.expected_quantity,
    ri.returned_good_quantity,
    ri.damaged_quantity,
    ri.missing_quantity,
    ri.remaining_out_quantity
  from return_items ri
  join equipment e on ri.equipment_id = e.id
  join equipment_returns er on ri.return_id = er.id
  where er.booking_id = p_booking_id;
$$;
