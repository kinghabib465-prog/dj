import { supabase } from "../_shared/supabase.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Ensure admin
  const { data: adminData, error: adminError } = await supabase.auth.getUser();
  if (adminError || !adminData.user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Run expiration function
  const { error } = await supabase.rpc('expire_pending_bookings');
  if (error) {
    return new Response(JSON.stringify({ error: "SERVER_ERROR" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
