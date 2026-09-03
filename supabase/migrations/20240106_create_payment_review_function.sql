-- 20240106_create_payment_review_function.sql

create or replace function process_payment_review(
  p_booking_id uuid,
  p_payment_id uuid,
  p_action text,
  p_rejection_reason text,
  p_admin_id uuid
) returns void language plpgsql as $$
declare
  v_booking_status booking_status;
  v_payment_status payment_status;
begin
  -- Ensure caller is admin
  if not is_admin() then
    raise exception 'UNAUTHORIZED' using errcode = 'P0004';
  end if;

  -- Fetch current statuses
  select status, payment_status into v_booking_status, v_payment_status from bookings where id = p_booking_id;

  if v_booking_status is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0005';
  end if;

  if p_action = 'APPROVE' then
    if v_booking_status <> 'PENDING_PAYMENT_REVIEW'::booking_status then
      raise exception 'INVALID_BOOKING_STATUS' using errcode = 'P0006';
    end if;
    if v_payment_status <> 'PENDING'::payment_status then
      raise exception 'INVALID_PAYMENT_STATUS' using errcode = 'P0007';
    end if;

    update payments set
      status = 'VERIFIED'::payment_status,
      verified_at = now(),
      verified_by = p_admin_id
    where id = p_payment_id;

    update bookings set
      deposit_paid = deposit_required,
      payment_status = 'VERIFIED'::payment_status,
      status = 'CONFIRMED'::booking_status,
      confirmed_at = now()
    where id = p_booking_id;

    insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
    values (p_admin_id, 'PAYMENT_APPROVED', 'booking', p_booking_id, jsonb_build_object('payment_id', p_payment_id), now());

  elsif p_action = 'REJECT' then
    update payments set
      status = 'REJECTED'::payment_status,
      rejection_reason = p_rejection_reason
    where id = p_payment_id;

    update bookings set
      status = 'PAYMENT_REJECTED'::booking_status
    where id = p_booking_id;

    insert into audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
    values (p_admin_id, 'PAYMENT_REJECTED', 'booking', p_booking_id, jsonb_build_object('payment_id', p_payment_id, 'reason', p_rejection_reason), now());

  else
    raise exception 'INVALID_ACTION' using errcode = 'P0008';
  end if;
end;
$$;
