import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";




const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, secretKey);

async function main() {
  const { data, error } = await supabase.storage.getBucket("booking-receipts");
  if (error) {
    console.error("Bucket get error:", error);
    return;
  }
  console.log("Bucket info:", data);
}

main();
