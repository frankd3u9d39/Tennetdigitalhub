"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, GraduationCap, Receipt } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import type { ServiceItem } from "@/lib/types";

interface Props {
  service: ServiceItem;
}

const EXAM_OPTIONS = [
  { id: 1, name: "WAEC Result Checker PIN", price: 3900, desc: "West African Senior School Certificate Examination" },
  { id: 2, name: "NECO Result Token", price: 1500, desc: "National Examinations Council result verification token" },
  { id: 3, name: "NABTEB Scratch Card", price: 1500, desc: "National Business and Technical Examinations Board" },
];

export function ExamPinFlow({ service }: Props) {
  const [providerId, setProviderId] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { balance, refresh } = useWallet();
  const selected = EXAM_OPTIONS.find((e) => e.id === providerId)!;
  const totalCost = selected.price * quantity;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (balance !== null && balance < totalCost) {
      setError(`Insufficient wallet balance. You need at least ${formatNaira(totalCost)}.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/bills/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, quantity }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Purchase failed.");
      }

      setResult(data);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purchase exam PIN.");
    } finally {
      setBusy(false);
    }
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Topbar title="Exam PIN Vending" subtitle="Generate instant WAEC, NECO, and NABTEB result checker tokens" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="p-6 sm:p-8">
            <form onSubmit={handlePurchase} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-2">Select Examination Body</label>
                <div className="space-y-2">
                  {EXAM_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setProviderId(opt.id);
                        setError("");
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                        providerId === opt.id
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border bg-surface hover:border-border-strong"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-accent">
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-ink">{opt.name}</p>
                          <p className="text-xs text-ink-muted">{opt.desc}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-accent">{formatNaira(opt.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1.5">Quantity</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value={1}>1 Token</option>
                  <option value={2}>2 Tokens</option>
                  <option value={3}>3 Tokens</option>
                  <option value={5}>5 Tokens</option>
                </select>
              </div>

              {/* Price summary */}
              <div className="rounded-xl bg-surface-raised p-4 flex items-center justify-between border border-border">
                <span className="text-sm text-ink-muted">Total Amount</span>
                <span className="text-base font-bold text-ink">{formatNaira(totalCost)}</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={busy} className="w-full" size="lg">
                {busy ? "Generating Token..." : `Purchase Now (${formatNaira(totalCost)})`}
              </Button>
            </form>
          </Card>

          {/* Results card */}
          {result && (
            <Card className="p-6 sm:p-8 border-accent/40 bg-surface animate-fade-in">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-ink">PIN Generated Instantly</h3>
                  <p className="text-xs text-ink-faint">Your exam token is ready for use</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-surface-raised p-5 border border-border">
                  <p className="text-xs font-semibold text-ink-faint uppercase">{result.exam} Token / PIN</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-xl font-bold tracking-wider text-accent">{result.pin}</span>
                    <button
                      type="button"
                      onClick={() => result.pin && copyPin(result.pin)}
                      className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy PIN"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 text-xs text-ink-muted">
                  <span>Reference:</span>
                  <span className="font-mono font-medium">{result.reference}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <Button size="sm" onClick={() => setResult(null)}>
                  Buy Another PIN
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
