"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, Briefcase, CheckCircle2, Copy, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import type { ServiceItem } from "@/lib/types";

interface Props {
  service: ServiceItem;
}

type CacType = "business_name" | "company_1m" | "ngo";

const CAC_OPTIONS: { id: CacType; title: string; desc: string; price: number }[] = [
  {
    id: "business_name",
    title: "Business Name (Sole / Partnership)",
    desc: "For small businesses, enterprises, ventures, and sole proprietorships.",
    price: 18000,
  },
  {
    id: "company_1m",
    title: "Private Limited Company (LTD)",
    desc: "1 Million Share Capital incorporation with Corporate Affairs Commission.",
    price: 45000,
  },
  {
    id: "ngo",
    title: "NGO / Incorporated Trustees",
    desc: "For foundations, clubs, associations, churches, and non-profits.",
    price: 85000,
  },
];

export function CacFlow({ service }: Props) {
  const [cacType, setCacType] = useState<CacType>("business_name");
  const [ownerName, setOwnerName] = useState("");
  const [businessName1, setBusinessName1] = useState("");
  const [businessName2, setBusinessName2] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { balance, refresh } = useWallet();
  const selectedOption = CAC_OPTIONS.find((c) => c.id === cacType)!;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Passport image must be smaller than 5MB.");
        return;
      }
      setPassportFile(file);
      setPassportPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!ownerName.trim()) {
      setError("Please provide the Owner or Director's full legal name.");
      return;
    }
    if (!passportFile) {
      setError("Please upload a passport photograph of the owner / director.");
      return;
    }
    if (balance !== null && balance < selectedOption.price) {
      setError(`Insufficient wallet balance. You need at least ${formatNaira(selectedOption.price)}.`);
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("type", cacType);
      const compositeName = `${ownerName.trim()} (${businessName1.trim() || "Registration"})`;
      fd.append("ownerFullname", compositeName);
      fd.append("passport", passportFile);

      const res = await fetch("/api/cac/register", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "CAC registration submission failed.");
      }

      setSuccess(data);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Topbar title="CAC Registration" subtitle="Register a business name or company with Corporate Affairs Commission" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Categories */}
          <div className="grid gap-3 sm:grid-cols-3">
            {CAC_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCacType(opt.id);
                  setError("");
                }}
                className={`rounded-xl p-4 text-left border transition-all ${
                  cacType === opt.id
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-ink">{opt.title}</h4>
                </div>
                <p className="mt-1 font-mono text-sm font-bold text-accent">{formatNaira(opt.price)}</p>
                <p className="mt-1 text-[11.5px] text-ink-muted leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>

          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-border pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base text-ink">{selectedOption.title}</h3>
                  <p className="text-xs text-ink-muted">Official filing submitted to CAC via AYGlobalData accredited desk.</p>
                </div>
                <Badge tone="accent">{formatNaira(selectedOption.price)}</Badge>
              </div>

              {/* Proposed Business Names */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-ink uppercase">Proposed Business Name (Choice 1)</label>
                  <input
                    type="text"
                    value={businessName1}
                    onChange={(e) => setBusinessName1(e.target.value)}
                    placeholder="e.g. Zenith Tech Solutions"
                    required
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink uppercase">Proposed Name (Alternative 2)</label>
                  <input
                    type="text"
                    value={businessName2}
                    onChange={(e) => setBusinessName2(e.target.value)}
                    placeholder="e.g. Zenith Technologies Nig"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Owner Info */}
              <div>
                <label className="block text-xs font-medium text-ink uppercase">Proprietor / Director Full Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Musa Ibrahim Adebayo"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-ink uppercase">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink uppercase">Official Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. business@domain.com"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Passport Upload */}
              <div>
                <label className="block text-xs font-medium text-ink uppercase mb-1.5">
                  Owner / Director Passport Photograph
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-raised p-6 text-center hover:border-accent cursor-pointer transition-colors"
                >
                  {passportPreview ? (
                    <div className="flex flex-col items-center space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={passportPreview}
                        alt="Passport preview"
                        className="h-28 w-28 rounded-lg object-cover shadow-sm border border-border"
                      />
                      <span className="text-xs text-accent font-medium">Click to change photograph</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-2">
                        <Upload size={20} />
                      </div>
                      <p className="text-sm font-medium text-ink">Upload Passport Photo (JPG or PNG)</p>
                      <p className="text-xs text-ink-faint mt-1">Clear white background, max 5MB</p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={busy} className="w-full" size="lg">
                {busy ? "Submitting Filing..." : `Submit CAC Application (${formatNaira(selectedOption.price)})`}
              </Button>
            </form>
          </Card>

          {/* Success card */}
          {success && (
            <Card className="p-6 sm:p-8 border-accent/40 bg-surface">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-ink">Application Submitted to CAC</h3>
                  <p className="text-xs text-ink-faint">Filing will be reviewed and registered with Corporate Affairs Commission</p>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="rounded-xl bg-surface-raised p-4 border border-border">
                  <p className="text-xs font-semibold text-ink-faint uppercase">Filing Reference</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-accent">{success.reference}</span>
                    <button
                      type="button"
                      onClick={() => copyRef(success.reference)}
                      className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} Copy
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border text-xs">
                  <span className="text-ink-muted">Application Type</span>
                  <span className="font-medium text-ink">{selectedOption.title}</span>
                </div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-ink-muted">Estimated Turnaround</span>
                  <span className="font-medium text-ink">3–7 Business Days</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <Button size="sm" onClick={() => setSuccess(null)}>
                  Register Another Business
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
