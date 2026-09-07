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

  // Match an explicit entry, any *.vercel.app preview/production URL, or localhost.
  const isAllowed =
    allowAll ||
    allowedList.includes(origin) ||
    /\.vercel\.app$/.test(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("https://localhost:");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, apikey, Content-Type, x-client-info",
    // Keep preflight cache short so CORS fixes propagate quickly.
    "Access-Control-Max-Age": "60",
  };

  // Echo the exact origin when credentials/custom headers (Authorization) are present;
  // fall back to "*" only for pure wildcard configurations.
  if (isAllowed) {
    headers["Access-Control-Allow-Origin"] =
      allowAll && allowedList.includes("*") ? "*" : origin;
  }

  return headers;
}
