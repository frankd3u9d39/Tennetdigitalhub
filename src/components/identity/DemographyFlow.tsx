"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Search, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { postJson } from "@/lib/http-client";
import { useWallet } from "@/lib/wallet";
import type { ServiceItem } from "@/lib/types";

interface Props {
  service: ServiceItem;
}

const PRICE = 400;

export function DemographyFlow({ service }: Props) {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { balance, refresh } = useWallet();
  const ready = firstname.trim() && lastname.trim() && gender && dob && consent;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!firstname.trim() || !lastname.trim() || !gender || !dob) {
      setError("Enter first name, surname, gender and date of birth.");
      return;
    }
    if (!consent) {
      setError("Please confirm customer consent before searching.");
      return;
    }
    if (balance !== null && balance < PRICE) {
      setError(`Insufficient wallet balance. You need at least ${formatNaira(PRICE)}.`);
      return;
    }

    setBusy(true);
    try {
      const data = await postJson<typeof result>("/api/verify/retrieval", {
        type: "nin_demography",
        demographics: { firstname: firstname.trim(), lastname: lastname.trim(), gender, dob },
        consent: true,
      });
      setResult(data);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyText = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const data = result?.data;
  const nin = data?.nin;
  const inputCls =
    "mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent";

  return (
    <>
      <Topbar title={service.name} subtitle={service.description} />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="d-first" className="text-[12.5px] font-medium text-ink-muted">First name</label>
                  <input id="d-first" value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="e.g. JOHN" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="d-last" className="text-[12.5px] font-medium text-ink-muted">Surname</label>
                  <input id="d-last" value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="e.g. ADEBAYO" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="d-gender" className="text-[12.5px] font-medium text-ink-muted">Gender</label>
                  <select id="d-gender" value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="d-dob" className="text-[12.5px] font-medium text-ink-muted">Date of birth</label>
                  <input id="d-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3.5 py-2.5">
                <span className="text-[13px] text-ink-muted">Service Fee</span>
                <span className="font-semibold text-ink">{formatNaira(PRICE)}</span>
              </div>

              <label className="flex items-start gap-2.5 text-[12.5px] text-ink-muted">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                <span>I confirm that the applicant has granted lawful consent to retrieve their identity records in accordance with the NDPR.</span>
              </label>

              {error ? (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">{error}</p>
              ) : null}

              <Button type="submit" disabled={busy || !ready} className="w-full">
                <Search size={16} />
                {busy ? "Searching…" : `Search & Retrieve (${formatNaira(PRICE)})`}
              </Button>
            </form>
          </Card>

          {data ? (
            <Card className="overflow-hidden border-accent/30 bg-surface p-6 sm:p-8 animate-fade-in">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <Badge tone="success" className="mb-2">Match Found</Badge>
                  <h3 className="text-lg font-semibold text-ink">
                    {[data.firstname, data.middlename, data.surname || data.lastname].filter(Boolean).join(" ")}
                  </h3>
                  <p className="text-xs text-ink-faint">Ref: {result.reference}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={16} /> Verified
                </div>
              </div>

              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-raised p-3.5">
                  <p className="text-xs font-medium uppercase text-ink-faint">National Identification Number (NIN)</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-mono text-base font-bold text-ink">{nin || "—"}</p>
                    {nin ? (
                      <button type="button" onClick={() => copyText(String(nin))} className="p-1 text-accent hover:opacity-80" title="Copy NIN">
                        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface-raised p-3.5">
                  <p className="text-xs font-medium uppercase text-ink-faint">Phone</p>
                  <p className="mt-1 font-mono font-semibold text-ink">{data.telephoneno || data.phone || "—"}</p>
                </div>
                {data.birthdate || data.dob ? (
                  <div className="rounded-xl border border-border bg-surface-raised p-3.5">
                    <p className="text-xs font-medium uppercase text-ink-faint">Date of Birth</p>
                    <p className="mt-1 font-medium text-ink">{data.birthdate || data.dob}</p>
                  </div>
                ) : null}
                {data.gender ? (
                  <div className="rounded-xl border border-border bg-surface-raised p-3.5">
                    <p className="text-xs font-medium uppercase text-ink-faint">Gender</p>
                    <p className="mt-1 font-medium text-ink">{data.gender}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                <Button variant="secondary" size="sm" onClick={() => setResult(null)}>New Search</Button>
                <Button as={Link} href="/verify/nin" size="sm">Run Full Verification</Button>
              </div>
            </Card>
          ) : null}
        </div>
      </main>
    </>
  );
}
