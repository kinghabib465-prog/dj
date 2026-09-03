import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
console.log('RUN_SUPABASE_INTEGRATION_TESTS =', process.env.RUN_SUPABASE_INTEGRATION_TESTS);
