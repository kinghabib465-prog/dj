import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// Use secret key for privileged admin operations (bypasses RLS).
const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

// Setup client with service role privileges and no session persistence.
const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function ensureUser(email, password) {
  // Try to create the user; if it already exists, fetch it.
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && error.code === "email_exists") {
    // Existing user – fetch via listUsers.
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = data?.users?.find((u) => u.email === email);
    if (!existing) throw new Error(`User with email ${email} not found`);
    // Ensure password is set to the desired one.
    const { error: updError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
    if (updError) throw updError;
    return existing;
  }
  if (error) throw error;
  return created;
}

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "Password123!";
  const adminUser = await ensureUser(adminEmail, adminPassword);
  const adminId = adminUser.id;

  // Insert admin profile if it does not already exist.
  const { data: existingProfile, error: fetchProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", adminId)
    .single();
  if (fetchProfileError && fetchProfileError.code !== "PGRST116") {
    console.error("Error checking admin profile:", fetchProfileError);
    return;
  }
  if (!existingProfile) {
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: adminId,
      email: adminEmail,
    });
    if (profileError) {
      console.error("Admin profile insert error:", profileError);
      return;
    }
  }
// Ensure admin flag is true for the admin profile
await supabaseAdmin.from("profiles").update({ is_admin: true }).eq("id", adminId);
  console.log("Admin user ready with profile id:", adminId);

  const userEmail = "user@example.com";
  const userPassword = "Password123!";
  const normalUser = await ensureUser(userEmail, userPassword);
  console.log("Non-admin user ready with id:", normalUser.id);
}

main().catch((e) => console.error(e));

