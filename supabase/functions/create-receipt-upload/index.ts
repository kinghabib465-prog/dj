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

console.log("SECRET_KEY_PRESENT", Boolean(secretKey));
console.log("SECRET_KEY_LENGTH", secretKey?.length ?? 0);
// supabase client will be created inside handler after ensuring secretKey is available.
import { getCorsHeaders } from "../_shared/corsHelper.ts";
console.log("RECEIPT_UPLOAD_BOOT", {
  hasUrl: Boolean(Deno.env.get("SUPABASE_URL")),
  hasPublishableKeys: Boolean(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")),
  hasSecretKeys: Boolean(Deno.env.get("SUPABASE_SECRET_KEYS")),
  hasAnonLegacy: Boolean(Deno.env.get("SUPABASE_ANON_KEY")),
  hasServiceLegacy: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
});

export default async function handler(req: Request) {
  console.log("Handler invoked", req.method);
  console.log("Headers", [...req.headers.entries()]);
  if (req.headers.get("x-test") === "true") {
    return new Response(JSON.stringify({ test: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  console.log("Handler invoked", req.method);
  if (req.headers.get("x-debug") === "true") {
    return new Response(JSON.stringify({
      env: {
        hasUrl: Boolean(Deno.env.get("SUPABASE_URL")),
        hasSecretKeys: Boolean(Deno.env.get("SUPABASE_SECRET_KEYS")),
        hasLegacyServiceKey: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
        hasPublishableKeys: Boolean(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")),
      },
      secretKeyPresent: Boolean(secretKey),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  if (req.headers.get("x-debug-body") === "true") {
    const body = await req.json();
    return new Response(JSON.stringify({ parsed: body }), { status: 200, headers: { "Content-Type": "application/json" } });
  }


   /*
  }
   */
  let rawBody = "";
  try {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: getCorsHeaders(req) });
  }

  const { fileName, fileType } = await req.json();
  console.log("Parsed body", { fileName, fileType });
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
  if (req.headers.get("x-early") === "true") {
    return new Response(JSON.stringify({ message: "EARLY_OK" }), { status: 200, headers: { "Content-Type": "application/json" } });
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
   console.log("Generated objectPath", objectPath);
   console.log("Calling storage createSignedUploadUrl", objectPath);

  // Ensure bucket exists (idempotent)
  await supabase.storage.createBucket("booking-receipts", { public: false });
  const { data, error } = await supabase.storage
    .from("booking-receipts")
    .createSignedUploadUrl(objectPath, 60 * 5); // 5 minutes
  console.log("Storage response", { data, error });

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
  return new Response(JSON.stringify({ error: "HANDLER_ERROR", details: msg, rawBody }), {
    status: 500,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
}

Deno.serve(handler);
