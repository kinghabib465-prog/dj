import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

async function main() {
  const url = `${supabaseUrl}/rest/v1/storage.buckets?id=eq.booking-receipts`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    console.error("Bucket query error:", response.status, response.statusText);
    const txt = await response.text();
    console.error(txt);
    return;
  }
  const data = await response.json();
  console.log("Bucket settings:", data);
}

main();
