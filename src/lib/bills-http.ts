import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { BillError } from "@/lib/bills";
import { ProviderUnavailableError, ProviderUnknownOutcomeError } from "@/lib/bill-providers/types";

/** Returns the signed-in user, or a 401 response to return straight away. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  return { user, error: null };
}

/** Maps any failure to a safe response. Provider details are logged, never sent to the browser. */
export function billsError(err: unknown) {
  if (err instanceof BillError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof ProviderUnavailableError) {
    console.error("[bills] provider unavailable:", err.message);
    return NextResponse.json({ error: "The bill provider is not responding. Try again shortly." }, { status: 503 });
  }
  if (err instanceof ProviderUnknownOutcomeError) {
    console.error("[bills] provider outcome unknown:", err.message);
    return NextResponse.json({ error: "The bill provider is not responding. Try again shortly." }, { status: 504 });
  }
  console.error("[bills] unexpected:", err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export const KINDS = ["airtime", "data", "electricity", "cable"] as const;
export type Kind = (typeof KINDS)[number];

export function parseKind(value: unknown): Kind | null {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value) ? (value as Kind) : null;
}
