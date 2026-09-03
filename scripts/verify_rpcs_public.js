import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

async function main() {
  const url = `${supabaseUrl}/rest/v1/pg_proc?select=proname&proname=in.(start_equipment_return,upsert_return_item,maybe_complete_return,get_bookings_in_range,resolve_missing_item)`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
  });
  console.log('Status:', response.status, response.statusText);
  const txt = await response.text();
  console.log('Body:', txt);
}

main();
