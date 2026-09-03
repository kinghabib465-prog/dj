-- 20240109_create_return_tables.sql

-- Returns table
create table equipment_returns (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  processed_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Return items table
create table return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid references equipment_returns(id) on delete cascade,
  booking_item_id uuid references booking_items(id),
  equipment_id uuid references equipment(id),
  expected_quantity integer not null check (expected_quantity > 0),
  returned_good_quantity integer not null default 0 check (returned_good_quantity >= 0),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  missing_quantity integer not null default 0 check (missing_quantity >= 0),
  remaining_out_quantity integer not null default 0 check (remaining_out_quantity >= 0),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chk_quantity_sum check (
    returned_good_quantity + damaged_quantity + missing_quantity + remaining_out_quantity = expected_quantity
  )
);

-- Inventory adjustments table
create table inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment(id),
  type text not null,
  quantity integer not null check (quantity > 0),
  booking_id uuid references bookings(id),
  reason text,
  admin_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Anonymous booking stats (preserve non‑personal data)
create table anonymous_booking_stats (
  id uuid primary key default gen_random_uuid(),
  source_booking_id uuid references bookings(id),
  year integer not null,
  month integer not null,
  revenue integer not null check (revenue >= 0),
  deposit_amount integer not null check (deposit_amount >= 0),
  equipment_summary jsonb,
  total_items integer not null check (total_items >= 0),
  rental_duration_minutes integer not null check (rental_duration_minutes >= 0),
  completed_at timestamptz not null,
  created_at timestamptz default now(),
  unique (source_booking_id)
);

-- Indexes for new tables
create index idx_equipment_returns_booking on equipment_returns(booking_id);
create index idx_return_items_return on return_items(return_id);
create index idx_return_items_booking_item on return_items(booking_item_id);
create index idx_inventory_adjustments_equipment on inventory_adjustments(equipment_id);
create index idx_anonymous_stats_booking on anonymous_booking_stats(source_booking_id);

-- RLS policies – admin only
alter table equipment_returns enable row level security;
alter table return_items enable row level security;
alter table inventory_adjustments enable row level security;
alter table anonymous_booking_stats enable row level security;

create policy "admin_equipment_returns" on equipment_returns for all using (is_admin());
create policy "admin_return_items" on return_items for all using (is_admin());
create policy "admin_inventory_adjustments" on inventory_adjustments for all using (is_admin());
create policy "admin_anonymous_stats" on anonymous_booking_stats for all using (is_admin());
