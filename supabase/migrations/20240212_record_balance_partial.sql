-- 20240212_record_balance_partial.sql
-- Allow manual (partial or full) cash balance entry at pickup

CREATE OR REPLACE FUNCTION public.record_balance_payment(
  p_booking_id uuid,
  p_admin_id uuid,
  p_amount integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking record;
    v_payment_id uuid;
    v_amount integer;
    v_remaining integer;
BEGIN
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_booking.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION 'Booking not in CONFIRMED status' USING ERRCODE = 'P0002';
    END IF;

    IF v_booking.remaining_amount <= 0 THEN
        RAISE EXCEPTION 'No remaining amount to pay' USING ERRCODE = 'P0003';
    END IF;

    v_amount := coalesce(p_amount, v_booking.remaining_amount);
    IF v_amount <= 0 OR v_amount > v_booking.remaining_amount THEN
        RAISE EXCEPTION 'Invalid amount' USING ERRCODE = 'P0004';
    END IF;

    INSERT INTO public.payments (booking_id, type, amount, method, status, verified_at, verified_by, created_at, updated_at)
    VALUES (p_booking_id, 'BALANCE', v_amount, 'CASH', 'VERIFIED', now(), p_admin_id, now(), now())
    RETURNING id INTO v_payment_id;

    v_remaining := v_booking.remaining_amount - v_amount;

    UPDATE public.bookings
    SET remaining_amount = v_remaining,
        status = CASE WHEN v_remaining = 0
                      THEN 'READY_FOR_PICKUP'::booking_status
                      ELSE 'CONFIRMED'::booking_status END
    WHERE id = p_booking_id;

    INSERT INTO public.audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
    VALUES (p_admin_id, 'BALANCE_PAYMENT_RECORDED', 'booking', p_booking_id,
            jsonb_build_object('payment_id', v_payment_id, 'amount', v_amount, 'remaining_after', v_remaining), now());

    RETURN v_payment_id;
END;
$$;