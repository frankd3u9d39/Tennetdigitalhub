"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorLine, PageHead, ReasonDialog, adminApi, inputCls, naira, useAdminData, when } from "@/components/admin/kit";
import type { listUsers } from "@/lib/admin";

type User = Awaited<ReturnType<typeof listUsers>>[number];

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [adminDialog, setAdminDialog] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const { data, error, loading, reload } = useAdminData<{ users: User[] }>(`/api/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`);

  return (
    <>
      <PageHead title="Customers" subtitle="Look up a customer, see their activity, adjust their wallet, or suspend them." />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={inputCls + " max-w-sm"} />
        <button type="submit" className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas dark:bg-accent dark:text-accent-ink">
          Search
        </button>
      </form>
      <ErrorLine message={error} />
      {notice ? <p className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-ink">{notice}</p> : null}
      <Card className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-[12px] text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3 text-right font-medium">Purchases</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${u.id}`} className="text-ink hover:underline">
                    {u.name || u.email}
                  </Link>
                  <p className="text-[11.5px] text-ink-faint">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-right">{naira(u.balance)}</td>
                <td className="px-4 py-3 text-right">{u.purchases}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{when(u.lastActive)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{when(u.memberSince)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {u.isAdmin ? <Badge tone="accent">admin</Badge> : null}
                    {u.suspended ? <Badge tone="danger">suspended</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setNotice("");
                      setAdminDialog(u);
                    }}
                    className={`whitespace-nowrap rounded-md border px-2 py-1 text-[12px] ${u.isAdmin ? "border-danger/40 text-danger hover:bg-danger-soft" : "border-border text-ink hover:border-border-strong"}`}
                  >
                    {u.isAdmin ? "Remove admin" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
            {data && data.users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-faint">
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {!data && loading ? <div className="h-32 animate-shimmer" /> : null}
      </Card>

      {adminDialog ? (
        <ReasonDialog
          title={adminDialog.isAdmin ? `Remove admin access from ${adminDialog.name || adminDialog.email}?` : `Make ${adminDialog.name || adminDialog.email} an admin?`}
          body={
            adminDialog.isAdmin
              ? "They go back to being an ordinary customer."
              : "Admins can change prices, move money and see every customer. They must turn on two-factor in Settings before the admin area opens for them."
          }
          confirmLabel={adminDialog.isAdmin ? "Remove admin" : "Make admin"}
          danger
          onCancel={() => setAdminDialog(null)}
          onConfirm={async (note) => {
            await adminApi(`/api/admin/users/${adminDialog.id}`, { method: "POST", body: { action: adminDialog.isAdmin ? "remove_admin" : "make_admin", note } });
            setNotice(adminDialog.isAdmin ? `${adminDialog.email} is no longer an admin.` : `${adminDialog.email} is now an admin. They need two-factor on before /admin opens.`);
            setAdminDialog(null);
            await reload();
          }}
        />
      ) : null}
    </>
  );
}
