import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, secretKey);

async function main() {
  // Query policies on storage.objects for the bucket.
  const { data: policies, error } = await supabase
    .schema("pg_catalog")
    .from("pg_policy")
    .select("policyname,permissive,roles,command,qualdef")
    .eq("schemaname", "storage")
    .eq("tablename", "objects")
    .order("policyname");
  if (error) {
    console.error("Policy query error:", error);
    return;
  }
  console.log("Storage.objects policies:", policies);
}

main();
