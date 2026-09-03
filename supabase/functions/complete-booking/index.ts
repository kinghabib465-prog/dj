// supabase/functions/complete-booking/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401 });
  }
  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }
  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !adminCheck) {
    return new Response(JSON.stringify({ error: "Not admin" }), { status: 403 });
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: "bookingId required" }), { status: 400 });
  }

  // Load booking with related items and return status
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, remaining_amount, equipment_out_at, returned_at, scheduled_delete_at")
    .eq("id", bookingId)
    .single();
  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
  }

  // Verify completion conditions
  if (booking.remaining_amount > 0) {
    return new Response(JSON.stringify({ error: "Outstanding balance" }), { status: 400 });
  }
  if (booking.status !== "EQUIPMENT_OUT" && booking.status !== "RETURN_PENDING") {
    return new Response(JSON.stringify({ error: "Invalid status for completion" }), { status: 400 });
  }

  // Check that no equipment is still out (use a helper view or function)
  const { data: outsideCount, error: outsideError } = await supabase.rpc("get_equipment_outside_quantity", { p_booking_id: bookingId });
  if (outsideError) {
    return new Response(JSON.stringify({ error: "Failed to check outside quantity" }), { status: 500 });
  }
  if (outsideCount && outsideCount > 0) {
    return new Response(JSON.stringify({ error: "Equipment still out" }), { status: 400 });
  }

  // Check for unresolved missing items – assume a view returns count
  const { data: missingCount, error: missingError } = await supabase.rpc("get_unresolved_missing_count", { p_booking_id: bookingId });
  if (missingError) {
    return new Response(JSON.stringify({ error: "Failed to check missing items" }), { status: 500 });
  }
  if (missingCount && missingCount > 0) {
    return new Response(JSON.stringify({ error: "Unresolved missing items" }), { status: 400 });
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
    return new Response(JSON.stringify({ error: "Failed to update booking" }), { status: 500 });
  }

  // Audit log
  await supabase.from("audit_logs").insert([
    {
      admin_id: user.id,
      action: "BOOKING_COMPLETED",
      entity: "booking",
      entity_id: bookingId,
      metadata: {},
      created_at: now,
    },
  ]);

  return new Response(JSON.stringify({ success: true, bookingId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
