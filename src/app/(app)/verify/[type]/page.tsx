"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Download,
  ShieldCheck,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ServiceIcon } from "@/lib/icons";
import { services, vtuConfig } from "@/lib/mock-data";
import { requestProvider, verificationProvider, vtuProvider } from "@/lib/providers";
import { formatNaira } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import type { LookupResult, RequestResult, VtuResult } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

export default function VerifyPage() {
  const params = useParams<{ type: string }>();
  const service = services.find((s) => s.slug === params.type);

  if (!service) {
    notFound();
  }

  const vtu = service.flow === "vtu" ? vtuConfig[service.slug] : undefined;
  const { balance, spend } = useWallet();

  // Shared status state
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Lookup flow state
  const [query, setQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // VTU flow state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [provider, setProvider] = useState("");
  const [vtuResult, setVtuResult] = useState<VtuResult | null>(null);

  // Request flow state
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null);

  const digitsOnly = query.replace(/\D/g, "");
  const recipientDigits = recipient.replace(/\D/g, "");

  const cost = service.flow === "vtu" ? amount ?? 0 : service.price;
  const insufficientBalance = cost > 0 && cost > balance;

  const canSubmit =
    status !== "loading" &&
    !insufficientBalance &&
    (service.flow === "lookup"
      ? digitsOnly.length === 11
      : service.flow === "vtu"
        ? recipientDigits.length >= 10 &&
          !!amount &&
          (!vtu?.providers || !!provider)
        : fullName.trim().length >= 3 && contact.trim().length >= 7);

  function resetResults() {
    setLookupResult(null);
    setVtuResult(null);
    setRequestResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      if (service!.flow === "lookup") {
        const data = await verificationProvider.lookup(digitsOnly);
        setLookupResult(data);
        await spend(cost, service!.name, `Lookup for •••••••${digitsOnly.slice(-4)}`);
        await fetch("/api/verifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: service!.slug === "nin" ? "NIN" : "BVN",
            queried: `•••••••${digitsOnly.slice(-4)}`,
            subjectName: data.fullName,
            status: "successful",
            cost,
          }),
        });
      } else if (service!.flow === "vtu") {
        const data = await vtuProvider.purchase({
          slug: service!.slug,
          recipient,
          amount: amount ?? 0,
          provider: provider || undefined,
        });
        setVtuResult(data);
        await spend(data.amount, service!.name, `${data.provider} · ${data.recipient}`);
      } else {
        const data = await requestProvider.submit({
          slug: service!.slug,
          fullName,
        });
        setRequestResult(data);
        await spend(cost, service!.name, `Request ${data.reference}`);
      }
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function handleNew() {
    setStatus("idle");
    setQuery("");
    setRecipient("");
    setAmount(null);
    setProvider("");
    setFullName("");
    setContact("");
    setNotes("");
    resetResults();
  }

  return (
    <>
      <Topbar title={service.name} subtitle={service.description} />
      <main className="flex-1 p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Form */}
          <Card className="h-fit p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-ink">
                <ServiceIcon icon={service.icon} size={18} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-ink">{service.name}</p>
                <p className="text-[12.5px] text-ink-faint">Sandbox flow</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">
                  Wallet balance
                </p>
                <p className="mt-1 font-mono text-[14px] text-ink">
                  {formatNaira(balance)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">
                  {service.flow === "vtu" ? "Amount" : "Cost"}
                </p>
                <p className="mt-1 font-mono text-[14px] text-ink">
                  {cost > 0 ? formatNaira(cost) : "—"}
                </p>
              </div>
            </div>

            {insufficientBalance && (
              <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-danger-soft bg-danger-soft px-3.5 py-2.5">
                <AlertTriangle size={14} className="shrink-0 text-danger" />
                <p className="text-[12.5px] text-danger">
                  Insufficient wallet balance.{" "}
                  <Link href="/wallet" className="font-medium underline">
                    Fund your wallet
                  </Link>{" "}
                  to continue.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {service.flow === "vtu" && vtu?.providers && (
                <div>
                  <label
                    htmlFor="provider"
                    className="text-[12.5px] font-medium text-ink-muted"
                  >
                    Network provider
                  </label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
                  >
                    <option value="">Select provider</option>
                    {vtu.providers.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {service.flow === "lookup" && (
                <div>
                  <label htmlFor="query" className="text-[12.5px] font-medium text-ink-muted">
                    Reference number
                  </label>
                  <input
                    id="query"
                    inputMode="numeric"
                    maxLength={11}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter 11-digit number"
                    className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 font-mono text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                  />
                  <p className="mt-1.5 text-[12px] text-ink-faint">
                    Try any 11-digit number. One ending in 0000 simulates a decline.
                  </p>
                </div>
              )}

              {service.flow === "vtu" && vtu && (
                <>
                  <div>
                    <label htmlFor="recipient" className="text-[12.5px] font-medium text-ink-muted">
                      {vtu.recipientLabel}
                    </label>
                    <input
                      id="recipient"
                      inputMode="numeric"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder={vtu.recipientPlaceholder}
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 font-mono text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>

                  {vtu.mode === "amount" && vtu.presetAmounts && (
                    <div>
                      <p className="text-[12.5px] font-medium text-ink-muted">Amount</p>
                      <div className="mt-1.5 grid grid-cols-3 gap-2">
                        {vtu.presetAmounts.map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => setAmount(preset)}
                            className={
                              "rounded-lg border px-3 py-2 font-mono text-[13px] transition-colors " +
                              (amount === preset
                                ? "border-accent bg-accent-soft text-accent-soft-ink"
                                : "border-border text-ink-muted hover:border-border-strong hover:text-ink")
                            }
                          >
                            {formatNaira(preset)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {vtu.mode === "plan" && vtu.plans && (
                    <div>
                      <p className="text-[12.5px] font-medium text-ink-muted">Plan</p>
                      <div className="mt-1.5 space-y-2">
                        {vtu.plans.map((plan) => (
                          <button
                            type="button"
                            key={plan.label}
                            onClick={() => setAmount(plan.price)}
                            className={
                              "flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition-colors " +
                              (amount === plan.price
                                ? "border-accent bg-accent-soft text-accent-soft-ink"
                                : "border-border text-ink-muted hover:border-border-strong hover:text-ink")
                            }
                          >
                            <span>{plan.label}</span>
                            <span className="font-mono">{formatNaira(plan.price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {service.flow === "request" && (
                <>
                  <div>
                    <label htmlFor="fullName" className="text-[12.5px] font-medium text-ink-muted">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Applicant's full name"
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact" className="text-[12.5px] font-medium text-ink-muted">
                      Phone or email
                    </label>
                    <input
                      id="contact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="For status updates"
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="notes" className="text-[12.5px] font-medium text-ink-muted">
                      Notes <span className="text-ink-faint">(optional)</span>
                    </label>
                    <textarea
                      id="notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional detail for this request"
                      className="mt-1.5 w-full resize-none rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>
                </>
              )}

              <Button type="submit" disabled={!canSubmit} className="w-full">
                {status === "loading"
                  ? "Processing…"
                  : service.flow === "vtu"
                    ? amount
                      ? `Pay ${formatNaira(amount)}`
                      : "Select an amount"
                    : service.flow === "request"
                      ? `Submit for ${formatNaira(service.price)}`
                      : `Verify for ${formatNaira(service.price)}`}
              </Button>
            </form>

            <div className="mt-5 flex gap-2.5 rounded-xl border border-border bg-surface-raised p-3.5">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-ink-faint" />
              <p className="text-[12px] leading-relaxed text-ink-faint">
                This request is logged to your history with your agent ID and
                timestamp for audit purposes.
              </p>
            </div>
          </Card>

          {/* Result panel */}
          <Card className="p-6">
            {status === "idle" && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink-faint">
                  <ServiceIcon icon={service.icon} size={20} strokeWidth={1.6} />
                </div>
                <p className="mt-4 text-[14px] font-medium text-ink">Nothing submitted yet</p>
                <p className="mt-1 max-w-xs text-[13px] text-ink-faint">
                  Fill in the form and submit to see a structured result here.
                </p>
              </div>
            )}

            {status === "loading" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 animate-shimmer rounded" />
                  <div className="h-6 w-20 animate-shimmer rounded-full" />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                  <div className="h-11 w-11 shrink-0 animate-shimmer rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-shimmer rounded" />
                    <div className="h-3 w-28 animate-shimmer rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-20 animate-shimmer rounded" />
                      <div className="h-3.5 w-28 animate-shimmer rounded" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle size={20} strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-[14px] font-medium text-ink">Something went wrong</p>
                <p className="mt-1 max-w-xs text-[13px] text-ink-faint">{errorMessage}</p>
              </div>
            )}

            {status === "success" && service.flow === "lookup" && lookupResult && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Verification result
                  </p>
                  <Badge tone="success">
                    <BadgeCheck size={11} />
                    Match found
                  </Badge>
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-border p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[18px] text-accent-soft-ink">
                    {lookupResult.photoInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-ink">
                      {lookupResult.fullName}
                    </p>
                    <p className="text-[12.5px] text-ink-faint">
                      {lookupResult.gender} · {lookupResult.stateOfOrigin} State
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5 sm:grid-cols-3">
                  {[
                    { label: "Date of birth", value: lookupResult.dateOfBirth },
                    { label: "Phone", value: lookupResult.phone },
                    { label: "State of origin", value: lookupResult.stateOfOrigin },
                    { label: "LGA of origin", value: lookupResult.lgaOfOrigin },
                    { label: "Tracking ID", value: lookupResult.trackingId },
                    { label: "Cost", value: formatNaira(service.price) },
                  ].map((field) => (
                    <div key={field.label}>
                      <dt className="text-[11px] text-ink-faint">{field.label}</dt>
                      <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex gap-2 border-t border-border pt-5">
                  <Button variant="secondary" size="sm">
                    <Download size={14} />
                    Download slip
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNew}>
                    New lookup
                  </Button>
                </div>
              </div>
            )}

            {status === "success" && service.flow === "vtu" && vtuResult && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Purchase result
                  </p>
                  <Badge tone="success">
                    <BadgeCheck size={11} />
                    Purchase complete
                  </Badge>
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-border p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                    <ServiceIcon icon={service.icon} size={22} strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-ink">
                      {formatNaira(vtuResult.amount)}
                    </p>
                    <p className="text-[12.5px] text-ink-faint">
                      {vtuResult.provider} · {vtuResult.recipient}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5">
                  <div>
                    <dt className="text-[11px] text-ink-faint">Reference</dt>
                    <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">
                      {vtuResult.reference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-faint">Provider</dt>
                    <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">
                      {vtuResult.provider}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex gap-2 border-t border-border pt-5">
                  <Button variant="secondary" size="sm">
                    <Download size={14} />
                    Download receipt
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNew}>
                    New purchase
                  </Button>
                </div>
              </div>
            )}

            {status === "success" && service.flow === "request" && requestResult && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Request result
                  </p>
                  <Badge tone="success">
                    <BadgeCheck size={11} />
                    Request received
                  </Badge>
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-border p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                    <Clock size={20} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-ink">
                      {requestResult.status}
                    </p>
                    <p className="text-[12.5px] text-ink-faint">
                      Estimated turnaround: {requestResult.eta}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5">
                  <div>
                    <dt className="text-[11px] text-ink-faint">Reference</dt>
                    <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">
                      {requestResult.reference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-faint">Fee charged</dt>
                    <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">
                      {formatNaira(service.price)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-5 border-t border-border pt-5 text-[12.5px] leading-relaxed text-ink-faint">
                  We&apos;ll notify {contact || "your registered contact"} once this request
                  is resolved. You can track its progress from your history.
                </p>

                <div className="mt-5 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleNew}>
                    Submit another
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
