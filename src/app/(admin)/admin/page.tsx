"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ErrorLine, PageHead, Stat, naira, useAdminData, when } from "@/components/admin/kit";
import type { getOverview, ProviderHealth } from "@/lib/admin";

type Overview = Awaited<ReturnType<typeof getOverview>>;

const RANGES = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default function AdminOverview() {
  const [days, setDays] = useState(7);
  const { data, error, loading } = useAdminData<Overview>(`/api/admin/overview?days=${days}`);
  // Loaded separately: it calls the providers' own servers, so it must not hold up the rest of the page.
  const health = useAdminData<{ providers: ProviderHealth[] }>("/api/admin/providers");
  const low = health.data?.providers.filter((p) => p.low) ?? [];

  return (
    <>
      <PageHead
        title="Overview"
        subtitle="What happened in the app, and what needs attention."
        actions={
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={`rounded-md px-3 py-1 text-[13px] ${days === r.days ? "bg-ink text-canvas dark:bg-accent dark:text-accent-ink" : "text-ink-muted hover:text-ink"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />
      <ErrorLine message={error} />
      {!data ? (
        loading ? <div className="h-40 animate-shimmer rounded-2xl" /> : null
      ) : (
        <div className="space-y-6">
          {low.length > 0 ? (
            <Link href="/admin/providers" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger-soft p-4 text-danger">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span className="text-[14px]">
                Top up soon: {low.map((p) => `${p.name} has only ${naira(p.balance ?? 0)}`).join("; ")}. Orders it can&apos;t cover are refused until you add funds.
              </span>
            </Link>
          ) : null}
          {data.pending.stuck > 0 ? (
            <Link href="/admin/transactions?status=pending" className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn-soft p-4 text-warn">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span className="text-[14px]">
                {data.pending.stuck} payment{data.pending.stuck === 1 ? " has" : "s have"} been processing for over 10 minutes. Open them to re-check, mark successful, or refund.
              </span>
            </Link>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sales" value={naira(data.revenue)} sub={`${data.totalSales} successful`} />
            <Stat label="Provider cost" value={naira(data.cost)} />
            <Stat
              label="Estimated margin"
              value={naira(data.estimatedMargin)}
              sub={data.salesWithoutCost > 0 ? `${data.salesWithoutCost} older sales have no recorded cost` : undefined}
            />
            <Stat label="Wallets hold (owed to customers)" value={naira(data.users.walletLiabilities)} />
            <Stat label="Money in (Paystack)" value={naira(data.fundings.inflow)} sub={`${data.fundings.paid} payments`} />
            <Stat label="Processing now" value={String(data.pending.count)} tone={data.pending.count ? "warn" : undefined} sub={data.pending.oldest ? `oldest ${when(data.pending.oldest)}` : undefined} />
            <Stat label="Failed" value={String(data.failedCount)} sub={`${data.refunds.count} refunded · ${naira(data.refunds.total)}`} tone={data.failedCount ? "danger" : undefined} />
            <Stat label="Customers" value={String(data.users.total)} sub={`${data.users.new} new · ${data.users.suspended} suspended`} />
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13.5px]">
              <thead className="text-[12px] text-ink-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 text-right font-medium">Sales</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-faint">
                      No sales in this period.
                    </td>
                  </tr>
                ) : (
                  data.byCategory.map((r) => (
                    <tr key={r.category} className="border-t border-border">
                      <td className="px-4 py-3 text-ink">{r.category}</td>
                      <td className="px-4 py-3 text-right">{r.sales}</td>
                      <td className="px-4 py-3 text-right">{naira(r.revenue)}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">{r.withoutCost === r.sales ? "—" : naira(r.cost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {data.lookups.length > 0 ? (
            <Card className="p-4">
              <p className="mb-2 text-[12.5px] font-medium text-ink-muted">Identity lookups</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13.5px]">
                {data.lookups.map((l) => (
                  <span key={`${l.kind}-${l.status}`} className="text-ink">
                    {l.kind.toUpperCase()} {l.status}: <b>{l.count}</b>
                  </span>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
