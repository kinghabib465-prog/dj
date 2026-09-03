import { supabase } from "../_shared/supabase.ts";
import { getCorsHeaders } from "../_shared/corsHelper.ts";

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: getCorsHeaders(req) });
  }

  const { fileName, fileType } = await req.json();

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(fileType)) {
    return new Response(JSON.stringify({ error: "INVALID_FILE_TYPE" }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const ext = fileName.split(".").pop() ?? "png";
  const objectPath = `pending/${crypto.randomUUID()}.${ext}`;

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
}

Deno.serve(handler);
