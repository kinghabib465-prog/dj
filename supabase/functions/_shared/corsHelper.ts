export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const allowedList = allowed.split(",").map((o) => o.trim()).filter(Boolean);
  const allowAll = allowedList.includes("*");
  const allowOrigin = allowAll ? "*" : allowedList.includes(origin) ? origin : "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type, x-client-info",
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
}
