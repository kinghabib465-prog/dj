import { supabase } from "../_shared/supabase.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      }
    );
  }

  const auth = await requireAdmin(req);

  if (!auth.ok) {
    return auth.response;
  }

  const { bookingId } = await req.json();

  if (!bookingId) {
    return new Response(
      JSON.stringify({
        error: "bookingId required",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const {
    data: booking,
    error: bookingError,
  } = await supabase
    .from("bookings")
    .select(
      "id,status,remaining_amount"
    )
    .eq("id", bookingId)
    .single();

  console.log('record_balance_payment fetched booking:', booking?.status, booking?.remaining_amount);
  if (bookingError || !booking) {
    return new Response(
      JSON.stringify({
        error: "Booking not found",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (booking.status !== "CONFIRMED") {
    return new Response(
      JSON.stringify({
        error: "Booking not CONFIRMED",
        currentStatus: booking?.status,
        bookingId,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (booking.remaining_amount <= 0) {
    return new Response(
      JSON.stringify({
        error: "No remaining amount",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

    console.log('record_balance_payment booking status', booking?.status);
  // Use atomic RPC to record balance payment
  const { data: paymentId, error: rpcError } = await supabase.rpc('record_balance_payment', {
    p_booking_id: bookingId,
    p_admin_id: auth.user.id,
  });

  if (rpcError || !paymentId) {
    console.error('record_balance_payment RPC failed', rpcError);
    return new Response(
      JSON.stringify({ error: 'Payment processing failed' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

return new Response(
  JSON.stringify({
    success: true,
    bookingId,
    paymentId,
    bookingStatus: booking?.status,
  }),
  {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }
);
/*
  const {
    data: payment,
    error: paymentError,
  } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      type: "BALANCE",
      amount: booking.remaining_amount,
      method: "CASH",
      status: "VERIFIED",
      verified_at:
        new Date().toISOString(),
      verified_by: auth.user.id,
      created_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .select()
    .single();

  if (paymentError || !payment) {
    console.error(
      "Balance payment insert failed",
      paymentError
    );

    return new Response(
      JSON.stringify({
        error: "Payment insert failed",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const { error: updateError } =
    await supabase
      .from("bookings")
      .update({
        remaining_amount: 0,
        status: "READY_FOR_PICKUP",
      })
      .eq("id", bookingId);

  if (updateError) {
    console.error(
      "Booking update failed",
      updateError
    );

    return new Response(
      JSON.stringify({
        error: "Booking update failed",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  await supabase
    .from("audit_logs")
    .insert({
      admin_id: auth.user.id,
      action:
        "BALANCE_PAYMENT_RECORDED",
      entity: "booking",
      entity_id: bookingId,
      metadata: {
        payment_id: payment.id,
      },
      created_at:
        new Date().toISOString(),
    });

  return new Response(
    JSON.stringify({
      success: true,
      bookingId,
      paymentId: payment.id,
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
*/
});
