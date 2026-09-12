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

  const { bookingId, amount } = await req.json();

  if (!bookingId) {
    return new Response(
      JSON.stringify({
        error: "bookingId required",
      }),
      {
        status: 400,
        headers: {
          ...getCorsHeaders(req), "Content-Type": "application/json",
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

  if (bookingError || !booking) {
    return new Response(
      JSON.stringify({
        error: "Booking not found",
      }),
      {
        status: 404,
        headers: {
          ...getCorsHeaders(req), "Content-Type": "application/json",
        },
      }
    );
  }

  if (!["CONFIRMED", "READY_FOR_PICKUP", "RETURN_PENDING", "COMPLETED"].includes(booking.status)) {
    return new Response(
      JSON.stringify({
        error: "Booking not in a payable status",
        currentStatus: booking?.status,
        bookingId,
      }),
      {
        status: 400,
        headers: {
          ...getCorsHeaders(req), "Content-Type": "application/json",
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
          ...getCorsHeaders(req), "Content-Type": "application/json",
        },
      }
    );
  }

  // Use atomic RPC to record balance payment
  const { data: paymentId, error: rpcError } = await supabase.rpc('record_balance_payment', {
    p_booking_id: bookingId,
    p_admin_id: auth.user.id,
    p_amount: typeof amount === "number" && amount > 0 ? Math.floor(amount) : null,
  });

  if (rpcError || !paymentId) {
    console.error('record_balance_payment RPC failed', rpcError);
    return new Response(
      JSON.stringify({ error: 'Payment processing failed' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
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
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  }
);
});
