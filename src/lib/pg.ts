import "server-only";
import { Pool } from "pg";

// One pool per server process (kept on globalThis so dev hot-reloads don't leak connections).
const globalForPg = globalThis as unknown as { __tennetPool?: Pool };

export const pool: Pool =
  globalForPg.__tennetPool ??
  new Pool({
    connectionString: process.env.SUPABASE_DB_URL_POOLER,
    ssl: { rejectUnauthorized: false },
    // Keep this small: serverless instances each open their own pool against Supabase's pooler.
    max: Number(process.env.PG_POOL_MAX ?? 3),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__tennetPool = pool;
}
