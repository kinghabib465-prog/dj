import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function testRpc(name, payload) {
  try {
    const { data, error } = await supabase.rpc(name, payload);
    if (error) {
      console.log(`${name} error:`, error.message);
    } else {
      console.log(`${name} succeeded:`, data);
    }
  } catch (e) {
    console.error(`${name} exception:`, e);
  }
}

async function main() {
  const dummyId = "00000000-0000-0000-0000-000000000000";
  await testRpc("start_equipment_return", { p_booking_id: dummyId });
  await testRpc("upsert_return_item", { p_return_item_id: dummyId, p_returned_good_quantity: 0, p_damaged_quantity: 0, p_missing_quantity: 0, p_remaining_out_quantity: 0 });
  await testRpc("maybe_complete_return", { p_booking_id: dummyId });
  await testRpc("get_bookings_in_range", { p_start: "2020-01-01", p_end: "2020-01-31" });
  await testRpc("resolve_missing_item", { p_booking_id: dummyId, p_equipment_id: dummyId, p_action: "RETURNED_LATER", p_quantity: 1 });
}

main();
