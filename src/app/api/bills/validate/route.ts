import { NextRequest, NextResponse } from "next/server";
import { enabledProviders, getProvider } from "@/lib/bill-providers";
import { chargeFor } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { ProviderUnavailableError } from "@/lib/bill-providers/types";
import { normalizeLocalMsisdn } from "@/lib/bills";
import { billsError, parseKind, requireUser } from "@/lib/bills-http";

// POST /api/bills/validate { kind: "electricity"|"cable", network, customerId, phone, provider? }
// → { valid, name?, provider?, plans? }. Lets the UI show "Account name: …" before the user pays, and the
// available packages for a cable smartcard. For cable, pay with the same provider that answered.
export async function POST(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    kind?: string;
    network?: string;
    customerId?: string;
    phone?: string;
    provider?: string;
  } | null;

  const kind = parseKind(body?.kind);
  const network = String(body?.network ?? "").toLowerCase();
  const customerId = String(body?.customerId ?? "").replace(/[\s-]/g, "");
  const phone = normalizeLocalMsisdn(String(body?.phone ?? ""));

  if ((kind !== "electricity" && kind !== "cable") || !/^[a-z0-9]{2,20}$/.test(network) || !/^\d{6,20}$/.test(customerId) || !phone) {
    return NextResponse.json({ error: "kind, network, customerId and a valid phone are required." }, { status: 400 });
  }

  const settings = await getSettings();
  if (!settings.services[kind]) return NextResponse.json({ error: "This service is temporarily unavailable." }, { status: 503 });
  let providers = await enabledProviders(kind);
  if (body?.provider) {
    const only = getProvider(body.provider);
    providers = only && providers.includes(only) ? [only] : [];
  }
  if (providers.length === 0) return NextResponse.json({ error: "Bill payments are not available yet." }, { status: 503 });

  try {
    let unavailable: unknown = null;
    for (const p of providers) {
      try {
        const v = await p.validate({ kind, network, customerId, phone });
        if (v.valid) {
          // Cable packages are shown at the customer price (provider price plus markup).
          const plans = v.plans?.map((pl) => ({ ...pl, priceNaira: chargeFor(pl.priceNaira, settings.pricing.markup.cable) }));
          return NextResponse.json({ valid: true, name: v.name, plans, provider: p.name });
        }
      } catch (err) {
        if (err instanceof ProviderUnavailableError) unavailable = err;
        else throw err;
      }
    }
    if (unavailable) throw unavailable;
    return NextResponse.json({ valid: false });
  } catch (err) {
    return billsError(err);
  }
}
