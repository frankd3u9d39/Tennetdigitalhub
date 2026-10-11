"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Download, Printer, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ServiceIcon } from "@/lib/icons";
import { formatNaira } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { SLIP_TIERS, type IdentityType, type SlipTier } from "@/lib/identity-prices";
import { usePricing } from "@/lib/use-pricing";
import type { ServiceItem } from "@/lib/types";

interface IdentityResult {
  reference: string;
  type: IdentityType;
  idNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  photo: string | null;
  costNaira: number;
}

// Pick a MIME type from the image's first bytes so the browser renders it correctly.
function photoSrc(b64: string) {
  const mime = b64.startsWith("iVBOR") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${b64}`;
}

interface SlipResponse {
  filename: string;
  pdfBase64: string;
  costNaira: number;
  reference: string;
}

// The PDF lives only in this browser tab's memory (never uploaded or stored by us).
function pdfBlobUrl(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

function saveFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function IdentityFlow({ service }: { service: ServiceItem }) {
  const type: IdentityType = service.slug === "bvn" ? "bvn" : "nin";
  const pricing = usePricing();
  // null until the live price has loaded: the form stays disabled rather than guessing a price.
  const price = pricing?.identity[type] ?? null;
  const slipPrice = (t: SlipTier) => pricing?.slips[type][t] ?? null;
  const serviceOn = pricing ? pricing.services[type] : true;
  const label = type.toUpperCase();
  const { balance, refresh } = useWallet();

  const [number, setNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<IdentityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Optional paid step after a lookup: the official PDF slip.
  const [tier, setTier] = useState<SlipTier>("standard");
  const [slipPhase, setSlipPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [slipError, setSlipError] = useState("");
  const [slip, setSlip] = useState<{ url: string; filename: string; costNaira: number } | null>(null);
  // The number that was actually looked up: the slip must be for THIS number even if the input box is edited afterwards.
  const [lookedUp, setLookedUp] = useState("");

  const digits = number.replace(/\D/g, "");
  const insufficientBalance = price !== null && price > balance;
  const canSubmit = phase !== "loading" && price !== null && serviceOn && digits.length === 11 && consent && !insufficientBalance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPhase("loading");
    setErrorMessage("");
    setResult(null);
    clearSlip();
    setLookedUp("");
    try {
      const res = await fetch("/api/verify/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, number: digits, consent, expectedPrice: price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setResult(data as IdentityResult);
      setLookedUp(digits);
      setPhase("done");
    } catch (err) {
      // A dropped connection could mean the lookup ran: don't promise a refund we can't see.
      setErrorMessage(
        err instanceof TypeError
          ? "We lost the connection and couldn't confirm the result. Check your wallet history before trying again."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
      setPhase("error");
    } finally {
      await refresh();
    }
  }

  async function handleSlip() {
    const sp = slipPrice(tier);
    if (slipPhase === "loading" || phase !== "done" || !lookedUp || sp === null || sp > balance) return;
    setSlipPhase("loading");
    setSlipError("");
    try {
      const res = await fetch("/api/verify/slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, number: lookedUp, consent, tier, expectedPrice: slipPrice(tier) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the slip.");
      const file = data as SlipResponse;
      const url = pdfBlobUrl(file.pdfBase64);
      setSlip({ url, filename: file.filename, costNaira: file.costNaira });
      setSlipPhase("done");
      saveFile(url, file.filename);
    } catch (err) {
      setSlipError(
        err instanceof TypeError
          ? "We lost the connection and couldn't confirm the slip. Check your wallet history before trying again."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
      setSlipPhase("error");
    } finally {
      await refresh();
    }
  }

  function clearSlip() {
    if (slip) URL.revokeObjectURL(slip.url);
    setSlip(null);
    setSlipPhase("idle");
    setSlipError("");
  }

  function handleNew() {
    // Clear personal data from the screen.
    clearSlip();
    setLookedUp("");
    setNumber("");
    setConsent(false);
    setResult(null);
    setErrorMessage("");
    setPhase("idle");
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
                <p className="text-[12.5px] text-ink-faint">Live registry lookup</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Wallet balance</p>
                <p className="mt-1 font-mono text-[14px] text-ink">{formatNaira(balance)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Cost</p>
                <p className="mt-1 font-mono text-[14px] text-ink">{price === null ? "—" : formatNaira(price)}</p>
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
              <div>
                <label htmlFor="idnumber" className="text-[12.5px] font-medium text-ink-muted">
                  {label} number
                </label>
                <input
                  id="idnumber"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Enter 11-digit number"
                  className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 font-mono text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                />
                <p className="mt-1.5 text-[12px] text-ink-faint">
                  If no record is found, or the check can&apos;t be completed, you are not charged.
                </p>
              </div>

              <label className="flex cursor-pointer gap-2.5 rounded-lg border border-border p-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="text-[12.5px] leading-relaxed text-ink-muted">
                  I confirm the person has given their consent for me to verify their {label}, and that I will use the result only
                  for this purpose.
                </span>
              </label>

              <Button type="submit" disabled={!canSubmit} className="w-full">
                {phase === "loading" ? "Verifying…" : price === null ? "Loading price…" : `Verify for ${formatNaira(price)}`}
              </Button>
            </form>

            <div className="mt-5 flex gap-2.5 rounded-xl border border-border bg-surface-raised p-3.5">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-ink-faint" />
              <p className="text-[12px] leading-relaxed text-ink-faint">
                Each check is logged with your account and a masked number. Results are shown once and not stored: only the name
                is kept in your history.
              </p>
            </div>
          </Card>

          {/* Result */}
          <Card className="p-6">
            {phase === "idle" && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink-faint">
                  <ServiceIcon icon={service.icon} size={20} strokeWidth={1.6} />
                </div>
                <p className="mt-4 text-[14px] font-medium text-ink">Nothing submitted yet</p>
                <p className="mt-1 max-w-xs text-[13px] text-ink-faint">Enter a number and confirm consent to see the result here.</p>
              </div>
            )}

            {phase === "loading" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 animate-shimmer rounded" />
                  <div className="h-6 w-20 animate-shimmer rounded-full" />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                  <div className="h-14 w-14 shrink-0 animate-shimmer rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-shimmer rounded" />
                    <div className="h-3 w-28 animate-shimmer rounded" />
                  </div>
                </div>
                <p className="text-[12.5px] text-ink-faint">Checking the registry. This can take up to a minute. Please don&apos;t close this page.</p>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle size={20} strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-[14px] font-medium text-ink">Verification not completed</p>
                <p className="mt-1 max-w-xs text-[13px] text-ink-faint">{errorMessage}</p>
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPhase("idle")}>
                    Back to form
                  </Button>
                  <Button variant="ghost" size="sm" as={Link} href="/wallet">
                    Wallet history
                  </Button>
                </div>
              </div>
            )}

            {phase === "done" && result && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Verification result</p>
                  <Badge tone="success">
                    <BadgeCheck size={11} />
                    Match found
                  </Badge>
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-border p-4">
                  {result.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoSrc(result.photo)} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[18px] text-accent-soft-ink">
                      {initialsOf(result.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-ink">{result.fullName || "—"}</p>
                    <p className="text-[12.5px] text-ink-faint">{result.gender || "—"}</p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5 sm:grid-cols-3">
                  {[
                    { label: "Date of birth", value: result.dateOfBirth || "—" },
                    { label: "Phone", value: result.phone || "—" },
                    { label: `${label} (masked)`, value: result.idNumber },
                    { label: "Reference", value: result.reference },
                    { label: "Cost", value: formatNaira(result.costNaira) },
                  ].map((field) => (
                    <div key={field.label}>
                      <dt className="text-[11px] text-ink-faint">{field.label}</dt>
                      <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">{field.value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Official PDF slip: a second, separately charged step. */}
                <div className="mt-5 rounded-xl border border-border p-4">
                  <p className="text-[13px] font-medium text-ink">Need the official PDF slip?</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                    Charged separately. If it can&apos;t be generated you are not charged.
                  </p>

                  {slipPhase !== "done" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex gap-1.5">
                        {SLIP_TIERS.map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setTier(t)}
                            disabled={slipPhase === "loading"}
                            className={
                              "rounded-lg border px-3 py-1.5 text-[12.5px] capitalize transition-colors " +
                              (tier === t
                                ? "border-accent bg-accent-soft text-accent-soft-ink"
                                : "border-border text-ink-muted hover:border-border-strong hover:text-ink")
                            }
                          >
                            {t} · {slipPrice(t) === null ? "—" : formatNaira(slipPrice(t)!)}
                          </button>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSlip}
                        disabled={slipPhase === "loading" || slipPrice(tier) === null || slipPrice(tier)! > balance}
                      >
                        <Download size={14} />
                        {slipPhase === "loading" ? "Generating…" : "Get PDF slip"}
                      </Button>
                    </div>
                  )}

                  {slipPrice(tier) !== null && slipPrice(tier)! > balance && slipPhase !== "done" && (
                    <p className="mt-2 text-[12px] text-danger">
                      Insufficient wallet balance.{" "}
                      <Link href="/wallet" className="underline">
                        Fund your wallet
                      </Link>
                    </p>
                  )}
                  {slipPhase === "error" && <p className="mt-2 text-[12px] text-danger">{slipError}</p>}

                  {slipPhase === "done" && slip && (
                    <div className="mt-3">
                      <p className="text-[12.5px] text-accent-soft-ink">
                        Slip ready ({formatNaira(slip.costNaira)}). It should have downloaded to your device.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => saveFile(slip.url, slip.filename)}>
                          <Download size={14} />
                          Download again
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => window.open(slip.url, "_blank")}>
                          <Printer size={14} />
                          Open to print
                        </Button>
                      </div>
                      <p className="mt-2 text-[11.5px] text-ink-faint">
                        We don&apos;t keep a copy. Save it now: it disappears when you start a new lookup or leave this page.
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-5 border-t border-border pt-4 text-[12px] leading-relaxed text-ink-faint">
                  This is personal data. Don&apos;t share it beyond what the person agreed to. These details are not saved, so copy what
                  you need before you start a new lookup.
                </p>

                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleNew}>
                    New lookup
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
