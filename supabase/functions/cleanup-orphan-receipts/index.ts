// supabase/functions/cleanup-orphan-receipts/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

serve(async (req) => {
  // Scheduled function – no auth required.
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

  // List objects in private bucket
  const { data: objects, error } = await supabase.storage.from("booking-receipts").list("pending", { limit: 1000, offset: 0 });
  if (error) {
    return new Response(JSON.stringify({ error: "Failed to list bucket" }), { status: 500 });
  }

  for (const obj of objects) {
    // Check if object is linked to a payment
    const path = `pending/${obj.name}`;
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id")
      .eq("receipt_path", path)
      .single();
    if (payErr || !payment) {
      // Not linked – delete if older than cutoff
      if (new Date(obj.last_modified) < cutoff) {
        await supabase.storage.from("booking-receipts").remove([path]);
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
