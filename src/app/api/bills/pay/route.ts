import { NextRequest, NextResponse } from "next/server";
import { payBill } from "@/lib/bills";
import { billsError, parseKind, requireUser } from "@/lib/bills-http";

// Provider calls wait up to 120s.
export const maxDuration = 150;

// POST /api/bills/pay
// { kind, network, variant?, provider?, planCode?, customerId, phone?, amountNaira? }
//   airtime:     { kind, network, customerId: <phone>, amountNaira }
//   data:        { kind, network, variant, provider, planCode, customerId: <phone> }
//   electricity: { kind, network: <disco>, customerId: <meter>, phone, amountNaira }
//   cable:       { kind, network: <dstv|gotv|startimes>, provider, planCode, customerId: <smartcard>, phone }
// The wallet is debited first; a payment that definitely fails is refunded automatically (and airtime /
// electricity move to the next provider first). "pending" is normal: poll /api/bills/status?reference=…
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = parseKind(body?.kind);
  if (!body || !kind || typeof body.network !== "string" || body.customerId === undefined) {
    return NextResponse.json({ error: "Missing or invalid payment details." }, { status: 400 });
  }

  try {
    const result = await payBill({
      email: user.email,
      kind,
      network: body.network,
      variant: typeof body.variant === "string" ? body.variant : undefined,
      provider: typeof body.provider === "string" ? body.provider : undefined,
      planCode: typeof body.planCode === "string" ? body.planCode : undefined,
      customerId: String(body.customerId),
      phone: typeof body.phone === "string" ? body.phone : undefined,
      amountNaira: body.amountNaira === undefined ? undefined : Number(body.amountNaira),
      expectedChargeNaira: body.expectedChargeNaira,
    });
    return NextResponse.json(result);
  } catch (err) {
    return billsError(err);
  }
}
