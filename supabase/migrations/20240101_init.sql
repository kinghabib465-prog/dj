-- Enable extensions
create extension if not exists "pgcrypto";

-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- business_settings
create table business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  logo_path text,
  description text,
  phone_primary text,
  whatsapp_number text,
  address text,
  map_url text,
  payment_instructions text,
  deposit_instructions text,
  pending_reservation_timeout integer not null default 24,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- equipment_categories
create table equipment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- equipment
create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category_id uuid references equipment_categories(id) on delete set null,
  image_path text,
  total_quantity integer not null check (total_quantity >= 0),
  rental_price integer not null check (rental_price >= 0),
  deposit_price integer not null check (deposit_price >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- booking_status enum
create type booking_status as enum (
  'PENDING_PAYMENT_REVIEW',
  'PAYMENT_REJECTED',
  'CONFIRMED',
  'READY_FOR_PICKUP',
  'EQUIPMENT_OUT',
  'RETURN_PENDING',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);

-- bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text unique not null,
  customer_name text,
  customer_phone text,
  rental_start_at timestamptz not null,
  expected_return_at timestamptz not null,
  event_location text,
  event_map_url text,
  notes text,
  status booking_status not null,
  subtotal integer not null check (subtotal >= 0),
  deposit_required integer not null check (deposit_required >= 0),
  deposit_paid integer not null check (deposit_paid >= 0),
  remaining_amount integer not null check (remaining_amount >= 0),
  payment_status text not null,
  receipt_path text,
  payment_verified_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  equipment_out_at timestamp with time zone,
  returned_at timestamp with time zone,
  completed_at timestamp with time zone,
  scheduled_delete_at timestamp with time zone,
  personal_data_deleted_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- booking_items
create table booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  equipment_id uuid references equipment(id),
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  deposit_amount integer not null check (deposit_amount >= 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table business_settings enable row level security;
alter table equipment_categories enable row level security;
alter table equipment enable row level security;
alter table bookings enable row level security;
alter table booking_items enable row level security;

-- Public SELECT policies
create policy "public_read_active_equipment" on equipment for select using (is_active = true);
create policy "public_read_active_categories" on equipment_categories for select using (true);
create policy "public_read_business_settings" on business_settings for select using (true);

-- ADMIN policies
create policy "admin_full_access" on profiles for all using (auth.uid() = id);
create policy "admin_business_settings" on business_settings for all using (auth.role() = 'authenticated');
create policy "admin_equipment" on equipment for all using (auth.role() = 'authenticated');
create policy "admin_categories" on equipment_categories for all using (auth.role() = 'authenticated');
create policy "admin_bookings" on bookings for all using (auth.role() = 'authenticated');
create policy "admin_booking_items" on booking_items for all using (auth.role() = 'authenticated');
