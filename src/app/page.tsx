import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  Landmark,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const platformFeatures = [
  {
    icon: Fingerprint,
    title: "NIN & BVN lookups",
    body: "Submit a number, get a structured match response back in seconds — name, DOB, gender, and a signed tracking ID for your audit trail.",
  },
  {
    icon: ShieldCheck,
    title: "Field-level audit logging",
    body: "Every query is timestamped, attributed to the requesting agent, and retained for compliance review. Nothing is queried silently.",
  },
  {
    icon: Wallet,
    title: "Prepaid wallet billing",
    body: "Fund once, draw down per lookup. Line-item ledger entries reconcile automatically against your team's usage.",
  },
  {
    icon: Zap,
    title: "Built for agent teams",
    body: "Role-based seats, per-agent spend limits, and a shared history view so a five-person desk or a fifty-person one runs the same way.",
  },
];

const steps = [
  {
    step: "01",
    title: "Fund your wallet",
    body: "Transfer into your dedicated settlement account. Balances reflect within minutes and are visible to every seat on your team.",
  },
  {
    step: "02",
    title: "Submit a query",
    body: "Enter the NIN or BVN, choose the record type you need, and confirm. The cost is shown before you submit — no surprise deductions.",
  },
  {
    step: "03",
    title: "Receive a structured result",
    body: "Get a match response with a tracking ID, or a clear decline reason. Every result is logged to your verification history automatically.",
  },
];

const pricing = [
  { name: "NIN verification", price: "₦150", unit: "per lookup" },
  { name: "BVN verification", price: "₦170", unit: "per lookup" },
  { name: "Record modification", price: "₦2,500", unit: "per request" },
  { name: "CAC registration", price: "₦15,000", unit: "per filing" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28">
          <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="animate-fade-up">
              <h1 className="font-display text-[42px] leading-[1.08] tracking-tight text-ink sm:text-[56px] mt-2">
                Identity verification,{" "}
                <span className="italic text-accent">done properly.</span>
              </h1>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-muted">
                Tennet gives verification agents and onboarding teams a single
                console for NIN and BVN lookups, wallet-based billing, and a
                complete audit trail — without the guesswork.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button as={Link} href="/signup" size="lg">
                  Create free account
                  <ArrowRight size={16} />
                </Button>
                <Button as={Link} href="/dashboard" variant="secondary" size="lg">
                  View live demo
                </Button>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-8 text-[13px] text-ink-faint">
                <span>Structured match responses</span>
                <span className="h-1 w-1 rounded-full bg-border-strong" />
                <span>Per-agent audit logs</span>
                <span className="h-1 w-1 rounded-full bg-border-strong" />
                <span>Transparent per-lookup pricing</span>
              </div>
            </div>

            {/* Product mockup */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(var(--shadow-color)/0.04),0_16px_40px_-16px_rgb(var(--shadow-color)/0.18)]">
                <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="ml-3 font-mono text-[11px] text-ink-faint">
                    tennetdigital.ng/verify/nin
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      NIN verification
                    </p>
                    <Badge tone="success">
                      <BadgeCheck size={11} />
                      Match found
                    </Badge>
                  </div>
                  <div className="mt-4 rounded-xl border border-border bg-canvas px-4 py-3 font-mono text-[13px] text-ink-muted">
                    111•• •••• •021
                  </div>
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-border p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft font-display text-[15px] text-accent-soft-ink">
                      AC
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">
                        Adaeze N. Chukwu
                      </p>
                      <p className="text-[12px] text-ink-faint">
                        Verified · Female · Lagos State
                      </p>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 text-[13px]">
                    <div>
                      <dt className="text-ink-faint">Date of birth</dt>
                      <dd className="mt-1 font-mono text-ink">1991-04-12</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Tracking ID</dt>
                      <dd className="mt-1 truncate font-mono text-ink">CLR-8F2AE31C</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform features */}
        <section id="platform" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="text-[13px] font-medium uppercase tracking-wide text-ink-faint">
                Platform
              </p>
              <h2 className="mt-3 font-display text-[32px] leading-tight tracking-tight text-ink">
                Everything a verification desk actually needs
              </h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
              {platformFeatures.map((feature) => (
                <div key={feature.title} className="bg-surface p-8">
                  <feature.icon size={20} className="text-accent" strokeWidth={1.75} />
                  <h3 className="mt-5 text-[16px] font-medium text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="text-[13px] font-medium uppercase tracking-wide text-ink-faint">
                How it works
              </p>
              <h2 className="mt-3 font-display text-[32px] leading-tight tracking-tight text-ink">
                Three steps from wallet to result
              </h2>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step}>
                  <span className="font-display text-[13px] text-ink-faint">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-[17px] font-medium text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-[13px] font-medium uppercase tracking-wide text-ink-faint">
                  Pricing
                </p>
                <h2 className="mt-3 font-display text-[32px] leading-tight tracking-tight text-ink">
                  Pay per lookup, not per seat
                </h2>
                <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-muted">
                  No subscriptions or minimums. Fund your wallet and every query
                  draws down at the listed rate, visible before you confirm.
                </p>
                <Button as={Link} href="/signup" variant="secondary" className="mt-8">
                  Start verifying
                  <ArrowRight size={16} />
                </Button>
              </div>
              <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {pricing.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-6 py-5"
                  >
                    <div className="flex items-center gap-3">
                      <Landmark size={16} className="text-ink-faint" />
                      <span className="text-[14px] text-ink">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[14px] text-ink">
                        {item.price}
                      </span>
                      <span className="ml-1.5 text-[12px] text-ink-faint">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border px-6 py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-2xl border border-border bg-surface px-8 py-12 sm:flex-row sm:items-center sm:px-12">
            <div>
              <h2 className="font-display text-[26px] leading-tight tracking-tight text-ink">
                Set up your verification desk today
              </h2>
              <p className="mt-2 max-w-md text-[14px] text-ink-muted">
                Create an account, fund your wallet, and run your first lookup in
                under five minutes.
              </p>
            </div>
            <Button as={Link} href="/signup" size="lg" className="shrink-0">
              Create free account
              <ArrowRight size={16} />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
