import { NextRequest, NextResponse } from "next/server";

const NETWORK_CODES: Record<string, string> = {
  MTN: "01",
  Glo: "02",
  "9mobile": "03",
  Airtel: "04",
};

export async function POST(req: NextRequest) {
  const { network, phone, amount } = (await req.json()) as {
    network: string;
    phone: string;
    amount: number;
  };

  const userId = process.env.CLUBKONNECT_USER_ID;
  const apiKey = process.env.CLUBKONNECT_API_KEY;
  if (!userId || !apiKey) {
    return NextResponse.json(
      { error: "ClubKonnect credentials are not configured on the server." },
      { status: 500 }
    );
  }

  const networkCode = NETWORK_CODES[network];
  if (!networkCode) {
    return NextResponse.json({ error: `Unsupported network: ${network}` }, { status: 400 });
  }
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Enter a valid recipient phone number." }, { status: 400 });
  }
  if (!amount || amount < 50) {
    return NextResponse.json({ error: "Amount must be at least ₦50." }, { status: 400 });
  }

  const url = new URL("https://www.nellobytesystems.com/APIAirtimeV1.asp");
  url.searchParams.set("UserID", userId);
  url.searchParams.set("APIKey", apiKey);
  url.searchParams.set("MobileNetwork", networkCode);
  url.searchParams.set("Amount", String(amount));
  url.searchParams.set("MobileNumber", phone);
  url.searchParams.set("CallBackURL", "https://example.com/vtu-callback");
  url.searchParams.set("RequestID", `TEN-${Date.now()}`);

  let raw: string;
  try {
    const upstream = await fetch(url.toString(), { method: "GET" });
    raw = await upstream.text();
  } catch {
    return NextResponse.json(
      { error: "Could not reach ClubKonnect. Check your connection and try again." },
      { status: 502 }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "ClubKonnect returned an unexpected response.", raw },
      { status: 502 }
    );
  }

  const status = typeof data.status === "string" ? data.status : undefined;
  const ok = status === "ORDER_RECEIVED" || data.statuscode === "100";

  if (!ok) {
    return NextResponse.json(
      { error: status ?? "Transaction failed.", raw: data },
      { status: 400 }
    );
  }

  return NextResponse.json({
    reference: String(data.orderid ?? `TEN-${Date.now()}`),
    status,
    raw: data,
  });
}
