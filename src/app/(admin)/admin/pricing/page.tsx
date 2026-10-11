"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorLine, Field, NumberInput, PageHead, adminApi, naira, useAdminData } from "@/components/admin/kit";
import { BILL_KINDS, chargeFor, feeFor, type AllSettings, type BillKind, type IdentityType, type PricingSettings } from "@/lib/pricing";
import { IDENTITY_LABEL } from "@/lib/identity-prices";

const KIND_LABEL: Record<BillKind, string> = { airtime: "Airtime", data: "Data bundles", electricity: "Electricity", cable: "Cable TV" };
const IDS: IdentityType[] = ["nin", "bvn"];
const bad = (n: number) => !Number.isFinite(n);

export default function PricingPage() {
  const { data, error, loading, reload } = useAdminData<AllSettings>("/api/admin/settings");
  const [draft, setDraft] = useState<PricingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setDraft(structuredClone(data.pricing));
  }, [data]);

  if (!draft) return (
    <>
      <PageHead title="Pricing" />
      <ErrorLine message={error} />
      {loading ? <div className="h-40 animate-shimmer rounded-2xl" /> : null}
    </>
  );

  const edit = (fn: (d: PricingSettings) => void) => {
    const next = structuredClone(draft);
    fn(next);
    setDraft(next);
    setSaved(false);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(data?.pricing);
  const invalid = JSON.stringify(draft).includes("null"); // NaN serialises as null

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await adminApi("/api/admin/settings", { method: "PUT", body: { key: "pricing", value: draft } });
      setSaved(true);
      await reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const margin = (price: number, cost: number) => {
    if (bad(price) || bad(cost)) return "—";
    const m = price - cost;
    return `${m < 0 ? "−" : ""}${naira(Math.abs(m))}`;
  };

  return (
    <>
      <PageHead title="Pricing" subtitle="Changes reach customers within about 15 seconds. A customer who already had the old price on screen is shown the new one before paying." />
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="font-display text-[19px] text-ink">Identity lookups & slips</h2>
          <p className="mb-4 text-[13px] text-ink-muted">“Price” is what the customer pays. “Your cost” is what the provider charges you; it only feeds the margin shown in the overview.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="text-[12px] text-ink-faint">
                <tr>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  <th className="py-2 pr-3 font-medium">Your cost</th>
                  <th className="py-2 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {IDS.map((t) => (
                  <Rows key={t}>
                    <tr className="border-t border-border">
                      <td className="py-2 pr-3 text-ink">{IDENTITY_LABEL[t]}</td>
                      <td className="py-2 pr-3"><NumberInput prefix="₦" value={draft.identity[t]} onChange={(n) => edit((d) => (d.identity[t] = n))} /></td>
                      <td className="py-2 pr-3"><NumberInput prefix="₦" value={draft.identityCost[t]} onChange={(n) => edit((d) => (d.identityCost[t] = n))} /></td>
                      <td className="py-2 text-ink-muted">{margin(draft.identity[t], draft.identityCost[t])}</td>
                    </tr>
                    {(["standard", "premium"] as const).map((tier) => (
                      <tr key={tier} className="border-t border-border">
                        <td className="py-2 pr-3 text-ink">{IDENTITY_LABEL[t]} slip, {tier}</td>
                        <td className="py-2 pr-3"><NumberInput prefix="₦" value={draft.slips[t][tier]} onChange={(n) => edit((d) => (d.slips[t][tier] = n))} /></td>
                        <td className="py-2 pr-3"><NumberInput prefix="₦" value={draft.slipCost[t][tier]} onChange={(n) => edit((d) => (d.slipCost[t][tier] = n))} /></td>
                        <td className="py-2 text-ink-muted">{margin(draft.slips[t][tier], draft.slipCost[t][tier])}</td>
                      </tr>
                    ))}
                  </Rows>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-[19px] text-ink">Bills & top-ups: your markup</h2>
          <p className="mb-4 text-[13px] text-ink-muted">
            Bill prices come from the provider. Your markup is added on top: a percentage and/or a flat fee, rounded up to whole naira. The customer sees it as a separate service-fee line.
          </p>
          <div className="space-y-4">
            {BILL_KINDS.map((k) => {
              const m = draft.markup[k];
              const ok = !bad(m.percent) && !bad(m.flat);
              return (
                <div key={k} className="grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-[140px_1fr_1fr_1.2fr]">
                  <p className="text-[14px] text-ink">{KIND_LABEL[k]}</p>
                  <Field label="Percentage"><NumberInput suffix="%" step={0.1} value={m.percent} onChange={(n) => edit((d) => (d.markup[k].percent = n))} /></Field>
                  <Field label="Flat fee"><NumberInput prefix="₦" value={m.flat} onChange={(n) => edit((d) => (d.markup[k].flat = n))} /></Field>
                  <p className="pb-2 text-[12.5px] text-ink-muted">
                    {ok ? `₦1,000 → customer pays ${naira(chargeFor(1000, m))} (fee ${naira(feeFor(1000, m))})` : "Enter both numbers"}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg">
          <button type="button" onClick={save} disabled={!dirty || invalid || saving} className="h-10 rounded-lg bg-ink px-5 text-sm font-medium text-canvas disabled:opacity-50 dark:bg-accent dark:text-accent-ink">
            {saving ? "Saving…" : "Save prices"}
          </button>
          <button type="button" onClick={() => data && (setDraft(structuredClone(data.pricing)), setSaved(false))} disabled={!dirty || saving} className="h-10 rounded-lg px-3 text-sm text-ink-muted hover:bg-surface-raised disabled:opacity-50">
            Discard
          </button>
          {saved && !dirty ? <span className="text-[13px] text-accent-soft-ink">Saved. Live for customers shortly.</span> : null}
          {invalid ? <span className="text-[13px] text-warn">Fill in every number.</span> : null}
          <ErrorLine message={saveError} />
        </div>
      </div>
    </>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
