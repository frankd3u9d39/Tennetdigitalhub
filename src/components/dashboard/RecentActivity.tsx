"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useWallet } from "@/lib/wallet";
import { formatNaira, formatDateShort } from "@/lib/format";

export function RecentActivity() {
  const { ledger, loading } = useWallet();

  return (
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
        {loading && (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">Loading…</div>
        )}
        {!loading && ledger.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            No activity yet.
          </div>
        )}
        {ledger.slice(0, 5).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4">
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
                <p className="truncate text-[13.5px] font-medium text-ink">{entry.label}</p>
                <p className="truncate text-[12.5px] text-ink-faint">{entry.detail}</p>
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
              <p className="text-[11.5px] text-ink-faint">{formatDateShort(entry.timestamp)}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
