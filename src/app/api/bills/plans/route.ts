import { NextRequest, NextResponse } from "next/server";
import { getProvider, providerAllowed } from "@/lib/bill-providers";
import { chargeFor } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { billsError, requireUser } from "@/lib/bills-http";

// GET /api/bills/plans?provider=vtugate&network=mtn&variant=sme   (data bundles)
// → { plans: [{ code, name, priceNaira }] }. Plan codes only work with the provider that returned them.
export async function GET(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;

  const q = req.nextUrl.searchParams;
  const provider = getProvider(q.get("provider"));
  const network = (q.get("network") ?? "").toLowerCase();
  const variant = q.get("variant")?.toLowerCase() || undefined;

  if (!provider || !(await providerAllowed(provider)) || !provider.supports("data")) {
    return NextResponse.json({ error: "That provider isn't available." }, { status: 400 });
  }
  if (!/^[a-z0-9]{2,20}$/.test(network) || (variant && !/^[a-z0-9_]{1,20}$/.test(variant))) {
    return NextResponse.json({ error: "network is required." }, { status: 400 });
  }

  try {
    const settings = await getSettings();
    if (!settings.services.data) return NextResponse.json({ error: "This service is temporarily unavailable." }, { status: 503 });
    // Show the customer price (provider price plus markup). The provider price itself is never sent to the browser.
    const plans = (await provider.plans({ kind: "data", network, variant })).map((p) => ({ ...p, priceNaira: chargeFor(p.priceNaira, settings.pricing.markup.data) }));
    return NextResponse.json({ plans });
  } catch (err) {
    return billsError(err);
  }
}
