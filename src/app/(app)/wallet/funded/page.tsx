"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BadgeCheck, Clock } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

type Outcome = { state: "checking" } | { state: "success" | "pending" | "failed"; amountNaira: number } | { state: "error"; message: string };

export default function FundedPage() {
  return (
    <Suspense fallback={null}>
      <FundedResult />
    </Suspense>
  );
}

// Paystack sends the customer back here after checkout. We confirm the payment with Paystack (server-side) before
// anything is credited; the page only displays what the server says.
function FundedResult() {
  const reference = useSearchParams().get("reference") ?? "";
  const { refresh } = useWallet();
  const [outcome, setOutcome] = useState<Outcome>({ state: "checking" });

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        try {
          const res = await fetch(`/api/wallet/fund/verify?reference=${encodeURIComponent(reference)}`);
          const data = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(data.error ?? "Could not confirm the payment.");
          if (data.status !== "pending") {
            setOutcome({ state: data.status, amountNaira: data.amountNaira });
            await refresh();
            return;
          }
          setOutcome({ state: "pending", amountNaira: data.amountNaira });
        } catch (err) {
          if (!cancelled) setOutcome({ state: "error", message: err instanceof Error ? err.message : "Could not confirm the payment." });
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference, refresh]);

  const shown: Outcome = reference ? outcome : { state: "error", message: "No payment reference was found." };

  return (
    <>
      <Topbar title="Wallet funding" subtitle="Confirming your payment with Paystack" />
      <main className="flex-1 p-6 lg:p-8">
        <Card className="mx-auto max-w-lg p-8 text-center">
          {shown.state === "checking" && (
            <>
              <div className="mx-auto h-12 w-12 animate-shimmer rounded-full" />
              <p className="mt-4 text-[14px] font-medium text-ink">Confirming your payment…</p>
              <p className="mt-1 text-[13px] text-ink-faint">This takes a few seconds. Please don&apos;t close this page.</p>
            </>
          )}

          {shown.state === "success" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                <BadgeCheck size={22} />
              </div>
              <div className="mt-3">
                <Badge tone="success">Payment confirmed</Badge>
              </div>
              <p className="mt-4 font-display text-[30px] text-ink">{formatNaira(shown.amountNaira)}</p>
              <p className="mt-1 text-[13px] text-ink-faint">has been added to your wallet.</p>
            </>
          )}

          {shown.state === "pending" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn">
                <Clock size={22} />
              </div>
              <p className="mt-4 text-[14px] font-medium text-ink">We haven&apos;t received this payment yet</p>
              <p className="mt-1 text-[13px] text-ink-faint">
                Bank transfers can take a few minutes. Your wallet is credited automatically as soon as Paystack confirms it, even
                if you leave this page. If you cancelled the payment, nothing was charged.
              </p>
            </>
          )}

          {(shown.state === "failed" || shown.state === "error") && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle size={22} />
              </div>
              <p className="mt-4 text-[14px] font-medium text-ink">
                {shown.state === "failed" ? "Payment not completed" : "We couldn't confirm your payment"}
              </p>
              <p className="mt-1 text-[13px] text-ink-faint">
                {shown.state === "error"
                  ? shown.message
                  : "No money was added to your wallet. If you were charged, it will be reversed by your bank."}
              </p>
            </>
          )}

          <div className="mt-6 flex justify-center gap-2">
            <Button as={Link} href="/wallet" size="sm">
              Back to wallet
            </Button>
            <Button as={Link} href="/dashboard" variant="ghost" size="sm">
              Dashboard
            </Button>
          </div>
        </Card>
      </main>
    </>
  );
}
