// supabase/functions/complete-booking/index.ts
import { supabase } from "../_shared/supabase.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: "bookingId required" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // Load booking with related items and return status
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, remaining_amount, equipment_out_at, returned_at, scheduled_delete_at")
    .eq("id", bookingId)
    .single();
  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: "Booking not found" }), {
      status: 404,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // Verify completion conditions. The UI hides the button when blocked, but the
  // server must never trust the client — every reason is machine readable.
  const reasons: string[] = [];

  if (booking.status !== "EQUIPMENT_OUT" && booking.status !== "RETURN_PENDING") {
    reasons.push("INVALID_STATUS");
  }
  if (booking.remaining_amount > 0) {
    reasons.push("OUTSTANDING_BALANCE");
  }

  // Check that no equipment is still out (use a helper view or function)
  const { data: outsideCount, error: outsideError } = await supabase.rpc("get_equipment_outside_quantity", { p_booking_id: bookingId });
  if (outsideError) {
    return new Response(JSON.stringify({ error: "Failed to check outside quantity" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
  if (outsideCount && outsideCount > 0) {
    reasons.push("EQUIPMENT_STILL_OUT");
  }

  // Check for unresolved missing items – assume a view returns count
  const { data: missingCount, error: missingError } = await supabase.rpc("get_unresolved_missing_count", { p_booking_id: bookingId });
  if (missingError) {
    return new Response(JSON.stringify({ error: "Failed to check missing items" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
  if (missingCount && missingCount > 0) {
    reasons.push("UNRESOLVED_MISSING_ITEMS");
  }

  if (reasons.length > 0) {
    return new Response(
      JSON.stringify({
        error: "Booking cannot be completed",
        reason: reasons[0],
        reasons,
        details: {
          remainingAmount: booking.remaining_amount,
          outsideQuantity: outsideCount ?? 0,
          unresolvedMissingCount: missingCount ?? 0,
        },
      }),
      {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }

  const now = new Date().toISOString();
  const scheduledDelete = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Update booking to COMPLETED
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "COMPLETED",
      completed_at: now,
      scheduled_delete_at: scheduledDelete,
    })
    .eq("id", bookingId);
  if (updateError) {
    return new Response(JSON.stringify({ error: "Failed to update booking" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // Audit log
  await supabase.from("audit_logs").insert([
    {
      admin_id: auth.user.id,
      action: "BOOKING_COMPLETED",
      entity: "booking",
      entity_id: bookingId,
      metadata: {},
      created_at: now,
    },
  ]);

  return new Response(JSON.stringify({ success: true, bookingId }), {
    status: 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
});