"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Copy, Search, ShieldCheck } from "lucide-react";
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

export function RetrievalFlow({ service }: Props) {
  const isBvn = service.slug === "bvn-retrieval";
  const [retrievalType, setRetrievalType] = useState<"bvn_phone" | "nin_phone">(isBvn ? "bvn_phone" : "nin_phone");
  const [query, setQuery] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { balance, refresh } = useWallet();
  const price = retrievalType === "bvn_phone" ? 300 : 350;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const clean = query.trim().replace(/[\s-]/g, "");
    if (!/^0\d{10}$/.test(clean)) {
      setError("Enter a valid 11-digit Nigerian mobile number starting with 0.");
      return;
    }
    if (!consent) {
      setError("Please confirm customer consent before searching.");
      return;
    }
    if (balance !== null && balance < price) {
      setError(`Insufficient wallet balance. You need at least ${formatNaira(price)}.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/verify/retrieval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: retrievalType,
          query: clean,
          consent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Retrieval failed.");
      }

      setResult(data);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyText = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const retrievedData = result?.data;
  const targetId = retrievedData?.bvn || retrievedData?.nin;

  return (
    <>
      <Topbar title={service.name} subtitle={service.description} />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Service Switcher Tabs */}
          <div className="flex rounded-xl bg-surface-raised p-1 border border-border">
            <button
              type="button"
              onClick={() => {
                setRetrievalType("bvn_phone");
                setResult(null);
                setError("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all ${
                retrievalType === "bvn_phone"
                  ? "bg-surface text-ink shadow-sm dark:bg-canvas"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              BVN Retrieval (Phone)
            </button>
            <button
              type="button"
              onClick={() => {
                setRetrievalType("nin_phone");
                setResult(null);
                setError("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all ${
                retrievalType === "nin_phone"
                  ? "bg-surface text-ink shadow-sm dark:bg-canvas"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              NIN Retrieval (Phone)
            </button>
          </div>

          {/* Search Card */}
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-ink">
                  Customer Mobile Phone Number
                </label>
                <div className="mt-2 relative">
                  <input
                    type="tel"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. 08012345678"
                    maxLength={11}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <div className="absolute right-3 top-3.5 text-ink-faint">
                    <Search size={18} />
                  </div>
                </div>
                <p className="mt-1.5 text-[12px] text-ink-faint">
                  Enter the phone number registered when the {retrievalType === "bvn_phone" ? "BVN" : "NIN"} was enrolled.
                </p>
              </div>

              {/* Price summary */}
              <div className="rounded-xl bg-surface-raised p-4 flex items-center justify-between border border-border">
                <span className="text-sm text-ink-muted">Service Fee</span>
                <span className="font-semibold text-ink">{formatNaira(price)}</span>
              </div>

              {/* Consent check */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-[12.5px] leading-snug text-ink-muted">
                  I confirm that the applicant has granted lawful consent to retrieve their identity records in accordance with the NDPR.
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-[13px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={busy} className="w-full" size="lg">
                {busy ? "Retrieving..." : `Search & Retrieve (${formatNaira(price)})`}
              </Button>
            </form>
          </Card>

          {/* Results display */}
          {retrievedData && (
            <Card className="overflow-hidden border-accent/30 p-6 sm:p-8 animate-fade-in bg-surface">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <Badge tone="success" className="mb-2">Match Found</Badge>
                  <h3 className="text-lg font-semibold text-ink">
                    {[retrievedData.firstname, retrievedData.middlename, retrievedData.surname || retrievedData.lastname]
                      .filter(Boolean)
                      .join(" ")}
                  </h3>
                  <p className="text-xs text-ink-faint">Ref: {result.reference}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={16} /> Verified
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
                <div className="rounded-xl bg-surface-raised p-3.5 border border-border">
                  <p className="text-xs text-ink-faint uppercase font-medium">
                    {retrievalType === "bvn_phone" ? "Bank Verification Number (BVN)" : "National Identification Number (NIN)"}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-mono text-base font-bold text-ink">{targetId}</p>
                    <button
                      type="button"
                      onClick={() => targetId && copyText(String(targetId))}
                      className="text-accent hover:opacity-80 p-1"
                      title="Copy Number"
                    >
                      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-raised p-3.5 border border-border">
                  <p className="text-xs text-ink-faint uppercase font-medium">Linked Phone</p>
                  <p className="mt-1 font-mono text-ink font-semibold">
                    {retrievedData.telephoneno || retrievedData.phone || query}
                  </p>
                </div>

                {retrievedData.birthdate || retrievedData.dob ? (
                  <div className="rounded-xl bg-surface-raised p-3.5 border border-border">
                    <p className="text-xs text-ink-faint uppercase font-medium">Date of Birth</p>
                    <p className="mt-1 text-ink font-medium">{retrievedData.birthdate || retrievedData.dob}</p>
                  </div>
                ) : null}

                {retrievedData.gender ? (
                  <div className="rounded-xl bg-surface-raised p-3.5 border border-border">
                    <p className="text-xs text-ink-faint uppercase font-medium">Gender</p>
                    <p className="mt-1 text-ink font-medium">{retrievedData.gender}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" size="sm" onClick={() => setResult(null)}>
                  New Search
                </Button>
                <Button as={Link} href={retrievalType === "bvn_phone" ? "/verify/bvn" : "/verify/nin"} size="sm">
                  Run Full Verification
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
