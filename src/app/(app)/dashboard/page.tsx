import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { Card } from "@/components/ui/Card";
import { currentUser, ledger, services } from "@/lib/mock-data";
import { formatNaira, formatDateShort } from "@/lib/format";
import { getServiceIcon } from "@/lib/icons";
import type { ServiceCategory } from "@/lib/types";

const categoryMeta: Record<ServiceCategory, { title: string; subtitle: string }> = {
  vtu: {
    title: "VTU services",
    subtitle: "Airtime, data, and bill payments",
  },
  verification: {
    title: "Verification services",
    subtitle: "Live — run a NIN or BVN lookup now",
  },
  records: {
    title: "Modification services",
    subtitle: "Record corrections, enrolment, and compliance checks",
  },
  registration: {
    title: "Registration services",
    subtitle: "TIN and CAC filings",
  },
};

const categoryOrder: ServiceCategory[] = [
  "vtu",
  "verification",
  "records",
  "registration",
];

const stats = [
  { label: "Verifications this month", value: "38" },
  { label: "Success rate", value: "94.7%" },
  { label: "Spent this month", value: formatNaira(6420) },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Overview"
        subtitle={`Welcome back, ${currentUser.name.split(" ")[0]}`}
      />
      <main className="flex-1 space-y-8 p-6 lg:p-8">
        {/* Wallet + stats */}
        <div className="grid gap-5 lg:grid-cols-3">
          <WalletCard />

          <Card className="flex flex-col divide-y divide-border p-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between px-6 py-5">
                <span className="text-[13px] text-ink-muted">{stat.label}</span>
                <span className="font-mono text-[15px] text-ink">{stat.value}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Services */}
        <div className="space-y-10">
          {categoryOrder.map((category) => {
            const items = services.filter((s) => s.category === category);
            if (items.length === 0) return null;
            const meta = categoryMeta[category];
            return (
              <div key={category}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <h2 className="text-[15px] font-medium text-ink">{meta.title}</h2>
                    <p className="text-[12.5px] text-ink-faint">{meta.subtitle}</p>
                  </div>
                  {category === "verification" && (
                    <Link
                      href="/history"
                      className="flex shrink-0 items-center gap-1 text-[13px] text-ink-muted hover:text-ink"
                    >
                      View history
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((service) => {
                    const Icon = getServiceIcon(service.icon);
                    return (
                      <Card
                        key={service.slug}
                        className="group relative p-5 transition-colors hover:border-border-strong"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-ink">
                            <Icon size={18} strokeWidth={1.8} />
                          </div>
                          <span className="font-mono text-[12px] text-ink-faint">
                            {service.price > 0 ? formatNaira(service.price) : "From ₦50"}
                          </span>
                        </div>
                        <h3 className="mt-4 text-[14px] font-medium text-ink">
                          {service.name}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                          {service.description}
                        </p>
                        <Link
                          href={`/verify/${service.slug}`}
                          className="absolute inset-0"
                          aria-label={service.name}
                        />
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-ink">Recent activity</h2>
            <Link
              href="/wallet"
              className="flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink"
            >
              View ledger
              <ArrowRight size={13} />
            </Link>
          </div>
          <Card className="mt-4 divide-y divide-border p-0">
            {ledger.slice(0, 5).map((entry) => (
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
                <div className="shrink-0 text-right">
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
                    {formatDateShort(entry.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </main>
    </>
  );
}
