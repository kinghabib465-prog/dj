import { supabase } from "../_shared/supabase.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: getCorsHeaders(req) });
  }

  const payload = await req.json();

  // Basic validation
  const requiredFields = [
    "customerName",
    "customerPhone",
    "rentalStartAt",
    "expectedReturnAt",

    "receiptObjectPath",
    "items",
  ];
  for (const f of requiredFields) {
    if (!payload[f]) {
      return new Response(JSON.stringify({ error: "INVALID_REQUEST" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
  }

  // Ensure items is an array with at least one element
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return new Response(JSON.stringify({ error: "NO_EQUIPMENT_SELECTED" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // Call the database function that creates booking atomically
  const { data, error } = await supabase.rpc("create_booking", { payload });

  if (error) {
    // Map known errors to user-friendly codes; include raw detail for debugging.
    let errMsg = "SERVER_ERROR";
    let detail = error.message ?? "";
    if (error.message.includes("INVALID_REQUEST")) errMsg = "INVALID_REQUEST";
    else if (error.message.includes("INVALID_RENTAL_PERIOD")) errMsg = "INVALID_RENTAL_PERIOD";
    else if (error.message.includes("INSUFFICIENT_AVAILABILITY")) errMsg = "INSUFFICIENT_AVAILABILITY";
    return new Response(JSON.stringify({ error: errMsg, detail }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // data is expected to be an array with booking_number and status
  const result = Array.isArray(data) ? data[0] : data;

  return new Response(JSON.stringify({ bookingNumber: result.booking_number, status: result.status }), {
    status: 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(handler);



