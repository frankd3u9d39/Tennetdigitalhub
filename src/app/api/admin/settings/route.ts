import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { getSettings, saveSettings, type SettingsKey } from "@/lib/settings";

// Everything an admin can edit, including provider costs (admin-only; never sent to customers).
export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json(await getSettings());
  } catch (err) {
    return adminError(err);
  }
}

// PUT { key: "pricing" | "services" | "providers", value } is validated, saved and audited (before and after).
export async function PUT(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  const body = (await req.json().catch(() => null)) as { key?: string; value?: unknown } | null;
  if (!body || !["pricing", "services", "providers"].includes(String(body.key))) return json({ error: "Unknown settings group." }, 400);
  try {
    return json(await saveSettings(body.key as SettingsKey, body.value, g.admin.email));
  } catch (err) {
    return adminError(err);
  }
}
