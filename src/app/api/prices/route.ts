import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getSettings } from "@/lib/settings";

// What customers see: the prices they pay, the markup rules (so the screen can show the exact total before they pay),
// and which services are on. Provider costs and anything admin-only are NOT included.
export async function GET() {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { pricing, services } = await getSettings();
  return NextResponse.json({
    identity: pricing.identity,
    slips: pricing.slips,
    markup: pricing.markup,
    services,
  });
}
