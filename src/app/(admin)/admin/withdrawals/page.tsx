"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorLine, PageHead, ReasonDialog, StatusBadge, adminApi, inputCls, naira, useAdminData, when } from "@/components/admin/kit";
import type { AdminWithdrawal } from "@/lib/withdrawals";

type Data = { summary: { count: number; total: number; oldest: string | null }; withdrawals: AdminWithdrawal[] };

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {}
      }}
      className="ml-1.5 inline-flex rounded p-0.5 text-ink-faint hover:text-ink"
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

const waited = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return h < 48 ? `${h} h` : `${Math.floor(h / 24)} days`;
};

export default function WithdrawalsPage() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const { data, error, loading, reload } = useAdminData<Data>(`/api/admin/withdrawals?filter=${filter}`);
  const [paying, setPaying] = useState<AdminWithdrawal | null>(null);
  const [rejecting, setRejecting] = useState<AdminWithdrawal | null>(null);
  const [payNote, setPayNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const act = async (w: AdminWithdrawal, action: "paid" | "reject", note: string) => {
    await adminApi("/api/admin/withdrawals", { method: "POST", body: { reference: w.reference, action, note } });
    setNotice(
      action === "paid"
        ? `Marked ${naira(w.amount)} to ${w.payout?.accountName ?? w.customer.name} as paid.`
        : `Rejected. ${naira(w.amount)} was returned to ${w.customer.name}'s wallet.`
    );
    window.dispatchEvent(new Event("admin-withdrawals-changed"));
    await reload();
  };

  const summary = data?.summary;

  return (
    <>
      <PageHead
        title="Withdrawals"
        subtitle="Send the money from your bank app to the account shown, then mark it paid. Reject to return the money to the customer's wallet."
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value as "pending" | "all")} className={inputCls + " w-auto"}>
            <option value="pending">Waiting for payment</option>
            <option value="all">All withdrawals</option>
          </select>
        }
      />

      <div className="space-y-2">
        <ErrorLine message={error || actionError} />
        {notice ? <p className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-ink">{notice}</p> : null}
        {summary && summary.count > 0 ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">
            <strong>{summary.count}</strong> waiting · <strong>{naira(summary.total)}</strong> to send
            {summary.oldest ? <> · oldest has waited {waited(summary.oldest)}</> : null}
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {data?.withdrawals.map((w) => (
          <Card key={w.reference} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-[22px] text-ink">{naira(w.amount)}</p>
                <p className="text-[12px] text-ink-faint">
                  {when(w.createdAt)}
                  {w.status === "pending" ? <> · waiting {waited(w.createdAt)}</> : null} ·{" "}
                  <span className="font-mono">{w.reference}</span>
                </p>
              </div>
              <StatusBadge status={w.status === "successful" ? "successful" : w.status === "failed" ? "failed" : "pending"} />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-canvas p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Send to</p>
                {w.payout ? (
                  <dl className="mt-1.5 space-y-1 text-[13.5px]">
                    <div className="flex items-center">
                      <dt className="w-28 text-ink-muted">Bank</dt>
                      <dd className="text-ink">{w.payout.bankName}</dd>
                    </div>
                    <div className="flex items-center">
                      <dt className="w-28 text-ink-muted">Account no.</dt>
                      <dd className="font-mono text-[15px] text-ink">
                        {w.payout.accountNumber}
                        <CopyButton value={w.payout.accountNumber} label="account number" />
                      </dd>
                    </div>
                    <div className="flex items-center">
                      <dt className="w-28 text-ink-muted">Account name</dt>
                      <dd className="text-ink">
                        {w.payout.accountName}
                        <CopyButton value={w.payout.accountName} label="account name" />
                        {w.payout.verified ? (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-500">
                            <ShieldCheck size={12} /> bank-verified
                          </span>
                        ) : (
                          <Badge tone="warning">not verified, check before paying</Badge>
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-1.5 text-[13px] text-ink">{w.detail}</p>
                )}
              </div>
              <div className="rounded-lg border border-border bg-canvas p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Customer</p>
                <p className="mt-1.5 text-[13.5px] text-ink">{w.customer.name}</p>
                <p className="text-[12.5px] text-ink-muted">{w.customer.email}</p>
                {w.customer.phone ? <p className="text-[12.5px] text-ink-muted">{w.customer.phone}</p> : null}
                {w.manualReason ? <p className="mt-2 text-[12px] text-ink-faint">Why it&apos;s here: {w.manualReason}</p> : null}
                {w.paidBy ? (
                  <p className="mt-2 text-[12px] text-ink-faint">
                    Paid by {w.paidBy}
                    {w.paidAt ? ` · ${when(w.paidAt)}` : ""}
                    {w.payoutNote ? ` · ${w.payoutNote}` : ""}
                  </p>
                ) : null}
                {w.rejectReason ? <p className="mt-2 text-[12px] text-danger">Rejected: {w.rejectReason}</p> : null}
              </div>
            </div>

            {w.status === "pending" ? (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setNotice("");
                    setRejecting(w);
                  }}
                  className="h-9 rounded-lg border border-border px-3 text-[13px] text-danger hover:bg-danger-soft"
                >
                  Reject &amp; refund
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setNotice("");
                    setPayNote("");
                    setPaying(w);
                  }}
                  className="h-9 rounded-lg bg-ink px-4 text-[13px] font-medium text-canvas dark:bg-accent dark:text-accent-ink"
                >
                  I&apos;ve sent the money
                </button>
              </div>
            ) : null}
          </Card>
        ))}

        {data && data.withdrawals.length === 0 ? (
          <Card className="px-4 py-12 text-center text-[13.5px] text-ink-faint">
            {filter === "pending" ? "Nothing waiting. Every withdrawal has been handled." : "No withdrawals yet."}
          </Card>
        ) : null}
        {!data && loading ? <div className="h-40 animate-shimmer rounded-2xl" /> : null}
      </div>

      {paying ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Confirm payment">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h2 className="font-display text-[20px] text-ink">Confirm you sent {naira(paying.amount)}</h2>
            <p className="mt-1 text-[13.5px] text-ink-muted">
              To {paying.payout?.accountName} · {paying.payout?.bankName} · {paying.payout?.accountNumber}. Only confirm after the transfer went through.
            </p>
            <label className="mt-4 block text-[12.5px] font-medium text-ink-muted">
              Transfer reference / note (optional)
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} maxLength={300} className={inputCls + " mt-1.5"} />
            </label>
            <div className="mt-3">
              <ErrorLine message={actionError} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPaying(null)} className="h-10 rounded-lg px-4 text-sm text-ink-muted hover:bg-surface-raised">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setActionError("");
                  try {
                    await act(paying, "paid", payNote);
                    setPaying(null);
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : "Failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50 dark:bg-accent dark:text-accent-ink"
              >
                {busy ? "Saving…" : "Yes, mark as paid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejecting ? (
        <ReasonDialog
          title={`Reject ${naira(rejecting.amount)}?`}
          body={`The money goes back to ${rejecting.customer.name}'s wallet. They will see your reason.`}
          confirmLabel="Reject & refund"
          danger
          onCancel={() => setRejecting(null)}
          onConfirm={async (reason) => {
            await act(rejecting, "reject", reason);
            setRejecting(null);
          }}
        />
      ) : null}
    </>
  );
}
