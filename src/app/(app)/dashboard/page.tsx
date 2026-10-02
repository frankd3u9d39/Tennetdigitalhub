import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AccountStats } from "@/components/dashboard/AccountStats";
import { Card } from "@/components/ui/Card";
import { services } from "@/lib/mock-data";
import { formatNaira } from "@/lib/format";
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

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Overview" greeting />
      <main className="flex-1 space-y-8 p-6 lg:p-8">
        {/* Wallet + stats */}
        <div className="grid gap-5 lg:grid-cols-3">
          <WalletCard />
          <AccountStats />
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

        <RecentActivity />
      </main>
    </>
  );
}
