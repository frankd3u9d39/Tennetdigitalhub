"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorLine, PageHead, StatusBadge, adminApi, inputCls, naira, useAdminData, when } from "@/components/admin/kit";
import type { listFundings } from "@/lib/admin";

type Funding = Awaited<ReturnType<typeof listFundings>>[number];

export default function FundingsPage() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useAdminData<{ fundings: Funding[] }>(`/api/admin/fundings${status ? `?status=${status}` : ""}`);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const recheck = async (reference: string) => {
    setBusy(reference);
    setNotice("");
    setActionError("");
    try {
      const r = await adminApi<{ status: string }>("/api/admin/fundings", { method: "POST", body: { reference } });
      setNotice(`Paystack says: ${r.status}.`);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <PageHead
        title="Wallet funding"
        subtitle="Card payments through Paystack. If a customer paid but the wallet was not credited, re-check it here."
        actions={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " w-auto"}>
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="mismatch">Amount mismatch</option>
          </select>
        }
      />
      <div className="space-y-2">
        <ErrorLine message={error || actionError} />
        {notice ? <p className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-ink">{notice}</p> : null}
      </div>
      <Card className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-[12px] text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.fundings.map((f) => (
              <tr key={f.reference} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{when(f.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="text-ink">{f.name || f.email}</p>
                  <p className="text-[11.5px] text-ink-faint">{f.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-ink-muted">{f.reference}</td>
                <td className="px-4 py-3 text-right">{naira(f.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={f.status} />
                  {f.note ? <p className="mt-1 max-w-[220px] text-[11.5px] text-ink-faint">{f.note}</p> : null}
                </td>
                <td className="px-4 py-3 text-right">
                  {f.status !== "success" ? (
                    <button type="button" disabled={busy === f.reference} onClick={() => recheck(f.reference)} className="rounded-md border border-border px-2 py-1 text-[12px] text-ink hover:border-border-strong disabled:opacity-50">
                      {busy === f.reference ? "Checking…" : "Re-check with Paystack"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {data && data.fundings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-faint">
                  Nothing here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {!data && loading ? <div className="h-32 animate-shimmer" /> : null}
      </Card>
    </>
  );
}
