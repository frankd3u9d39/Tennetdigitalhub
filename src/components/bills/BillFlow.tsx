"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Check, Clock, Copy, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ServiceIcon } from "@/lib/icons";
import { formatNaira } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { usePricing } from "@/lib/use-pricing";
import { chargeFor, feeFor } from "@/lib/pricing";
import type { ServiceItem } from "@/lib/types";

type Kind = "airtime" | "data" | "electricity" | "cable";

const KIND_BY_SLUG: Record<string, Kind> = {
  airtime: "airtime",
  data: "data",
  bill: "electricity",
  "tv-cable": "cable",
};

const COPY: Record<Kind, { network: string; customer: string; placeholder: string; presets?: number[] }> = {
  airtime: { network: "Network", customer: "Phone number", placeholder: "080XXXXXXXX", presets: [100, 200, 500, 1000, 2000] },
  data: { network: "Network", customer: "Phone number", placeholder: "080XXXXXXXX" },
  electricity: { network: "Electricity company", customer: "Meter number", placeholder: "Enter meter number", presets: [1000, 2000, 5000, 10000] },
  cable: { network: "TV provider", customer: "Smartcard number", placeholder: "Enter smartcard number" },
};

interface Option {
  provider: string;
  network: string;
  label: string;
  variants?: string[];
}
interface Plan {
  code: string;
  name: string;
  priceNaira: number;
}
interface Verified {
  name?: string;
  provider: string;
  plans?: Plan[];
}
interface PayResponse {
  status: "successful" | "pending" | "failed";
  reference: string;
  message: string;
  token?: string;
  units?: string;
  provider?: string;
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent";

const digits = (s: string) => s.replace(/\D/g, "");
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

export function BillFlow({ service }: { service: ServiceItem }) {
  const kind = KIND_BY_SLUG[service.slug];
  const copy = COPY[kind];
  const { balance, refresh } = useWallet();
  const pricing = usePricing();

  // Networks / providers for this service, loaded from the server.
  const [options, setOptions] = useState<Option[] | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [optionKey, setOptionKey] = useState("");
  const [variant, setVariant] = useState("");

  // Data plans, cached per selection so "loading" can be derived rather than stored.
  const [plansFor, setPlansFor] = useState<{ key: string; plans: Plan[]; error?: string } | null>(null);
  const [planCode, setPlanCode] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  // Electricity / cable: the account must be verified before paying.
  const [verified, setVerified] = useState<Verified | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<PayResponse | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // ---- load networks ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bills/networks?kind=${kind}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Could not load options.");
        // Airtime/electricity are routed by the server, so show each network once.
        const seen = new Set<string>();
        const list = (data.options as Option[]).filter((o) => {
          if (kind === "data" || kind === "cable") return true;
          if (seen.has(o.network)) return false;
          seen.add(o.network);
          return true;
        });
        setOptions(list);
      } catch (err) {
        if (!cancelled) setOptionsError(err instanceof Error ? err.message : "Could not load options.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const option = options?.find((o) => `${o.provider}|${o.network}` === optionKey);
  const needsVariant = kind === "data" && (option?.variants?.length ?? 0) > 0;

  // ---- load data plans -------------------------------------------------------------------------
  const plansKey = kind === "data" && option && (!needsVariant || variant) ? `${option.provider}|${option.network}|${variant}` : "";
  useEffect(() => {
    if (!plansKey || !option) return;
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams({ provider: option.provider, network: option.network });
        if (variant) q.set("variant", variant);
        const res = await fetch(`/api/bills/plans?${q}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Could not load plans.");
        setPlansFor({ key: plansKey, plans: data.plans as Plan[] });
      } catch (err) {
        if (!cancelled) setPlansFor({ key: plansKey, plans: [], error: err instanceof Error ? err.message : "Could not load plans." });
      }
    })();
    return () => {
      cancelled = true;
    };
    // `option` and `variant` are captured in plansKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plansKey]);

  const plansLoading = Boolean(plansKey) && plansFor?.key !== plansKey;
  const dataPlans = plansFor?.key === plansKey ? plansFor.plans : [];
  const plansError = plansFor?.key === plansKey ? plansFor.error : undefined;

  // ---- price -----------------------------------------------------------------------------------
  const cablePlans = verified?.plans ?? [];
  const selectedPlan = kind === "data" ? dataPlans.find((p) => p.code === planCode) : kind === "cable" ? cablePlans.find((p) => p.code === planCode) : undefined;
  // Plan prices from the server already include the markup. For airtime/electricity the customer picks the amount and
  // the fee is added on top, using the same formula the server charges.
  const markup = pricing?.markup[kind];
  const faceAmount = kind === "airtime" || kind === "electricity" ? (amount ?? 0) : 0;
  const fee = markup && faceAmount > 0 ? feeFor(faceAmount, markup) : 0;
  const cost = kind === "airtime" || kind === "electricity" ? (markup && faceAmount > 0 ? chargeFor(faceAmount, markup) : 0) : (selectedPlan?.priceNaira ?? 0);
  const insufficientBalance = cost > 0 && cost > balance;

  const canVerify = (kind === "electricity" || kind === "cable") && !!option && digits(customerId).length >= 6 && digits(phone).length >= 10 && !verifying;

  const canSubmit =
    phase !== "loading" &&
    !insufficientBalance &&
    !!option &&
    cost >= (kind === "airtime" || kind === "electricity" ? 50 : 1) &&
    (kind === "airtime"
      ? digits(customerId).length >= 10
      : kind === "data"
        ? digits(customerId).length >= 10 && !!selectedPlan && (!needsVariant || !!variant)
        : !!verified && digits(phone).length >= 10 && (kind === "electricity" || !!selectedPlan));

  // ---- poll pending payments -------------------------------------------------------------------
  const pendingRef = result?.status === "pending" ? result.reference : null;
  useEffect(() => {
    if (!pendingRef) return;
    let polls = 0;
    const timer = setInterval(async () => {
      polls += 1;
      try {
        const res = await fetch(`/api/bills/status?reference=${encodeURIComponent(pendingRef)}`);
        if (res.ok) {
          const data = (await res.json()) as PayResponse;
          if (data.status !== "pending") {
            setResult(data);
            refresh();
          }
        }
      } catch {
        // keep trying
      }
      if (polls >= 20) clearInterval(timer);
    }, 8000);
    return () => clearInterval(timer);
  }, [pendingRef, refresh]);

  // ---- actions ---------------------------------------------------------------------------------
  function clearVerification() {
    setVerified(null);
    setVerifyError("");
    if (kind === "cable") setPlanCode("");
  }

  async function handleVerify() {
    if (!option || !canVerify) return;
    setVerifying(true);
    setVerifyError("");
    setVerified(null);
    try {
      const res = await fetch("/api/bills/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          network: option.network,
          customerId: digits(customerId),
          phone: digits(phone),
          ...(kind === "cable" ? { provider: option.provider } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not verify.");
      if (!data.valid) {
        setVerifyError(kind === "electricity" ? "We couldn't verify that meter number." : "We couldn't verify that smartcard number.");
      } else {
        setVerified({ name: data.name, provider: data.provider, plans: data.plans });
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Could not verify.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !option) return;
    setPhase("loading");
    setErrorMessage("");
    setResult(null);
    setPaidAmount(cost);
    try {
      const res = await fetch("/api/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          network: option.network,
          ...(variant ? { variant } : {}),
          ...(kind === "data" || kind === "cable" ? { provider: verified?.provider ?? option.provider, planCode } : {}),
          customerId: digits(customerId),
          ...(kind === "electricity" || kind === "cable" ? { phone: digits(phone) } : {}),
          // The server prices everything itself; this is only the amount wanted and the total the customer saw.
          ...(kind === "airtime" || kind === "electricity" ? { amountNaira: amount } : {}),
          expectedChargeNaira: cost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed.");
      setResult(data as PayResponse);
      setPhase("done");
      await refresh();
    } catch (err) {
      // If the request itself dropped, the payment may still have gone through: don't invite a blind retry.
      const dropped = err instanceof TypeError;
      setErrorMessage(
        dropped
          ? "We couldn't confirm whether this payment went through. Check your history before trying again."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
      setPhase("error");
      await refresh();
    }
  }

  function handleNew() {
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
    setCustomerId("");
    setPhone("");
    setAmount(null);
    setCustomAmount("");
    setPlanCode("");
    setCopied(false);
    clearVerification();
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; the token is visible to copy by hand
    }
  }

  const optionLabel = (o: Option) =>
    (kind === "data" || kind === "cable") && options && options.filter((x) => x.network === o.network).length > 1 ? `${o.label} (${titleCase(o.provider)})` : o.label;

  // ---- render ----------------------------------------------------------------------------------
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
                <p className="text-[12.5px] text-ink-faint">Paid from your wallet</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Wallet balance</p>
                <p className="mt-1 font-mono text-[14px] text-ink">{formatNaira(balance)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">Amount</p>
                <p className="mt-1 font-mono text-[14px] text-ink">{cost > 0 ? formatNaira(cost) : "—"}</p>
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
              {/* Network / provider */}
              <div>
                <label htmlFor="network" className="text-[12.5px] font-medium text-ink-muted">
                  {copy.network}
                </label>
                <select
                  id="network"
                  value={optionKey}
                  disabled={!options}
                  onChange={(e) => {
                    setOptionKey(e.target.value);
                    setVariant("");
                    setPlanCode("");
                    clearVerification();
                  }}
                  className={inputClass}
                >
                  <option value="">{options ? "Select one" : optionsError ? "Unavailable" : "Loading…"}</option>
                  {options?.map((o) => (
                    <option key={`${o.provider}|${o.network}`} value={`${o.provider}|${o.network}`}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </select>
                {optionsError && <p className="mt-1.5 text-[12px] text-danger">{optionsError}</p>}
              </div>

              {/* Data: plan family */}
              {needsVariant && (
                <div>
                  <label htmlFor="variant" className="text-[12.5px] font-medium text-ink-muted">
                    Plan type
                  </label>
                  <select
                    id="variant"
                    value={variant}
                    onChange={(e) => {
                      setVariant(e.target.value);
                      setPlanCode("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select plan type</option>
                    {option?.variants?.map((v) => (
                      <option key={v} value={v}>
                        {titleCase(v)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient */}
              <div>
                <label htmlFor="customer" className="text-[12.5px] font-medium text-ink-muted">
                  {copy.customer}
                </label>
                <input
                  id="customer"
                  inputMode="numeric"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    clearVerification();
                  }}
                  placeholder={copy.placeholder}
                  className={`${inputClass} font-mono`}
                />
              </div>

              {(kind === "electricity" || kind === "cable") && (
                <>
                  <div>
                    <label htmlFor="phone" className="text-[12.5px] font-medium text-ink-muted">
                      Contact phone number
                    </label>
                    <input
                      id="phone"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearVerification();
                      }}
                      placeholder="080XXXXXXXX"
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div>
                    <Button type="button" variant="secondary" size="sm" onClick={handleVerify} disabled={!canVerify}>
                      {verifying ? "Verifying…" : kind === "electricity" ? "Verify meter" : "Verify smartcard"}
                    </Button>
                    {verified && (
                      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-accent-soft-ink">
                        <Check size={13} /> {verified.name || "Verified"}
                      </p>
                    )}
                    {verifyError && <p className="mt-2 text-[12.5px] text-danger">{verifyError}</p>}
                  </div>
                </>
              )}

              {/* Amount (airtime, electricity) */}
              {copy.presets && (kind === "airtime" || verified) && (
                <div>
                  <p className="text-[12.5px] font-medium text-ink-muted">Amount</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {copy.presets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => {
                          setAmount(preset);
                          setCustomAmount("");
                        }}
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
                  <input
                    inputMode="numeric"
                    value={customAmount}
                    onChange={(e) => {
                      const v = digits(e.target.value);
                      setCustomAmount(v);
                      setAmount(v ? Number(v) : null);
                    }}
                    placeholder="Or enter an amount (min ₦50)"
                    className={`${inputClass} font-mono`}
                  />
                  {fee > 0 && (
                    <p className="mt-2 text-[12.5px] text-ink-muted">
                      {formatNaira(faceAmount)} + {formatNaira(fee)} service fee ={" "}
                      <span className="font-medium text-ink">{formatNaira(cost)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Plans (data, cable) */}
              {kind === "data" && plansKey && (
                <PlanList
                  plans={dataPlans}
                  loading={plansLoading}
                  error={plansError}
                  selected={planCode}
                  onSelect={setPlanCode}
                />
              )}
              {kind === "cable" && verified && <PlanList plans={cablePlans} loading={false} selected={planCode} onSelect={setPlanCode} />}

              <Button type="submit" disabled={!canSubmit} className="w-full">
                {phase === "loading" ? "Processing…" : cost > 0 ? `Pay ${formatNaira(cost)}` : kind === "airtime" || kind === "electricity" ? "Select an amount" : "Select a plan"}
              </Button>
            </form>

            <div className="mt-5 flex gap-2.5 rounded-xl border border-border bg-surface-raised p-3.5">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-ink-faint" />
              <p className="text-[12px] leading-relaxed text-ink-faint">
                Your wallet is charged once. If a purchase fails, it is refunded automatically.
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
                <p className="mt-1 max-w-xs text-[13px] text-ink-faint">Fill in the form and pay to see your receipt here.</p>
              </div>
            )}

            {phase === "loading" && (
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
                <p className="text-[12.5px] text-ink-faint">Contacting the provider. Please don&apos;t close this page.</p>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle size={20} strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-[14px] font-medium text-ink">Payment not completed</p>
                <p className="mt-1 max-w-xs text-[13px] text-ink-faint">{errorMessage}</p>
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPhase("idle")}>
                    Back to form
                  </Button>
                  <Button variant="ghost" size="sm" as={Link} href="/history">
                    Check history
                  </Button>
                </div>
              </div>
            )}

            {phase === "done" && result && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Purchase result</p>
                  {result.status === "successful" && (
                    <Badge tone="success">
                      <BadgeCheck size={11} />
                      Purchase complete
                    </Badge>
                  )}
                  {result.status === "pending" && (
                    <Badge tone="warning">
                      <Clock size={11} />
                      Processing
                    </Badge>
                  )}
                  {result.status === "failed" && (
                    <Badge tone="danger">
                      <AlertTriangle size={11} />
                      Failed · refunded
                    </Badge>
                  )}
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-border p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                    <ServiceIcon icon={service.icon} size={22} strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-ink">{formatNaira(paidAmount)}</p>
                    <p className="text-[12.5px] text-ink-faint">
                      {option ? optionLabel(option) : service.name} · {customerId || "—"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">{result.message}</p>

                {result.token && (
                  <div className="mt-5 rounded-xl border border-border bg-surface-raised p-4">
                    <p className="text-[11px] uppercase tracking-wide text-ink-faint">Your electricity token</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="break-all font-mono text-[18px] tracking-wide text-ink">{result.token}</p>
                      <Button variant="secondary" size="sm" onClick={() => copyToken(result.token!)}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    {result.units && <p className="mt-2 text-[12.5px] text-ink-faint">Units: {result.units}</p>}
                  </div>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-5">
                  <div>
                    <dt className="text-[11px] text-ink-faint">Reference</dt>
                    <dd className="mt-1 truncate font-mono text-[13.5px] text-ink">{result.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-faint">Status</dt>
                    <dd className="mt-1 text-[13.5px] capitalize text-ink">{result.status}</dd>
                  </div>
                </dl>

                {result.status === "pending" && (
                  <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
                    We&apos;re checking with the provider and will update this page. Your wallet is not charged twice, and it is
                    refunded automatically if the payment fails.
                  </p>
                )}

                <div className="mt-6 flex gap-2 border-t border-border pt-5">
                  <Button variant="ghost" size="sm" onClick={handleNew}>
                    {result.status === "failed" ? "Try again" : "New purchase"}
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

function PlanList({
  plans,
  loading,
  error,
  selected,
  onSelect,
}: {
  plans: Plan[];
  loading: boolean;
  error?: string;
  selected: string;
  onSelect: (code: string) => void;
}) {
  return (
    <div>
      <p className="text-[12.5px] font-medium text-ink-muted">Plan</p>
      <div className="mt-1.5 space-y-2">
        {loading && <div className="h-10 animate-shimmer rounded-lg" />}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        {!loading && !error && plans.length === 0 && <p className="text-[12.5px] text-ink-faint">No plans available.</p>}
        {plans.map((plan) => (
          <button
            type="button"
            key={plan.code}
            onClick={() => onSelect(plan.code)}
            className={
              "flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition-colors " +
              (selected === plan.code
                ? "border-accent bg-accent-soft text-accent-soft-ink"
                : "border-border text-ink-muted hover:border-border-strong hover:text-ink")
            }
          >
            <span>{plan.name}</span>
            <span className="shrink-0 font-mono">{formatNaira(plan.priceNaira)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
