import { createClient } from "@supabase/supabase-js";

// Use real env vars; fall back to localhost defaults if missing (empty strings are treated as missing).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

// Prefer publishable key for anonymous client; fallback to anon key if needed.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

