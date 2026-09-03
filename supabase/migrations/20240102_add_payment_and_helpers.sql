-- 20240102_add_payment_and_helpers.sql

-- Enums for payments
create type payment_type as enum ('DEPOSIT', 'BALANCE', 'ADDITIONAL');
create type payment_method as enum ('TRANSFER', 'CASH');
create type payment_status as enum ('PENDING', 'VERIFIED', 'REJECTED');

-- Payments table
create table payments (
   id uuid primary key default gen_random_uuid(),
   booking_id uuid references bookings(id) on delete cascade,
   type payment_type not null,
   amount integer not null check (amount >= 0),
   method payment_method not null,
   receipt_path text,
   status payment_status not null default 'PENDING',
   verified_at timestamp with time zone,
   verified_by uuid references profiles(id),
   rejection_reason text,
   created_at timestamp with time zone default now(),
   updated_at timestamp with time zone default now()
);

-- Audit logs
create table audit_logs (
   id uuid primary key default gen_random_uuid(),
   admin_id uuid references profiles(id),
   action text not null,
   entity text,
   entity_id uuid,
   metadata jsonb,
   created_at timestamp with time zone default now()
);

-- Helper function to check admin status
create or replace function is_admin() returns boolean language sql stable as $$
   select exists (select 1 from profiles where id = auth.uid());
$$;

-- Sequence for booking numbers
create sequence booking_number_seq start 1 increment 1;

-- Function to generate booking number
create or replace function generate_booking_number() returns text language plpgsql stable as $$
   declare
     seq_num bigint;
     year_part text;
   begin
     seq_num := nextval('booking_number_seq');
     year_part := to_char(current_timestamp, 'YYYY');
     return format('BK-%s-%06s', year_part, seq_num);
   end;
$$;

-- Trigger to set booking_number before insert
create or replace function bookings_before_insert() returns trigger language plpgsql as $$
begin
   if NEW.booking_number is null then
     NEW.booking_number := generate_booking_number();
   end if;
   return NEW;
end;
$$;

create trigger trg_bookings_before_insert
before insert on bookings
for each row execute function bookings_before_insert();

-- Constraint: rental_start_at < expected_return_at
alter table bookings add constraint chk_rental_period check (rental_start_at < expected_return_at);

-- RLS policies for payments and audit_logs using is_admin()
alter table payments enable row level security;
alter table audit_logs enable row level security;

create policy "admin_payments" on payments for all using (is_admin());
create policy "admin_audit" on audit_logs for all using (is_admin());

-- Function to get equipment availability
create or replace function get_equipment_availability(
   p_equipment_id uuid,
   p_rental_start_at timestamptz,
   p_expected_return_at timestamptz
) returns table (
   equipment_id uuid,
   total_quantity integer,
   reserved_quantity integer,
   available_quantity integer
) language sql stable as $$
   select
     e.id,
     e.total_quantity,
     coalesce(sum(bi.quantity),0) as reserved_quantity,
     e.total_quantity - coalesce(sum(bi.quantity),0) as available_quantity
   from equipment e
   left join booking_items bi on bi.equipment_id = e.id
   left join bookings b on b.id = bi.booking_id
     and b.status in ('PENDING_PAYMENT_REVIEW','CONFIRMED','READY_FOR_PICKUP','EQUIPMENT_OUT','RETURN_PENDING')
     and b.rental_start_at < p_expected_return_at
     and b.expected_return_at > p_rental_start_at
   where e.id = p_equipment_id and e.is_active = true
   group by e.id, e.total_quantity;
$$;

-- Indexes for performance
create index idx_bookings_status on bookings(status);
create index idx_bookings_rental_start on bookings(rental_start_at);
create index idx_bookings_expected_return on bookings(expected_return_at);
create index idx_bookings_expires_at on bookings(expires_at);
create index idx_bookings_number on bookings(booking_number);
create index idx_booking_items_booking on booking_items(booking_id);
create index idx_booking_items_equipment on booking_items(equipment_id);
create index idx_payments_booking on payments(booking_id);
create index idx_payments_status on payments(status);
create index idx_equipment_active on equipment(is_active);
create index idx_equipment_category on equipment(category_id);
create index idx_audit_entity_id on audit_logs(entity_id);
