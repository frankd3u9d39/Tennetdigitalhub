import { NextResponse } from "next/server";
import { getAccountSnapshot } from "@/lib/db";

export async function GET() {
  try {
    const snapshot = await getAccountSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load account." },
      { status: 500 }
    );
  }
}
