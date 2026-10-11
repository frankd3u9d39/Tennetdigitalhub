"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";

/** Calls an /api/admin route; throws an Error carrying the server's message. */
export async function adminApi<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

/** Loads a GET endpoint and lets the page reload it after an action. */
export function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await adminApi<T>(path));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

export const naira = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "successful" || status === "success" ? "success" : status === "pending" ? "warning" : status === "failed" || status === "mismatch" ? "danger" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

export function ErrorLine({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
      {message}
    </p>
  ) : null;
}

export const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-ink-faint">{hint}</span> : null}
    </label>
  );
}

/** A number box that lets the admin type freely ("12.", "") and only commits valid numbers. */
export function NumberInput({ value, onChange, prefix, suffix, step = 1 }: { value: number; onChange: (n: number) => void; prefix?: string; suffix?: string; step?: number }) {
  return (
    <div className="relative">
      {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">{prefix}</span> : null}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className={clsx(inputCls, prefix && "pl-7", suffix && "pr-8")}
      />
      {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">{suffix}</span> : null}
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        on ? "bg-accent" : "bg-border-strong"
      )}
    >
      <span className={clsx("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13.5px] text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[12px] text-ink-faint">{label}</p>
      <p className={clsx("mt-1 font-display text-[24px]", tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-ink")}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11.5px] text-ink-faint">{sub}</p> : null}
    </div>
  );
}

/** Asks for a reason before something sensitive; calls onConfirm(reason). */
export function ReasonDialog({
  title,
  body,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <h2 className="font-display text-[20px] text-ink">{title}</h2>
        {body ? <p className="mt-1 text-[13.5px] text-ink-muted">{body}</p> : null}
        <Field label="Reason (recorded in the audit log)" className="mt-4">
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={inputCls} />
        </Field>
        <div className="mt-3">
          <ErrorLine message={error} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 rounded-lg px-4 text-sm text-ink-muted hover:bg-surface-raised">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || reason.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onConfirm(reason.trim());
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed.");
                setBusy(false);
              }
            }}
            className={clsx("h-10 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50", danger ? "bg-danger" : "bg-ink text-canvas dark:bg-accent dark:text-accent-ink")}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
