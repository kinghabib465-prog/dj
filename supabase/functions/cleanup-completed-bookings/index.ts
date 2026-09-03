// supabase/functions/cleanup-completed-bookings/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

serve(async (req) => {
  // This function is intended to be scheduled (e.g., daily). No auth required.
  const now = new Date().toISOString();

  // Find bookings eligible for cleanup
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, customer_name, customer_phone, event_location, event_map_url, receipt_path, personal_data_deleted_at, scheduled_delete_at")
    .eq("status", "COMPLETED")
    .lte("scheduled_delete_at", now)
    .is("personal_data_deleted_at", null);
  if (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch bookings" }), { status: 500 });
  }

  for (const b of bookings) {
    // Verify no outside equipment or unresolved missing items (skip if any)
    const { data: outsideCount, error: outErr } = await supabase.rpc("get_equipment_outside_quantity", { p_booking_id: b.id });
    const { data: missingCount, error: missErr } = await supabase.rpc("get_unresolved_missing_count", { p_booking_id: b.id });
    if (outErr || missErr || (outsideCount && outsideCount > 0) || (missingCount && missingCount > 0)) {
      // Skip this booking
      continue;
    }

    // Delete receipt file if exists (private bucket)
    if (b.receipt_path) {
      await supabase.storage.from("booking-receipts").remove([b.receipt_path]);
    }

    // Anonymize personal fields
    await supabase
      .from("bookings")
      .update({
        customer_name: null,
        customer_phone: null,
        event_location: null,
        event_map_url: null,
        notes: null,
        receipt_path: null,
        personal_data_deleted_at: now,
      })
      .eq("id", b.id);

    // Insert anonymous stats (if not already)
    const { data: stats, error: statsErr } = await supabase
      .from("anonymous_booking_stats")
      .select("id")
      .eq("source_booking_id", b.id)
      .single();
    if (!stats && !statsErr) {
      // Compute stats – simplified example
      const { data: booking, error: bkErr } = await supabase
        .from("bookings")
        .select("subtotal, deposit_required, completed_at")
        .eq("id", b.id)
        .single();
      if (!bkErr && booking) {
        const completedAt = new Date(booking.completed_at);
        const year = completedAt.getUTCFullYear();
        const month = completedAt.getUTCMonth() + 1;
        await supabase.from("anonymous_booking_stats").insert([
          {
            source_booking_id: b.id,
            year,
            month,
            revenue: booking.subtotal,
            deposit_amount: booking.deposit_required,
            equipment_summary: null,
            total_items: 0,
            rental_duration_minutes: 0,
            completed_at: booking.completed_at,
          },
        ]);
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
