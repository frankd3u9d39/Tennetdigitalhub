import { NextRequest, NextResponse } from "next/server";
import { enabledProviders } from "@/lib/bill-providers";
import { ProviderUnavailableError } from "@/lib/bill-providers/types";
import { billsError, parseKind, requireUser } from "@/lib/bills-http";
import { getSettings } from "@/lib/settings";

// GET /api/bills/networks?kind=airtime|data|electricity|cable
// → { options: [{ provider, network, label, variants? }] }  (networks, discos or TV providers per provider)
export async function GET(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;

  const kind = parseKind(req.nextUrl.searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "kind must be airtime, data, electricity or cable." }, { status: 400 });

  if (!(await getSettings()).services[kind]) {
    return NextResponse.json({ error: "This service is temporarily unavailable." }, { status: 503 });
  }
  const providers = await enabledProviders(kind);
  if (providers.length === 0) return NextResponse.json({ error: "Bill payments are not available yet." }, { status: 503 });

  try {
    const results = await Promise.allSettled(providers.map(async (p) => (await p.networks(kind)).map((n) => ({ provider: p.name, ...n }))));
    let options = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    // Customers shouldn't see provider names: show each network once, from the first provider in the configured order.
    // (Data and cable plan codes are provider-specific, so the option keeps the provider that will be paid.)
    const seen = new Set<string>();
    options = options.filter((o) => (seen.has(o.network) ? false : (seen.add(o.network), true)));
    if (options.length === 0) {
      const failure = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      throw failure?.reason ?? new ProviderUnavailableError("No options available.");
    }
    return NextResponse.json({ options });
  } catch (err) {
    return billsError(err);
  }
}
