import "server-only";
import { pool } from "./pg";
import {
  DEFAULT_PRICING,
  DEFAULT_PROVIDERS,
  DEFAULT_SERVICES,
  validatePricing,
  validateProviders,
  validateServices,
  withDefaults,
  type AllSettings,
} from "./pricing";

// Runtime settings (prices, markup, service switches, provider order) stored in the database and edited from /admin.
// Cached briefly in memory so a payment doesn't wait on a settings query; an admin's change reaches every server
// instance within CACHE_MS.

export type SettingsKey = "pricing" | "services" | "providers";

const CACHE_MS = 15_000;
let cache: { at: number; value: AllSettings } | null = null;

export function clearSettingsCache() {
  cache = null;
}

export async function getSettings(): Promise<AllSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const rows = (await pool.query(`select key, value from public.app_settings`)).rows as { key: string; value: unknown }[];
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const value: AllSettings = {
    pricing: withDefaults(DEFAULT_PRICING, stored.pricing),
    services: withDefaults(DEFAULT_SERVICES, stored.services),
    providers: withDefaults(DEFAULT_PROVIDERS, stored.providers),
  };
  cache = { at: Date.now(), value };
  return value;
}

export async function writeAudit(entry: {
  adminEmail: string;
  action: string;
  target?: string | null;
  before?: unknown;
  after?: unknown;
  note?: string | null;
}) {
  await pool.query(
    `insert into public.admin_audit (admin_email, action, target, before, after, note) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [
      entry.adminEmail,
      entry.action,
      entry.target ?? null,
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after),
      entry.note ?? null,
    ]
  );
}

/** Validates, saves and audits one settings group. Throws a plain Error with a customer-safe message if invalid. */
export async function saveSettings(key: SettingsKey, input: unknown, adminEmail: string): Promise<AllSettings> {
  const result = key === "pricing" ? validatePricing(input) : key === "services" ? validateServices(input) : validateProviders(input);
  if (!result.ok) throw new Error(result.error);

  const before = (await getSettings())[key];
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into public.app_settings (key, value, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
       on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
      [key, JSON.stringify(result.value), adminEmail]
    );
    await client.query(
      `insert into public.admin_audit (admin_email, action, target, before, after) values ($1, $2, $3, $4::jsonb, $5::jsonb)`,
      [adminEmail, `settings.${key}.update`, key, JSON.stringify(before), JSON.stringify(result.value)]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  clearSettingsCache();
  return getSettings();
}
