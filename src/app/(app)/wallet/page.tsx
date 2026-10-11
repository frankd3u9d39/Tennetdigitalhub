"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Lock, Plus } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira, formatDate } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

export default function WalletPage() {
  const { balance, ledger, loading } = useWallet();
  const [showFundForm, setShowFundForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState("");

  const amountValue = Number(amount);
  const validAmount = Number.isInteger(amountValue) && amountValue >= 100 && amountValue <= 1_000_000;

  async function handleFund(e: React.FormEvent) {
    e.preventDefault();
    if (!validAmount || funding) return;
    setFunding(true);
    setFundError("");
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNaira: amountValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the payment.");
      // Hand over to Paystack's secure checkout. The wallet is credited only after Paystack confirms payment.
      window.location.assign(data.authorizationUrl);
    } catch (err) {
      setFundError(err instanceof Error ? err.message : "Could not start the payment.");
      setFunding(false);
    }
  }

  return (
    <>
      <Topbar title="Wallet" subtitle="Fund your balance and review your ledger" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-3">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">
              Available balance
            </p>
            <p className="mt-2 font-display text-[36px] tracking-tight text-ink font-feature-tab">
              {formatNaira(balance)}
            </p>
            <div className="mt-5 flex gap-2">
              <Button size="sm" onClick={() => setShowFundForm((v) => !v)}>
                <Plus size={14} />
                Fund wallet
              </Button>
              <Button variant="secondary" size="sm">
                Withdraw
              </Button>
            </div>

            {showFundForm && (
              <form
                onSubmit={handleFund}
                className="mt-5 space-y-3 rounded-xl border border-border bg-surface-raised p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[160px] flex-1">
                    <label htmlFor="fund-amount" className="text-[12px] font-medium text-ink-muted">
                      Amount to add (₦100 – ₦1,000,000)
                    </label>
                    <input
                      id="fund-amount"
                      autoFocus
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="5000"
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2 font-mono text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={funding || !validAmount}>
                    {funding ? "Redirecting…" : validAmount ? `Pay ${formatNaira(amountValue)} with Paystack` : "Enter an amount"}
                  </Button>
                </div>
                {fundError && (
                  <div className="flex gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
                    <p className="text-[12px] leading-relaxed text-danger">{fundError}</p>
                  </div>
                )}
                <p className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                  <Lock size={11} /> You&apos;ll pay on Paystack&apos;s secure page by card, bank transfer or USSD. Your wallet is credited
                  once the payment is confirmed.
                </p>
              </form>
            )}
          </Card>
        </div>

        <div>
          <h2 className="text-[15px] font-medium text-ink">Ledger</h2>
          <Card className="mt-4 divide-y divide-border p-0">
            {loading && (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                Loading ledger…
              </div>
            )}
            {!loading && ledger.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                No transactions yet.
              </div>
            )}
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                      (entry.direction === "credit"
                        ? "bg-accent-soft text-accent-soft-ink"
                        : "bg-surface-raised text-ink-muted")
                    }
                  >
                    {entry.direction === "credit" ? (
                      <ArrowDownLeft size={15} />
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {entry.label}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-faint">
                      {entry.detail}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {entry.status === "pending" && <Badge tone="warning">Processing</Badge>}
                  {entry.status === "failed" && <Badge tone="danger">Failed</Badge>}
                  <div className="text-right">
                    <p
                      className={
                        "font-mono text-[13.5px] " +
                        (entry.direction === "credit" ? "text-accent-soft-ink" : "text-ink")
                      }
                    >
                      {entry.direction === "credit" ? "+" : "-"}
                      {formatNaira(entry.amount)}
                    </p>
                    <p className="text-[11.5px] text-ink-faint">
                      {formatDate(entry.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </main>
    </>
  );
}
