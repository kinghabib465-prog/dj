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
  } catch {
    // If parsing fails, ignore and fallback.
  }
}
if (!secretKey) {
  // Legacy fallback – not recommended for new code.
  secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

// Debug log – only booleans, no secret values.
console.log("SUPABASE_CLIENT_BOOT", {
  hasUrl: Boolean(supabaseUrl),
  hasSecretKeys: Boolean(Deno.env.get("SUPABASE_SECRET_KEYS")),
  hasLegacyServiceKey: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
});

if (!secretKey) {
  // If no key is available, the client will not work – log for debugging.
  console.error("SUPABASE_CLIENT_ERROR", "Missing secret key for Supabase client");
}

export const supabase = createClient(supabaseUrl, secretKey!);
