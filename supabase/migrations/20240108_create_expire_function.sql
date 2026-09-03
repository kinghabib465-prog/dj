-- 20240108_create_expire_function.sql

create or replace function expire_pending_bookings()
returns void language plpgsql as $$
begin
  update bookings
  set status = 'EXPIRED'::booking_status,
      personal_data_deleted_at = now()
  where status = 'PENDING_PAYMENT_REVIEW'::booking_status
    and expires_at <= now();
end;
$$;
