import { supabase } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

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
          ...getCorsHeaders(req), "Content-Type": "application/json",
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

  if (
    booking.status !==
      "READY_FOR_PICKUP" ||
    booking.remaining_amount > 0
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Booking not ready for handover",
      }),
      {
        status: 400,
        headers: {
          ...getCorsHeaders(req), "Content-Type": "application/json",
        },
      }
    );
  }

  const now =
    new Date().toISOString();

  const { error: updateError } =
    await supabase
      .from("bookings")
      .update({
        status: "EQUIPMENT_OUT",
        equipment_out_at: now,
      })
      .eq("id", bookingId);

  if (updateError) {
    console.error(
      "Booking handover update failed",
      updateError
    );

    return new Response(
      JSON.stringify({
        error:
          "Booking update failed",
      }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(req), "Content-Type": "application/json",
        },
      }
    );
  }

  await supabase
    .from("audit_logs")
    .insert({
      admin_id: auth.user.id,
      action:
        "EQUIPMENT_HANDED_OUT",
      entity: "booking",
      entity_id: bookingId,
      metadata: {},
      created_at: now,
    });

  return new Response(
    JSON.stringify({
      success: true,
      bookingId,
      bookingStatus: booking?.status,
      remainingAmount: booking?.remaining_amount,
    }),
    {
      status: 200,
      headers: {
        ...getCorsHeaders(req), "Content-Type": "application/json",
      },
    }
  );
});
