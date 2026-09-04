import { createClient } from "npm:@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}
const supabase = createClient(supabaseUrl, serviceKey);
const { data, error } = await supabase.storage.listBuckets();
if (error) console.error("Error listing buckets", error);
else console.log("Buckets", data);
