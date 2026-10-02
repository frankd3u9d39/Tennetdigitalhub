"use client";

import { Card } from "@/components/ui/Card";
import { useWallet } from "@/lib/wallet";
import { formatNaira } from "@/lib/format";

function isThisMonth(timestamp: string) {
  const d = new Date(timestamp);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function AccountStats() {
  const { verifications, ledger, loading } = useWallet();

  const monthVerifications = verifications.filter((v) => isThisMonth(v.timestamp));
  const successCount = monthVerifications.filter((v) => v.status === "successful").length;
  const successRate =
    monthVerifications.length > 0
      ? `${((successCount / monthVerifications.length) * 100).toFixed(1)}%`
      : "—";
  const spentThisMonth = ledger
    .filter((entry) => entry.direction === "debit" && isThisMonth(entry.timestamp))
    .reduce((sum, entry) => sum + entry.amount, 0);

  const stats = [
    { label: "Verifications this month", value: loading ? "—" : String(monthVerifications.length) },
    { label: "Success rate", value: loading ? "—" : successRate },
    { label: "Spent this month", value: loading ? "—" : formatNaira(spentThisMonth) },
  ];

  return (
    <Card className="flex flex-col divide-y divide-border p-0">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center justify-between px-6 py-5">
          <span className="text-[13px] text-ink-muted">{stat.label}</span>
          <span className="font-mono text-[15px] text-ink">{stat.value}</span>
        </div>
      ))}
    </Card>
  );
}
