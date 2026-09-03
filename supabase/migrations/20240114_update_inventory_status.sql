-- 20240114_update_inventory_status.sql

-- Updated inventory_status view to include damaged, missing, and rentable quantities
DROP VIEW IF EXISTS inventory_status; CREATE OR REPLACE VIEW inventory_status AS
select
  e.id as equipment_id,
  e.name,
  e.total_quantity,
  coalesce(outside_qty, 0) as physical_outside_quantity,
  coalesce(damaged_qty, 0) as damaged_quantity,
  coalesce(missing_qty, 0) as missing_quantity,
  (e.total_quantity - coalesce(outside_qty,0) - coalesce(damaged_qty,0) - coalesce(missing_qty,0)) as rentable_quantity,
  (e.total_quantity - coalesce(outside_qty,0) - coalesce(missing_qty,0)) as physical_inside_quantity
from equipment e
left join (
  select
    bi.equipment_id,
    sum(bi.quantity) - coalesce(sum(ri.returned_good_quantity + ri.damaged_quantity),0) as outside_qty
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  left join return_items ri on ri.booking_item_id = bi.id
  where b.status in ('EQUIPMENT_OUT','RETURN_PENDING')
  group by bi.equipment_id
) o on o.equipment_id = e.id
left join (
  select
    equipment_id,
    sum(damaged_quantity) as damaged_qty
  from return_items
  where damaged_quantity > 0
  group by equipment_id
) d on d.equipment_id = e.id
left join (
  select
    equipment_id,
    sum(missing_quantity) as missing_qty
  from return_items
  where missing_quantity > 0
  group by equipment_id
) m on m.equipment_id = e.id;
