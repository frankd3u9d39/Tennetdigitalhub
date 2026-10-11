"use client";

import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorLine, PageHead, naira, useAdminData } from "@/components/admin/kit";
import type { ProviderHealth } from "@/lib/admin";

export default function ProviderHealthPage() {
  const { data, error, loading, reload } = useAdminData<{ providers: ProviderHealth[] }>("/api/admin/providers");

  return (
    <>
      <PageHead
        title="Provider health"
        subtitle="Live balances from the companies that fulfil orders. Top up a provider before it runs dry."
        actions={
          <button type="button" onClick={reload} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] text-ink-muted hover:text-ink disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />
      <ErrorLine message={error} />
      <div className="grid gap-3 md:grid-cols-3">
        {data?.providers.map((p) => (
          <Card key={p.name} className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[19px] text-ink">{p.name}</h2>
              {!p.configured ? <Badge tone="warning">not set up</Badge> : p.error ? <Badge tone="danger">error</Badge> : <Badge tone="success">connected</Badge>}
            </div>
            <p className="mt-3 font-display text-[28px] text-ink">{p.balance === null ? "—" : naira(p.balance)}</p>
            <p className="text-[12px] text-ink-faint">balance</p>
            <dl className="mt-3 space-y-1 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">Mode</dt>
                <dd className="text-right text-ink">{p.mode}</dd>
              </div>
              {p.note ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Status</dt>
                  <dd className="text-right text-ink">{p.note}</dd>
                </div>
              ) : null}
            </dl>
            {p.error ? <p className="mt-3 text-[12.5px] text-danger">{p.error}</p> : null}
          </Card>
        ))}
        {!data && loading ? <div className="h-44 animate-shimmer rounded-2xl md:col-span-3" /> : null}
      </div>
      <p className="mt-4 text-[12.5px] text-ink-faint">API keys and live/sandbox switches are set in Vercel environment variables, not here, so a stolen admin session can never read or swap them.</p>
    </>
  );
}
