



const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

async function main() {
  const url = `${supabaseUrl}/rest/v1/pg_proc?select=proname`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });
  console.log('Status:', response.status, response.statusText);
  const txt = await response.text();
  console.log('Body:', txt);
}

main();
