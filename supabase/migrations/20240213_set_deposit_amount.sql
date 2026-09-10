-- 20240213_set_deposit_amount.sql
-- Admin sets the actual deposit amount read from the receipt (before approval)

CREATE OR REPLACE FUNCTION public.set_deposit_amount(
  p_booking_id uuid,
  p_payment_id uuid,
  p_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status booking_status;
  v_subtotal integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0004';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0004';
  END IF;

  SELECT status, subtotal INTO v_status, v_subtotal
  FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'P0005';
  END IF;
  IF v_status <> 'PENDING_PAYMENT_REVIEW' THEN
    RAISE EXCEPTION 'INVALID_BOOKING_STATUS' USING ERRCODE = 'P0006';
  END IF;

  UPDATE payments
  SET amount = p_amount, updated_at = now()
  WHERE id = p_payment_id AND booking_id = p_booking_id AND type = 'DEPOSIT';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE = 'P0005';
  END IF;

  UPDATE bookings
  SET deposit_required = p_amount,
      remaining_amount = GREATEST(0, v_subtotal - p_amount),
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
  VALUES (auth.uid(), 'DEPOSIT_AMOUNT_SET', 'booking', p_booking_id,
          jsonb_build_object('amount', p_amount), now());
END;
$$;