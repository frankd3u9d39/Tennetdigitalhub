"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorLine, Field, NumberInput, PageHead, ReasonDialog, StatusBadge, adminApi, naira, useAdminData, when } from "@/components/admin/kit";
import type { getUserDetail } from "@/lib/admin";

type Detail = Awaited<ReturnType<typeof getUserDetail>>;
type Action = "suspend" | "unsuspend" | "reset_2fa" | "make_admin" | "remove_admin";

const COPY: Record<Action, { title: string; body: string; confirm: string; danger?: boolean }> = {
  suspend: { title: "Suspend this customer?", body: "They can still sign in but cannot see or do anything until you unsuspend them. Their wallet is kept.", confirm: "Suspend", danger: true },
  unsuspend: { title: "Unsuspend this customer?", body: "Full access is restored.", confirm: "Unsuspend" },
  reset_2fa: { title: "Remove their two-factor?", body: "Use this when they lost their phone. They sign in with their password and set up the authenticator again. Confirm it is really them first.", confirm: "Remove two-factor", danger: true },
  make_admin: { title: "Make this customer an admin?", body: "Admins can change prices, move money and see every customer. They still need two-factor to open the admin area.", confirm: "Make admin", danger: true },
  remove_admin: { title: "Remove admin access?", body: "They go back to being an ordinary customer.", confirm: "Remove admin", danger: true },
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useAdminData<Detail>(`/api/admin/users/${id}`);
  const [action, setAction] = useState<Action | null>(null);
  const [adjust, setAdjust] = useState(false);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState(NaN);
  const [notice, setNotice] = useState("");

  const post = (body: Record<string, unknown>) => adminApi<Record<string, unknown>>(`/api/admin/users/${id}`, { method: "POST", body });

  return (
    <>
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Customers
      </Link>
      <ErrorLine message={error} />
      {!data ? (
        loading ? <div className="h-40 animate-shimmer rounded-2xl" /> : null
      ) : (
        <div className="space-y-6">
          <PageHead
            title={data.name || data.email}
            subtitle={`${data.email} · joined ${when(data.memberSince)}`}
            actions={
              <div className="flex gap-1.5">
                {data.isAdmin ? <Badge tone="accent">admin</Badge> : null}
                {data.suspended ? <Badge tone="danger">suspended</Badge> : null}
                {data.twoFactorOn ? <Badge tone="success">2FA on</Badge> : <Badge>2FA off</Badge>}
              </div>
            }
          />
          {notice ? <p className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-ink">{notice}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <p className="text-[12px] text-ink-faint">Wallet balance</p>
              <p className="mt-1 font-display text-[30px] text-ink">{naira(data.balance)}</p>
              {!adjust ? (
                <button type="button" onClick={() => setAdjust(true)} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-[13px] text-ink hover:border-border-strong">
                  Adjust balance…
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    {(["credit", "debit"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDirection(d)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-[13px] ${direction === d ? "border-accent bg-accent-soft text-accent-soft-ink" : "border-border text-ink-muted"}`}
                      >
                        {d === "credit" ? "Add money" : "Take money"}
                      </button>
                    ))}
                  </div>
                  <Field label="Amount">
                    <NumberInput value={amount} onChange={setAmount} prefix="₦" step={0.01} />
                  </Field>
                  <div className="flex gap-2">
                    <AdjustConfirm
                      disabled={!(amount > 0)}
                      direction={direction}
                      amount={amount}
                      onDone={async (msg) => {
                        setAdjust(false);
                        setAmount(NaN);
                        setNotice(msg);
                        await reload();
                      }}
                      post={post}
                    />
                    <button type="button" onClick={() => setAdjust(false)} className="h-10 rounded-lg px-3 text-sm text-ink-muted hover:bg-surface-raised">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="mb-3 text-[12px] text-ink-faint">Account controls</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setAction(data.suspended ? "unsuspend" : "suspend")} className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-ink hover:border-border-strong">
                  {data.suspended ? "Unsuspend" : "Suspend"}
                </button>
                {data.twoFactorOn ? (
                  <button type="button" onClick={() => setAction("reset_2fa")} className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-ink hover:border-border-strong">
                    Reset two-factor
                  </button>
                ) : null}
                <button type="button" onClick={() => setAction(data.isAdmin ? "remove_admin" : "make_admin")} className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-ink hover:border-border-strong">
                  {data.isAdmin ? "Remove admin" : "Make admin"}
                </button>
              </div>
            </Card>
          </div>

          <Card className="overflow-x-auto">
            <p className="px-4 pt-4 text-[12.5px] font-medium text-ink-muted">Latest activity</p>
            <table className="mt-2 w-full min-w-[620px] text-left text-[13px]">
              <tbody>
                {data.ledger.map((l, i) => (
                  <tr key={`${l.reference}-${i}`} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{when(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{l.label}</p>
                      {l.detail ? <p className="max-w-[320px] truncate text-[11.5px] text-ink-faint">{l.detail}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {l.direction === "credit" ? "+" : "−"}
                      {naira(l.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
                {data.ledger.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-ink-faint">No activity yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {action ? (
        <ReasonDialog
          title={COPY[action].title}
          body={COPY[action].body}
          confirmLabel={COPY[action].confirm}
          danger={COPY[action].danger}
          onCancel={() => setAction(null)}
          onConfirm={async (note) => {
            await post({ action, note });
            setAction(null);
            setNotice("Done.");
            await reload();
          }}
        />
      ) : null}
    </>
  );
}

function AdjustConfirm({
  disabled,
  direction,
  amount,
  post,
  onDone,
}: {
  disabled: boolean;
  direction: "credit" | "debit";
  amount: number;
  post: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onDone: (message: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="h-10 flex-1 rounded-lg bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50 dark:bg-accent dark:text-accent-ink">
        Continue
      </button>
      {open ? (
        <ReasonDialog
          title={direction === "credit" ? `Add ${naira(amount)} to this wallet?` : `Take ${naira(amount)} from this wallet?`}
          body="This appears in the customer's history as “Admin adjustment” with your reason."
          confirmLabel={direction === "credit" ? "Add money" : "Take money"}
          danger={direction === "debit"}
          onCancel={() => setOpen(false)}
          onConfirm={async (note) => {
            const r = await post({ action: "adjust", direction, amount, note });
            setOpen(false);
            await onDone(`New balance: ${naira(Number(r.balance))}.`);
          }}
        />
      ) : null}
    </>
  );
}
