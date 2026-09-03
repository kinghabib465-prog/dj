-- 20240111_add_updated_at_trigger.sql

-- Generic function to set updated_at timestamp
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- Apply trigger to mutable tables
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

create trigger trg_business_settings_updated_at
before update on business_settings
for each row execute function set_updated_at();

create trigger trg_equipment_updated_at
before update on equipment
for each row execute function set_updated_at();

create trigger trg_bookings_updated_at
before update on bookings
for each row execute function set_updated_at();

create trigger trg_booking_items_updated_at
before update on booking_items
for each row execute function set_updated_at();

create trigger trg_payments_updated_at
before update on payments
for each row execute function set_updated_at();

create trigger trg_equipment_returns_updated_at
before update on equipment_returns
for each row execute function set_updated_at();

create trigger trg_return_items_updated_at
before update on return_items
for each row execute function set_updated_at();

create trigger trg_inventory_adjustments_updated_at
before update on inventory_adjustments
for each row execute function set_updated_at();

create trigger trg_anonymous_stats_updated_at
before update on anonymous_booking_stats
for each row execute function set_updated_at();
