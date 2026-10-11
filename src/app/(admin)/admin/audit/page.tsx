"use client";

import { Card } from "@/components/ui/Card";
import { ErrorLine, PageHead, useAdminData, when } from "@/components/admin/kit";
import type { listAudit } from "@/lib/admin";

type Entry = Awaited<ReturnType<typeof listAudit>>[number];

const compact = (v: unknown) => (v === null || v === undefined ? "" : JSON.stringify(v));

export default function AuditPage() {
  const { data, error, loading } = useAdminData<{ entries: Entry[] }>("/api/admin/audit?limit=200");
  return (
    <>
      <PageHead title="Audit log" subtitle="Every change an admin made: who, what, before and after, and why. It cannot be edited from the app." />
      <ErrorLine message={error} />
      <Card className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="text-[12px] text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries.map((e, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{when(e.createdAt)}</td>
                <td className="px-4 py-3 text-ink">{e.admin}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink">{e.action}</td>
                <td className="px-4 py-3 text-ink-muted">{e.target ?? "—"}</td>
                <td className="px-4 py-3">
                  {e.note ? <p className="text-ink">“{e.note}”</p> : null}
                  {e.before ? <p className="break-all font-mono text-[11px] text-ink-faint">before: {compact(e.before)}</p> : null}
                  {e.after ? <p className="break-all font-mono text-[11px] text-ink-faint">after: {compact(e.after)}</p> : null}
                </td>
              </tr>
            ))}
            {data && data.entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-faint">
                  No admin actions yet.
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
