import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AccountStats } from "@/components/dashboard/AccountStats";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { services } from "@/lib/services";
import { getSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/format";
import { getServiceIcon } from "@/lib/icons";
import type { ServiceCategory } from "@/lib/types";

const categoryMeta: Record<ServiceCategory, { title: string; subtitle: string }> = {
  modification: {
    title: "Modification services",
    subtitle: "Record corrections, enrolment checks, and phone retrieval",
  },
  verification: {
    title: "Verification services",
    subtitle: "Live — run a NIN or BVN lookup now",
  },
  vtu: {
    title: "VTU & Utility services",
    subtitle: "Airtime, data, bill payments, and exam tokens",
  },
  registration: {
    title: "Registration services",
    subtitle: "CAC business filings and registrations",
  },
};

const categoryOrder: ServiceCategory[] = [
  "modification",
  "verification",
  "vtu",
  "registration",
];

export default async function DashboardPage() {
  const { pricing, services: flags } = await getSettings();
  // Live price for verification services; a service an admin switched off shows as unavailable and can't be opened.
  const priceOf = (slug: string, fallback: number) => (slug === "nin" ? pricing.identity.nin : slug === "bvn" ? pricing.identity.bvn : fallback);
  const flagKey: Record<string, keyof typeof flags> = { airtime: "airtime", data: "data", bill: "electricity", "tv-cable": "cable", nin: "nin", bvn: "bvn" };
  const isOff = (slug: string) => (slug in flagKey ? !flags[flagKey[slug]] : false);
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
                        className={
                          "group relative p-5 transition-colors " +
                          (service.comingSoon || isOff(service.slug) ? "opacity-60" : "hover:border-border-strong")
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-ink">
                            <Icon size={18} strokeWidth={1.8} />
                          </div>
                          {service.comingSoon ? (
                            <Badge tone="neutral">Coming soon</Badge>
                          ) : isOff(service.slug) ? (
                            <Badge tone="warning">Unavailable</Badge>
                          ) : (
                            <span className="font-mono text-[12px] text-ink-faint">
                              {priceOf(service.slug, service.price) > 0 ? formatNaira(priceOf(service.slug, service.price)) : "From ₦50"}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-4 text-[14px] font-medium text-ink">
                          {service.name}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                          {service.description}
                        </p>
                        {!service.comingSoon && !isOff(service.slug) && (
                          <Link
                            href={`/verify/${service.slug}`}
                            className="absolute inset-0"
                            aria-label={service.name}
                          />
                        )}
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
