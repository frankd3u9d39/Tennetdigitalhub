import { NextRequest, NextResponse } from "next/server";
import { handlePaystackWebhook } from "@/lib/funding";
import { PaystackConfigError } from "@/lib/paystack";

// Paystack calls this when a payment succeeds, even if the customer closed the tab. Set it in the Paystack dashboard:
// Settings → API Keys & Webhooks → Live/Test Webhook URL = https://<your-domain>/api/webhooks/paystack
// The body is signed (x-paystack-signature); unsigned or forged requests are rejected before anything happens.
export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // the signature covers the exact raw bytes
  let status: number;
  try {
    status = await handlePaystackWebhook(rawBody, req.headers.get("x-paystack-signature"));
  } catch (err) {
    console.error("[funding] webhook error:", err instanceof Error ? err.message : err);
    status = err instanceof PaystackConfigError ? 503 : 500; // Paystack retries on both
  }
  return new NextResponse(null, { status });
}
