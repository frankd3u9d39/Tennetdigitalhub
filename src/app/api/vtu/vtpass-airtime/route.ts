import { NextRequest, NextResponse } from "next/server";

const SERVICE_IDS: Record<string, string> = {
  MTN: "mtn",
  Glo: "glo",
  Airtel: "airtel",
  "9mobile": "etisalat",
};

export async function POST(req: NextRequest) {
  const { network, phone, amount } = (await req.json()) as {
    network: string;
    phone: string;
    amount: number;
  };

  const apiKey = process.env.VTPASS_API_KEY;
  const secretKey = process.env.VTPASS_SECRET_KEY;
  const baseUrl = process.env.VTPASS_BASE_URL ?? "https://sandbox.vtpass.com";
  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { error: "VTpass credentials are not configured on the server." },
      { status: 500 }
    );
  }

  const serviceID = SERVICE_IDS[network];
  if (!serviceID) {
    return NextResponse.json({ error: `Unsupported network: ${network}` }, { status: 400 });
  }
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Enter a valid recipient phone number." }, { status: 400 });
  }
  if (!amount || amount < 50) {
    return NextResponse.json({ error: "Amount must be at least ₦50." }, { status: 400 });
  }

  const requestId = `TEN${Date.now()}`;

  let raw: string;
  try {
    const upstream = await fetch(`${baseUrl}/api/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "secret-key": secretKey,
      },
      body: JSON.stringify({
        request_id: requestId,
        serviceID,
        amount,
        phone,
      }),
    });
    raw = await upstream.text();
  } catch {
    return NextResponse.json(
      { error: "Could not reach VTpass. Check your connection and try again." },
      { status: 502 }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "VTpass returned an unexpected response.", raw },
      { status: 502 }
    );
  }

  const code = typeof data.code === "string" ? data.code : undefined;
  const description =
    typeof data.response_description === "string" ? data.response_description : undefined;

  if (code !== "000") {
    return NextResponse.json(
      { error: description ?? `VTpass error (code ${code ?? "unknown"}).`, raw: data },
      { status: 400 }
    );
  }

  const content = data.content as Record<string, unknown> | undefined;
  const transactions = content?.transactions as Record<string, unknown> | undefined;

  return NextResponse.json({
    reference: String(transactions?.transactionId ?? requestId),
    status: description ?? "TRANSACTION SUCCESSFUL",
    raw: data,
  });
}
