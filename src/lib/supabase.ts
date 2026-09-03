import { createClient } from "@supabase/supabase-js";

// Use real env vars in production; fall back to localhost defaults only in dev mode.
// Prefer VITE_ prefixed variables for client side, but also support generic env vars for flexibility.
const supabaseUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "http://localhost:54321")
  : (import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL);

// Prefer publishable key for anonymous client. Fallback to legacy anon key if needed.
const supabaseAnonKey = import.meta.env.DEV
  ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "anon-key")
  : (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

