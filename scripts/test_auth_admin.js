import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('SERVICE ROLE KEY:', serviceRoleKey);

async function main() {
  const url = `${supabaseUrl}/auth/v1/users?limit=1`;
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
