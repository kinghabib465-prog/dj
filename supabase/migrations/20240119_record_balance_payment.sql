-- 20240119_record_balance_payment.sql
-- Atomic RPC for recording balance payment

CREATE OR REPLACE FUNCTION public.record_balance_payment(p_booking_id uuid, p_admin_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking record;
    v_payment_id uuid;
BEGIN
    -- Lock the booking row
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

    -- Insert payment
    INSERT INTO public.payments (booking_id, type, amount, method, status, verified_at, verified_by, created_at, updated_at)
    VALUES (p_booking_id, 'BALANCE', v_booking.remaining_amount, 'CASH', 'VERIFIED', now(), p_admin_id, now(), now())
    RETURNING id INTO v_payment_id;

    -- Update booking
    UPDATE public.bookings
    SET remaining_amount = 0,
        status = 'READY_FOR_PICKUP'
    WHERE id = p_booking_id;

    -- Insert audit log
    INSERT INTO public.audit_logs (admin_id, action, entity, entity_id, metadata, created_at)
    VALUES (p_admin_id, 'BALANCE_PAYMENT_RECORDED', 'booking', p_booking_id, jsonb_build_object('payment_id', v_payment_id), now());

    RETURN v_payment_id;
END;
$$;
