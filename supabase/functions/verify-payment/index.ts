import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/corsHelper.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
console.log("VERIFY_PAYMENT_MODULE_BOOT");
console.log("BOOT_ENV", {

  hasUrl: Boolean(Deno.env.get("SUPABASE_URL")),
  hasAnon: Boolean(Deno.env.get("SUPABASE_ANON_KEY")),
  hasService: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
});

async function handler(req: Request) {
  console.log("VERIFY_PAYMENT_HANDLER_ENTER");
  console.log("VERIFY_PAYMENT_METHOD", req.method);
  // Debug shortcut: If query param debug=true, return early with a simple response
  const url = new URL(req.url);
  if (url.searchParams.get("debug") === "true") {
    return new Response(JSON.stringify({ debug: "handler entered", method: req.method }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") {

    return new Response(null, {
      headers: getCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return new Response(
      "Method not allowed",
      {
        status: 405,
        headers: getCorsHeaders(req),
      }
    );
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return auth.response;
  }
  let supabase;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) {
      console.error("Missing SUPABASE_ANON_KEY");
      return new Response(JSON.stringify({ error: "MISSING_ANON_KEY" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch (e) {
    console.error('Failed to create supabase client:', e);
    return new Response(JSON.stringify({ error: "SUPABASE_CLIENT_ERROR", message: e?.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST" }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const {
      bookingId,
      paymentId,
      action,
      rejectionReason,
    } = body;

    if (!bookingId || !paymentId) {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST" }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch booking status before processing
    const { data: bookingBefore, error: fetchErrorBefore } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .single();
    console.log('booking status before process_payment_review:', bookingBefore?.status, fetchErrorBefore);

    if (action !== "APPROVE" && action !== "REJECT") {
      return new Response(
        JSON.stringify({ error: "INVALID_ACTION" }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error } = await supabase.rpc("process_payment_review", {
      p_booking_id: bookingId,
      p_payment_id: paymentId,
      p_action: action,
      p_rejection_reason: rejectionReason ?? null,
      p_admin_id: auth.user.id,
    });
    console.log('process_payment_review error:', error);
    const { data: updatedBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .single();
    console.log('booking status after process_payment_review:', updatedBooking?.status, fetchError);
    console.log('process_payment_review called');

    if (error) {
      console.error(
        "process_payment_review failed",
        {
          code: error.code,
          message: error.message,
        }
      );

      return new Response(
        JSON.stringify({ error: "SERVER_ERROR" }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch updated booking for debugging
    const { data: finalBooking, error: fetchBookingError } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .single();
    return new Response(
      JSON.stringify({
        success: true,
        bookingStatus: finalBooking?.status,
        fetchError: fetchBookingError?.message,
      }),
      {
        status: 200,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    console.error('Unhandled error in verify-payment:', e);
    return new Response(
      JSON.stringify({ error: "UNHANDLED_ERROR", message: e?.message }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      }
    );
  }
}

Deno.serve(handler);

