import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  FileEdit,
  Fingerprint,
  GraduationCap,
  Landmark,
  Phone,
  Receipt,
  Search,
  ShieldCheck,
  Tv,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const serviceCategories = [
  {
    icon: Fingerprint,
    category: "Verification & Slips",
    tagline: "Live NIMC & NIBSS lookups in seconds",
    items: [
      { name: "NIN Verification", desc: "Instant demographic & facial match directly against NIMC records." },
      { name: "BVN Verification", desc: "Real-time identity match with linked bank enrolment details." },
      { name: "Official PDF Slips", desc: "Generate and download Standard & Premium NIN and BVN slips." },
    ],
  },
  {
    icon: FileEdit,
    category: "Modifications & Retrievals",
    tagline: "Record corrections & forgotten number lookups",
    items: [
      { name: "BVN & NIN Phone Search", desc: "Recover lost BVN or NIN numbers linked to a customer's phone." },
      { name: "NIN Validation Checks", desc: "Cross-check identity records against the live national register." },
      { name: "NIN Name, Phone & Address Updates", desc: "Submit correction orders reviewed and fulfilled in 24–48 hours." },
    ],
  },
  {
    icon: Briefcase,
    category: "CAC Business Filings",
    tagline: "Corporate Affairs Commission registrations",
    items: [
      { name: "Business Name Registration", desc: "Incorporate sole proprietorships and enterprise business names." },
      { name: "Limited Liability Company (LTD)", desc: "1 Million Share Capital incorporation with official filing." },
      { name: "NGOs & Incorporated Trustees", desc: "Register non-profits, foundations, churches, and associations." },
    ],
  },
  {
    icon: Zap,
    category: "Telecom, Utilities & Education",
    tagline: "Automated billing and instant token vending",
    items: [
      { name: "Airtime & Data Bundles", desc: "SME, Corporate Gifting, and Direct Data for MTN, Airtel, Glo, 9mobile." },
      { name: "Electricity & Cable TV", desc: "Instant meter token generation and DStv, GOtv, Startimes renewals." },
      { name: "WAEC, NECO & NABTEB Tokens", desc: "Instant result checker scratch card PIN vending for students." },
    ],
  },
];

const platformFeatures = [
  {
    icon: ShieldCheck,
    title: "Field-level audit trail",
    body: "Every lookup, modification, and payment is attributed to the requesting operator, timestamped, and retained for compliance reviews.",
  },
  {
    icon: Wallet,
    title: "Prepaid wallet billing",
    body: "Fund once via card, bank transfer, or USSD through Paystack. Deductions happen line-by-line with automated refunds on failed calls.",
  },
  {
    icon: Zap,
    title: "Dual upstream resilience",
    body: "Powered by CheckMyNINBVN and AYGlobalData with dynamic balance monitoring to ensure 99.9% uptime across all service desks.",
  },
  {
    icon: Fingerprint,
    title: "Zero-retention data privacy",
    body: "Customer biometrics, photos, and birth dates are streamed directly to your session and never persisted on our servers.",
  },
];

const steps = [
  {
    step: "01",
    title: "Fund your wallet",
    body: "Add funds via Paystack using card, bank transfer, or USSD. Your balance updates immediately upon payment confirmation.",
  },
  {
    step: "02",
    title: "Choose any service",
    body: "Select verification, record correction, CAC registration, utility bills, or exam tokens. Every price is shown clearly upfront.",
  },
  {
    step: "03",
    title: "Receive instant outcome",
    body: "Get instant verified matches, downloadable PDF slips, utility tokens, or track modification orders in real-time.",
  },
];

