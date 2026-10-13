"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  ErrorLine,
  PageHead,
  ReasonDialog,
  StatusBadge,
  adminApi,
  inputCls,
  naira,
  useAdminData,
  when,
} from "@/components/admin/kit";
import type { listTransactions } from "@/lib/admin";

type Result = Awaited<ReturnType<typeof listTransactions>>;
type Row = Result["rows"][number];
const PAGE = 50;

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <Transactions />
    </Suspense>
  );
}

function Transactions() {
  const initialStatus = useSearchParams().get("status") ?? "";
  const [status, setStatus] = useState(initialStatus);
  const [direction, setDirection] = useState("");
  const [provider, setProvider] = useState("");
  const [days, setDays] = useState("30");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<{ row: Row; action: "mark_success" | "refund" } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const params = new URLSearchParams({ limit: String(PAGE), offset: String(page * PAGE) });
  if (status) params.set("status", status);
  if (direction) params.set("direction", direction);
  if (provider) params.set("provider", provider);
  if (days) params.set("days", days);
  if (search) params.set("q", search);
  const { data, error, loading, reload } = useAdminData<Result>(`/api/admin/transactions?${params}`);

  const recheck = async (row: Row) => {
    setActionError("");
    setNotice("");
    try {
      const r = await adminApi<{ status: string }>("/api/admin/payments", { method: "POST", body: { reference: row.reference, action: "recheck" } });
      setNotice(r.status === "pending" ? "Still processing at the provider." : `Payment is now ${r.status}.`);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed.");
    }
  };

  const filter = (fn: () => void) => () => {
    fn();
    setPage(0);
  };
  const select = (value: string, set: (v: string) => void, options: [string, string][]) => (
    <select value={value} onChange={(e) => filter(() => set(e.target.value))()} className={inputCls + " w-auto"}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <PageHead title="Transactions" subtitle="Every wallet movement. Payments stuck on “pending” can be resolved here." />
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(0);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name, reference…" className={inputCls + " w-64"} />
        {select(status, setStatus, [["", "Any status"], ["pending", "Pending"], ["successful", "Successful"], ["failed", "Failed"]])}
        {select(direction, setDirection, [["", "In & out"], ["debit", "Purchases"], ["credit", "Money in / refunds"]])}
        {select(provider, setProvider, [["", "Any provider"], ["ayglobal", "AYGlobalData"], ["checkmyninbvn", "CheckMyNINBVN"], ["vtugate", "VTUGate"], ["admin", "Admin"]])}
        {select(days, setDays, [["1", "Last 24h"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["365", "Last year"], ["", "All time"]])}
        <button type="submit" className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas dark:bg-accent dark:text-accent-ink">
          Search
        </button>
      </form>
      <div className="space-y-2">
        <ErrorLine message={error || actionError} />
        {notice ? <p className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-ink">{notice}</p> : null}
      </div>

      <Card className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead className="text-[12px] text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">What</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{when(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${r.userId}`} className="text-ink hover:underline">
                    {r.name || r.email}
                  </Link>
                  <p className="text-[11.5px] text-ink-faint">{r.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{r.label}</p>
                  {r.detail ? <p className="max-w-[260px] truncate text-[11.5px] text-ink-faint" title={r.detail}>{r.detail}</p> : null}
                  {r.reference ? <p className="font-mono text-[11px] text-ink-faint">{r.reference}</p> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className={r.direction === "credit" ? "text-accent-soft-ink" : "text-ink"}>
                    {r.direction === "credit" ? "+" : "−"}
                    {naira(r.amount)}
                  </span>
                  {r.cost !== null ? <p className="text-[11px] text-ink-faint">cost {naira(r.cost)}</p> : null}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.provider ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.status === "pending" && r.direction === "debit" && r.reference ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button type="button" onClick={() => recheck(r)} className="rounded-md border border-border px-2 py-1 text-[12px] text-ink hover:border-border-strong">
                        Re-check
                      </button>
                      <button type="button" onClick={() => setDialog({ row: r, action: "mark_success" })} className="rounded-md border border-border px-2 py-1 text-[12px] text-ink hover:border-border-strong">
                        Mark successful
                      </button>
                      <button type="button" onClick={() => setDialog({ row: r, action: "refund" })} className="rounded-md border border-danger/40 px-2 py-1 text-[12px] text-danger hover:bg-danger-soft">
                        Refund
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {data && data.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                  Nothing matches.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {!data && loading ? <div className="h-32 animate-shimmer" /> : null}
      </Card>

      {data ? (
        <div className="mt-3 flex items-center justify-between text-[13px] text-ink-muted">
          <span>
            {data.total} result{data.total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage(page + 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      ) : null}

      {dialog ? (
        <ReasonDialog
          title={dialog.action === "refund" ? "Refund this payment?" : "Mark this payment successful?"}
          body={
            dialog.action === "refund"
              ? `${naira(dialog.row.amount)} goes back to ${dialog.row.email}'s wallet. Only do this when you have confirmed with the provider that the order was NOT delivered.`
              : "Only do this when you have confirmed with the provider that the order WAS delivered. The customer is not refunded."
          }
          confirmLabel={dialog.action === "refund" ? "Refund customer" : "Mark successful"}
          danger={dialog.action === "refund"}
          onCancel={() => setDialog(null)}
          onConfirm={async (note) => {
            await adminApi("/api/admin/payments", { method: "POST", body: { reference: dialog.row.reference, action: dialog.action, note } });
            setDialog(null);
            setNotice(dialog.action === "refund" ? "Refunded." : "Marked successful.");
            await reload();
          }}
        />
      ) : null}
    </>
  );
}
