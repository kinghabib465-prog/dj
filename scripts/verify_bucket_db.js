import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, secretKey);

async function main() {
  const { data, error } = await supabase
    .from("storage.buckets")
    .select("id,name,public,file_size_limit,allowed_mime_types")
    .eq("id", "booking-receipts")
    .single();
  if (error) {
    console.error("Bucket DB query error:", error);
    return;
  }
  console.log("Bucket DB info:", data);
}

main();
