import { CheckCircle2, XCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { verificationHistory } from "@/lib/mock-data";
import { formatNaira, formatDate } from "@/lib/format";

const totals = {
  total: verificationHistory.length,
  successful: verificationHistory.filter((v) => v.status === "successful").length,
  failed: verificationHistory.filter((v) => v.status === "failed").length,
  spent: verificationHistory.reduce((sum, v) => sum + v.cost, 0),
};

export default function HistoryPage() {
  return (
    <>
      <Topbar title="Verification history" subtitle="Every lookup your team has run" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total lookups", value: totals.total },
            { label: "Successful", value: totals.successful },
            { label: "Failed", value: totals.failed },
            { label: "Total spent", value: formatNaira(totals.spent) },
          ].map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">
                {stat.label}
              </p>
              <p className="mt-2 font-mono text-[20px] text-ink">{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-[11.5px] uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Cost</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {verificationHistory.map((record) => (
                  <tr key={record.id} className="transition-colors hover:bg-surface-raised">
                    <td className="px-5 py-3.5">
                      <Badge tone="neutral">{record.type}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-ink-muted">
                      {record.queried}
                    </td>
                    <td className="px-5 py-3.5 text-ink">{record.subjectName}</td>
                    <td className="px-5 py-3.5">
                      {record.status === "successful" ? (
                        <span className="flex items-center gap-1.5 text-accent-soft-ink">
                          <CheckCircle2 size={14} />
                          Successful
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-danger">
                          <XCircle size={14} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-ink">
                      {formatNaira(record.cost)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-faint">
                      {formatDate(record.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
