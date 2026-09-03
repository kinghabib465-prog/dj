import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

/**
 * Privileged setup / admin client (service role). Bypasses RLS.
 */
export const setupClient = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Anonymous application client – no auth, uses publishable key.
 */
export const anonClient = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Authenticated application client – login with email/password and obtain a JWT.
 * Returns a Supabase client configured with the JWT in the Authorization header.
 */
export async function getAuthClient(email: string, password: string): Promise<SupabaseClient> {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Failed to obtain access token");
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
