import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });


import { createClient } from "@supabase/supabase-js";



const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase.from("pg_proc")
    .select("proname")
    .in("proname", ["start_equipment_return","upsert_return_item","maybe_complete_return","get_bookings_in_range","resolve_missing_item"]);
  if (error) {
    console.error("Error querying functions:", error);
  } else {
    console.log("Functions found:", data);
  }
}

main();
