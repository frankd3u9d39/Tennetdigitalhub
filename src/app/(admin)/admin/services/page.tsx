"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorLine, Field, NumberInput, PageHead, Toggle, adminApi, useAdminData } from "@/components/admin/kit";
import type { AllSettings, ServiceFlags } from "@/lib/pricing";

const SERVICES: { key: keyof ServiceFlags; label: string; hint: string }[] = [
  { key: "airtime", label: "Airtime", hint: "Top-ups for MTN, Glo, Airtel, 9mobile" },
  { key: "data", label: "Data bundles", hint: "" },
  { key: "electricity", label: "Electricity", hint: "Prepaid and postpaid meters" },
  { key: "cable", label: "Cable TV", hint: "DStv, GOtv, StarTimes…" },
  { key: "nin", label: "NIN verification & slips", hint: "Paid lookups" },
  { key: "bvn", label: "BVN verification & slips", hint: "Paid lookups" },
];

const PROVIDERS: { key: string; label: string; hint: string }[] = [
  { key: "ayglobal", label: "AYGlobalData", hint: "Airtime, data, electricity, cable (Primary VTU provider)" },
  { key: "vtugate", label: "VTUGate", hint: "Airtime, data, electricity, cable" },
];

export default function ServicesPage() {
  const { data, error, loading, reload } = useAdminData<AllSettings>("/api/admin/settings");
  const [busy, setBusy] = useState("");
  const [saveError, setSaveError] = useState("");
  const [alertDraft, setAlertDraft] = useState<number | null>(null);

  const save = async (key: "services" | "providers", value: unknown, tag: string) => {
    setBusy(tag);
    setSaveError("");
    try {
      await adminApi("/api/admin/settings", { method: "PUT", body: { key, value } });
      await reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy("");
    }
  };

  if (!data) return (
    <>
      <PageHead title="Services & providers" />
      <ErrorLine message={error} />
      {loading ? <div className="h-40 animate-shimmer rounded-2xl" /> : null}
    </>
  );

  const order = (data.providers.order ?? PROVIDERS.map((p) => p.key)).filter((k) => PROVIDERS.some((p) => p.key === k));
  const move = (key: string, delta: number) => {
    const next = [...order];
    const i = next.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    void save("providers", { ...data.providers, order: next }, "order");
  };
  const setProviderOn = (key: string, on: boolean) => {
    const disabled = on ? data.providers.disabled.filter((d) => d !== key) : [...new Set([...data.providers.disabled, key])];
    void save("providers", { ...data.providers, disabled }, key);
  };

  return (
    <>
      <PageHead title="Services & providers" subtitle="Switch a product off if a provider is down or you run out of float. Customers see “Unavailable” and cannot buy it." />
      <div className="space-y-6">
        <ErrorLine message={saveError || error} />
        <Card className="divide-y divide-border">
          {SERVICES.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[14px] text-ink">{s.label}</p>
                {s.hint ? <p className="text-[12px] text-ink-faint">{s.hint}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12.5px] text-ink-muted">{data.services[s.key] ? "On" : "Off"}</span>
                <Toggle label={s.label} on={data.services[s.key]} disabled={busy === s.key} onChange={(v) => save("services", { ...data.services, [s.key]: v }, s.key)} />
              </div>
            </div>
          ))}
        </Card>

        <div>
          <h2 className="font-display text-[19px] text-ink">Bill providers</h2>
          <p className="mb-3 mt-1 text-[13px] text-ink-muted">
            Orders go to the first provider in this list that is on. If it clearly fails, the next one is tried. If the result is unknown, nothing is retried, so a customer is never charged twice. A provider that is off in the server settings (Vercel) cannot be turned on from here.
          </p>
          <Card className="divide-y divide-border">
            {order.map((key, i) => {
              const p = PROVIDERS.find((x) => x.key === key);
              if (!p) return null;
              const on = !data.providers.disabled.includes(key);
              return (
                <div key={key} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <Badge>{i + 1}</Badge>
                    <div>
                      <p className="text-[14px] text-ink">{p.label}</p>
                      <p className="text-[12px] text-ink-faint">{p.hint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Move ${p.label} up`} disabled={i === 0 || busy === "order"} onClick={() => move(key, -1)} className="rounded-md border border-border p-1.5 text-ink-muted hover:text-ink disabled:opacity-30">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" aria-label={`Move ${p.label} down`} disabled={i === order.length - 1 || busy === "order"} onClick={() => move(key, 1)} className="rounded-md border border-border p-1.5 text-ink-muted hover:text-ink disabled:opacity-30">
                      <ArrowDown size={14} />
                    </button>
                    <Toggle label={`${p.label} enabled`} on={on} disabled={busy === key} onChange={(v) => setProviderOn(key, v)} />
                  </div>
                </div>
              );
            })}
          </Card>
          <Card className="mt-4 p-4">
            <p className="text-[14px] text-ink">Low-balance warning</p>
            <p className="mb-3 mt-1 text-[12.5px] text-ink-muted">
              Each provider fills orders from a balance you top up yourself. When it falls below this amount, the admin Overview and Provider health pages warn you. Separately, the app never takes a customer&apos;s money for an order the provider&apos;s balance can&apos;t cover: that order is refused and shows &ldquo;temporarily unavailable&rdquo;.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Warn me below" className="w-48">
                <NumberInput prefix="₦" value={alertDraft ?? data.providers.lowBalanceAlert} onChange={setAlertDraft} />
              </Field>
              <button
                type="button"
                disabled={alertDraft === null || !Number.isFinite(alertDraft) || alertDraft === data.providers.lowBalanceAlert || busy === "alert"}
                onClick={async () => {
                  await save("providers", { ...data.providers, lowBalanceAlert: alertDraft }, "alert");
                  setAlertDraft(null);
                }}
                className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50 dark:bg-accent dark:text-accent-ink"
              >
                {busy === "alert" ? "Saving…" : "Save"}
              </button>
            </div>
          </Card>
          {data.providers.order ? (
            <button type="button" onClick={() => save("providers", { ...data.providers, order: null }, "order")} className="mt-2 text-[13px] text-ink-muted underline hover:text-ink">
              Go back to the default order
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