const pricingGroups = [
  {
    group: "Identity & Verification",
    items: [
      { name: "NIN Verification", price: "₦150", unit: "per lookup" },
      { name: "BVN Verification", price: "₦170", unit: "per lookup" },
      { name: "Standard / Premium PDF Slip", price: "₦170", unit: "per slip" },
    ],
  },
  {
    group: "Retrieval & Modification",
    items: [
      { name: "BVN Phone Search (Retrieval)", price: "₦300", unit: "per lookup" },
      { name: "NIN Phone Search (Retrieval)", price: "₦350", unit: "per lookup" },
      { name: "NIN Live Validation", price: "₦6,500", unit: "per record" },
      { name: "NIN Name / Phone / Address Update", price: "₦17,500", unit: "per order" },
    ],
  },
  {
    group: "CAC Business Registrations",
    items: [
      { name: "CAC Business Name Registration", price: "₦18,000", unit: "per filing" },
      { name: "CAC Company (1M Share LTD)", price: "₦45,000", unit: "per filing" },
      { name: "CAC NGO / Incorporated Trustees", price: "₦85,000", unit: "per filing" },
    ],
  },
  {
    group: "Telecom, Bills & Exam PINs",
    items: [
      { name: "Airtime & SME Data", price: "From ₦50", unit: "all networks" },
      { name: "Electricity & Cable TV Subscriptions", price: "Standard tariff", unit: "zero surcharge" },
      { name: "WAEC Result Checker PIN", price: "₦3,900", unit: "per PIN" },
      { name: "NECO / NABTEB Result Token", price: "₦1,500", unit: "per token" },
    ],
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-20 sm:pt-28 sm:pb-28">
          <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="animate-fade-up">
              <h1 className="font-display text-[40px] leading-[1.08] tracking-tight text-ink sm:text-[54px]">
                Identity verification & digital services,{" "}
                <span className="italic text-accent">done properly.</span>
              </h1>
              <p className="mt-6 max-w-lg text-[16.5px] leading-relaxed text-ink-muted">
                Tennet provides verification agents, onboarding teams, and cyber desks
                with a unified console for live NIN/BVN lookups, record modifications,
                CAC company filings, bill payments, and exam PINs — with prepaid wallet
                billing and zero guesswork.
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
              <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-8 text-[13px] text-ink-faint">
                <span>NIN & BVN Lookups</span>
                <span className="h-1 w-1 rounded-full bg-border-strong" />
                <span>NIN Record Corrections</span>
                <span className="h-1 w-1 rounded-full bg-border-strong" />
                <span>CAC Business Filings</span>
                <span className="h-1 w-1 rounded-full bg-border-strong" />
                <span>VTU & Exam PINs</span>
              </div>
            </div>

            {/* Product mockup preview */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(var(--shadow-color)/0.04),0_16px_40px_-16px_rgb(var(--shadow-color)/0.18)]">
                <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                  <span className="ml-3 font-mono text-[11px] text-ink-faint">
                    tennetdigital.ng/verify/overview
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  {/* Item 1: Verification card preview */}
                  <div className="rounded-xl border border-border bg-surface-raised p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        NIN & BVN Verification
                      </span>
                      <Badge tone="success">
                        <BadgeCheck size={12} /> Live Match
                      </Badge>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft font-display text-[14px] text-accent-soft-ink">
                        AC
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          Adaeze N. Chukwu
                        </p>
                        <p className="font-mono text-[11.5px] text-ink-faint">
                          •••••••0218 · Verified Female
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Item 2: Modification & CAC preview */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border p-3.5 bg-surface">
                      <span className="text-ink-faint font-medium">NIN Modification</span>
                      <p className="mt-1 font-semibold text-ink">Name Correction</p>
                      <Badge tone="warning" className="mt-2">Pending Staff Review</Badge>
                    </div>
                    <div className="rounded-xl border border-border p-3.5 bg-surface">
                      <span className="text-ink-faint font-medium">CAC Registration</span>
                      <p className="mt-1 font-semibold text-ink">Business Name</p>
                      <Badge tone="neutral" className="mt-2">Filing Submitted</Badge>
                    </div>
                  </div>

                  {/* Item 3: Utility & Exam Token preview */}
                  <div className="rounded-xl border border-border p-3.5 bg-surface flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-accent" />
                      <span className="text-ink font-medium">WAEC Result PIN: 8378-9281-2291</span>
                    </div>
                    <Badge tone="success">Generated</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Showcase */}
        <section id="services" className="border-t border-border px-6 py-24 bg-surface-raised/40">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <h2 className="font-display text-[32px] leading-tight tracking-tight text-ink">
                Four essential pillars, one unified wallet
              </h2>
              <p className="mt-3 text-[15px] text-ink-muted">
                From real-time citizen verification to CAC business incorporation and instant utility tokens, Tennet equips your desk with end-to-end capabilities.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {serviceCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-2xl border border-border bg-surface p-7 shadow-sm transition-all hover:border-border-strong hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <cat.icon size={20} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-ink">{cat.category}</h3>
                      <p className="text-[12.5px] text-ink-faint">{cat.tagline}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3.5 border-t border-border pt-5">
                    {cat.items.map((item) => (
                      <div key={item.name} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="mt-0.5 text-accent shrink-0" />
                        <div>
                          <p className="text-[13.5px] font-medium text-ink">{item.name}</p>
                          <p className="text-[12px] text-ink-muted leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform features */}
        <section id="platform" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <h2 className="font-display text-[32px] leading-tight tracking-tight text-ink">
                Built specifically for verification agents & desks
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
        <section id="how-it-works" className="border-t border-border px-6 py-24 bg-surface-raised/40">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <h2 className="font-display text-[32px] leading-tight tracking-tight text-ink">
                Three steps from funding to result
              </h2>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="rounded-2xl border border-border bg-surface p-6">
                  <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                    STEP {item.step}
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Transparent Pricing Table */}
        <section id="pricing" className="border-t border-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="font-display text-[34px] leading-tight tracking-tight text-ink">
                Pay per transaction. No monthly retainers.
              </h2>
              <p className="mt-3 text-[14.5px] text-ink-muted">
                Fund your prepaid wallet and pay strictly for what you query or order. Every price is visible before deduction.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {pricingGroups.map((group) => (
                <div
                  key={group.group}
                  className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
                >
                  <div className="border-b border-border bg-surface-raised px-6 py-4">
                    <h3 className="text-[15px] font-semibold text-ink">{group.group}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {group.items.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between px-6 py-4 hover:bg-surface-raised/40 transition-colors"
                      >
                        <span className="text-[13.5px] text-ink font-medium">{item.name}</span>
                        <div className="text-right">
                          <span className="font-mono text-[14px] font-bold text-accent">
                            {item.price}
                          </span>
                          <span className="ml-1.5 text-[11.5px] text-ink-faint">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button as={Link} href="/signup" size="lg">
                Create account & start now
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border px-6 py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-2xl border border-border bg-surface px-8 py-12 sm:flex-row sm:items-center sm:px-12">
            <div>
              <h2 className="font-display text-[26px] leading-tight tracking-tight text-ink">
                Set up your verification & service desk today
              </h2>
              <p className="mt-2 max-w-md text-[14px] text-ink-muted">
                Create an account, fund your wallet via Paystack, and run lookups, record corrections, or CAC filings in minutes.
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
