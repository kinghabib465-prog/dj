



const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

async function main() {
  const url = `${supabaseUrl}/storage/v1/bucket?name=booking-receipts`;
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
