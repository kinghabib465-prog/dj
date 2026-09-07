import { createClient } from "npm:@supabase/supabase-js@2";

// Load Supabase URL (required)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

// Prefer the new secret key architecture (SUPABASE_SECRET_KEYS) which stores keys as JSON.
// Fallback to legacy service role key if needed.
let secretKey: string | undefined;
const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
if (secretKeysJson) {
  try {
    const secretKeys = JSON.parse(secretKeysJson);
    // Expect a map with a "default" entry.
    secretKey = secretKeys["default"] ?? secretKeys.default;
  } catch {}
}
if (!secretKey) {
  // Legacy fallback – not recommended for new code.
  secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
if (!secretKey) {
  console.error("SUPABASE_CLIENT_ERROR", "Missing secret key for Supabase client");
}

// supabase client will be created inside handler after ensuring secretKey is available.
import { getCorsHeaders } from "../_shared/corsHelper.ts";

export default async function handler(req: Request) {
  try {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: getCorsHeaders(req) });
  }

  const { fileName, fileType } = await req.json();
  if (!secretKey) {
  return new Response(JSON.stringify({ error: "MISSING_SECRET_KEY" }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
}
let supabase;
  try {
    supabase = createClient(supabaseUrl, secretKey);
  } catch (e) {
    console.error('SUPABASE_CLIENT_CREATION_ERROR', e);
    return new Response(JSON.stringify({ error: 'SUPABASE_CLIENT_CREATION_ERROR', details: e?.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
  
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(fileType)) {
    return new Response(JSON.stringify({ error: "INVALID_FILE_TYPE" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const ext = fileName.split(".").pop() ?? "png";
   const objectPath = `pending/${crypto.randomUUID()}.${ext}`;
      
  // Ensure bucket exists (idempotent)
  await supabase.storage.createBucket("booking-receipts", { public: false });
  const { data, error } = await supabase.storage
    .from("booking-receipts")
    .createSignedUploadUrl(objectPath, 60 * 5); // 5 minutes
  
  if (error) {
    return new Response(JSON.stringify({ error: "UPLOAD_URL_ERROR" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ uploadUrl: data?.signedUrl, objectPath }), {
    status: 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
} catch (e) {
  console.error("HANDLER_ERROR", e);
  const msg = e && typeof e === "object" && "message" in e ? (e as any).message : String(e);
  return new Response(JSON.stringify({ error: "HANDLER_ERROR", details: msg }), {
    status: 500,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
}

Deno.serve(handler);



