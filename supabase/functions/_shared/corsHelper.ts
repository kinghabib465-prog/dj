export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  const allowedList = (configured ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // If ALLOWED_ORIGINS is not configured (or contains "*"), allow all origins.
  // Public endpoints remain protected by server-side validation/requireAdmin;
  // CORS only controls whether the browser can read the response.
  const allowAll =
    configured === undefined ||
    configured.trim() === "" ||
    allowedList.includes("*");

  const allowOrigin = allowAll
    ? "*"
    : allowedList.includes(origin)
      ? origin
      : "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, apikey, Content-Type, x-client-info",
  };

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }

  return headers;
}
