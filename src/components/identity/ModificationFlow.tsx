"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  FileEdit,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
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

type ModificationType =
  | "nin_validation"
  | "nin_name_modification"
  | "nin_phone_modification"
  | "nin_address_modification";

const SERVICE_OPTIONS: { id: ModificationType; title: string; desc: string; price: number }[] = [
  {
    id: "nin_validation",
    title: "NIN Validation",
    desc: "Cross-check NIN digits and date of birth against the live register.",
    price: 6500,
  },
  {
    id: "nin_name_modification",
    title: "Name Correction",
    desc: "Update misspelt surname, firstname, or middlename on the NIN record.",
    price: 17500,
  },
  {
    id: "nin_phone_modification",
    title: "Phone Number Update",
    desc: "Update the registered mobile phone number tied to the NIN.",
    price: 17500,
  },
  {
    id: "nin_address_modification",
    title: "Address Correction",
    desc: "Update the residential address on the national identity database.",
    price: 17500,
  },
];

export function ModificationFlow({ service }: Props) {
  const isValidation = service.slug === "nin-validation";
  const [activeTab, setActiveTab] = useState<"order" | "status">("order");
  const [serviceType, setServiceType] = useState<ModificationType>(
    isValidation ? "nin_validation" : "nin_name_modification"
  );

  // Form Fields
  const [nin, setNin] = useState("");
  const [surname, setSurname] = useState("");
  const [firstname, setFirstname] = useState("");
  const [middlename, setMiddlename] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [newFirstname, setNewFirstname] = useState("");
  const [newMiddlename, setNewMiddlename] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);

  // States
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Status Tab
  const [searchRef, setSearchRef] = useState("");
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");

  const { balance, refresh } = useWallet();
  const activeOption = SERVICE_OPTIONS.find((s) => s.id === serviceType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrderSuccess(null);

    const cleanNin = nin.trim();
    if (!/^\d{11}$/.test(cleanNin)) {
      setError("Please enter a valid 11-digit NIN.");
      return;
    }
    if (!consent) {
      setError("You must confirm customer authorization and legal consent.");
      return;
    }
    if (balance !== null && balance < activeOption.price) {
      setError(`Insufficient wallet balance. You need at least ${formatNaira(activeOption.price)}.`);
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        service_type: serviceType,
        consent: true,
      };

      if (serviceType === "nin_validation") {
        if (!dob) {
          setError("Date of birth is required for NIN validation.");
          setBusy(false);
          return;
        }
        payload.nin_digits = cleanNin;
        payload.date_of_birth = dob;
      } else {
        payload.nin = cleanNin;
        payload.surname = surname.trim().toUpperCase();
        payload.firstname = firstname.trim().toUpperCase();
        payload.middlename = middlename.trim().toUpperCase();
        payload.phone_number = phoneNumber.trim();

        if (serviceType === "nin_name_modification") {
          payload.new_surname = newSurname.trim().toUpperCase();
          payload.new_firstname = newFirstname.trim().toUpperCase();
          payload.new_middlename = newMiddlename.trim().toUpperCase();
        } else if (serviceType === "nin_phone_modification") {
          payload.new_phone_number = newPhoneNumber.trim();
        } else if (serviceType === "nin_address_modification") {
          payload.new_address = newAddress.trim();
        }
      }

      const res = await fetch("/api/verify/nin-modification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order submission failed.");
      }

      setOrderSuccess(data);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  };

  const checkStatus = async (refToSearch?: string) => {
    const targetRef = (refToSearch || searchRef).trim();
    if (!targetRef) {
      setStatusError("Please enter an Order Reference ID.");
      return;
    }
    setStatusBusy(true);
    setStatusError("");
    try {
      const res = await fetch(`/api/verify/nin-modification?reference_id=${encodeURIComponent(targetRef)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not retrieve status.");
      }
      setStatusResult(data);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to fetch status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Topbar title={service.name} subtitle={service.description} />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Main Mode Tabs */}
          <div className="flex rounded-xl bg-surface-raised p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("order")}
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all ${
                activeTab === "order"
                  ? "bg-surface text-ink shadow-sm dark:bg-canvas"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Submit Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("status")}
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-medium transition-all ${
                activeTab === "status"
                  ? "bg-surface text-ink shadow-sm dark:bg-canvas"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Track Order Status
            </button>
          </div>

          {activeTab === "order" ? (
            <>
              {/* Service Selection Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setServiceType(opt.id);
                      setOrderSuccess(null);
                      setError("");
                    }}
                    className={`rounded-xl p-4 text-left border transition-all ${
                      serviceType === opt.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-surface hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-ink">{opt.title}</h4>
                      <span className="font-mono text-xs font-semibold text-accent">{formatNaira(opt.price)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Order Form Card */}
              <Card className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-border pb-4">
                    <h3 className="font-semibold text-base text-ink">{activeOption.title}</h3>
                    <p className="text-xs text-ink-muted">Processed within 24–48 hours by our partner fulfillment team.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink uppercase">NIN (11 Digits)</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={nin}
                      onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 12345678901"
                      required
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                  </div>

                  {serviceType === "nin_validation" ? (
                    <div>
                      <label className="block text-xs font-medium text-ink uppercase">Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required
                        className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-ink uppercase">Current Surname</label>
                          <input
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            placeholder="Current surname"
                            required
                            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink uppercase focus:border-accent focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink uppercase">Current Firstname</label>
                          <input
                            type="text"
                            value={firstname}
                            onChange={(e) => setFirstname(e.target.value)}
                            placeholder="Current firstname"
                            required
                            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink uppercase focus:border-accent focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-ink uppercase">Current Middlename</label>
                          <input
                            type="text"
                            value={middlename}
                            onChange={(e) => setMiddlename(e.target.value)}
                            placeholder="Optional"
                            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink uppercase focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink uppercase">Current Phone Number</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. 08012345678"
                          required
                          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                        />
                      </div>

                      {/* Type-Specific New Details */}
                      {serviceType === "nin_name_modification" && (
                        <div className="rounded-xl bg-surface-raised p-4 border border-border space-y-4">
                          <h4 className="text-xs font-bold uppercase text-accent">New Legal Name Fields</h4>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <label className="block text-xs font-medium text-ink uppercase">New Surname</label>
                              <input
                                type="text"
                                value={newSurname}
                                onChange={(e) => setNewSurname(e.target.value)}
                                placeholder="New surname"
                                required
                                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink uppercase focus:border-accent focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-ink uppercase">New Firstname</label>
                              <input
                                type="text"
                                value={newFirstname}
                                onChange={(e) => setNewFirstname(e.target.value)}
                                placeholder="New firstname"
                                required
                                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink uppercase focus:border-accent focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-ink uppercase">New Middlename</label>
                              <input
                                type="text"
                                value={newMiddlename}
                                onChange={(e) => setNewMiddlename(e.target.value)}
                                placeholder="Optional"
                                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink uppercase focus:border-accent focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {serviceType === "nin_phone_modification" && (
                        <div className="rounded-xl bg-surface-raised p-4 border border-border">
                          <label className="block text-xs font-bold uppercase text-accent">New Phone Number to Link</label>
                          <input
                            type="tel"
                            value={newPhoneNumber}
                            onChange={(e) => setNewPhoneNumber(e.target.value)}
                            placeholder="e.g. 08099999999"
                            required
                            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                          />
                        </div>
                      )}

                      {serviceType === "nin_address_modification" && (
                        <div className="rounded-xl bg-surface-raised p-4 border border-border">
                          <label className="block text-xs font-bold uppercase text-accent">New Residential Address</label>
                          <textarea
                            rows={3}
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            placeholder="e.g. 15 Allen Avenue, Ikeja, Lagos"
                            required
                            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Summary & Price */}
                  <div className="rounded-xl bg-surface-raised p-4 flex items-center justify-between border border-border">
                    <span className="text-sm text-ink-muted">Order Processing Fee</span>
                    <span className="text-base font-bold text-ink">{formatNaira(activeOption.price)}</span>
                  </div>

                  {/* Consent */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-[12.5px] leading-snug text-ink-muted">
                      I confirm that the applicant has provided full legal documentation (e.g. Sworn Court Affidavit / Publication) and authorized this modification order.
                    </span>
                  </label>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-[13px] text-red-600 dark:text-red-400">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={busy} className="w-full" size="lg">
                    {busy ? "Submitting Order..." : `Submit Modification Order (${formatNaira(activeOption.price)})`}
                  </Button>
                </form>
              </Card>

              {/* Order Success Card */}
              {orderSuccess && (
                <Card className="p-6 sm:p-8 border-accent/40 bg-surface">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-ink">Order Submitted Successfully</h3>
                      <p className="text-xs text-ink-faint">Review and fulfillment in progress</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 text-sm">
                    <div className="rounded-xl bg-surface-raised p-4 border border-border">
                      <p className="text-xs font-semibold text-ink-faint uppercase">Order Reference ID</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-base font-bold text-accent">{orderSuccess.providerRef}</span>
                        <button
                          type="button"
                          onClick={() => copyRef(orderSuccess.providerRef)}
                          className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                        >
                          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} Copy
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-ink-faint">
                        Keep this reference to check your order progress in the &ldquo;Track Order Status&rdquo; tab.
                      </p>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border text-xs">
                      <span className="text-ink-muted">Initial Status</span>
                      <Badge tone="warning">Pending Staff Review</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-ink-muted">Expected Completion</span>
                      <span className="font-medium text-ink">Within 24–48 Hours</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearchRef(orderSuccess.providerRef);
                        setActiveTab("status");
                        void checkStatus(orderSuccess.providerRef);
                      }}
                    >
                      Track This Order
                    </Button>
                    <Button size="sm" onClick={() => setOrderSuccess(null)}>
                      Place Another Order
                    </Button>
                  </div>
                </Card>
              )}
            </>
          ) : (
            /* Status Tracking Tab */
            <Card className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Check Modification Status</h3>
                <p className="text-xs text-ink-muted">
                  Enter your order reference ID (e.g. NM_API_...) to see real-time fulfillment status.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  placeholder="e.g. NM_API_251021154942_59E172"
                  className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                />
                <Button onClick={() => checkStatus()} disabled={statusBusy}>
                  {statusBusy ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  <span className="ml-1.5">Check</span>
                </Button>
              </div>

              {statusError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={15} />
                  <span>{statusError}</span>
                </div>
              )}

              {statusResult && (
                <div className="rounded-xl bg-surface-raised p-5 border border-border space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-xs text-ink-faint uppercase font-medium">Service</p>
                      <h4 className="font-semibold text-ink text-sm">
                        {statusResult.service_name || statusResult.service_type || "NIN Modification"}
                      </h4>
                    </div>
                    <Badge
                      tone={
                        statusResult.status === "completed"
                          ? "success"
                          : statusResult.status === "rejected"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {String(statusResult.status || "processing").toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-ink-faint">Reference ID:</span>
                      <p className="font-mono font-medium text-ink mt-0.5">{statusResult.reference_id}</p>
                    </div>
                    {statusResult.submitted_at && (
                      <div>
                        <span className="text-ink-faint">Submitted:</span>
                        <p className="font-medium text-ink mt-0.5">{statusResult.submitted_at}</p>
                      </div>
                    )}
                    {statusResult.completed_at && (
                      <div>
                        <span className="text-ink-faint">Completed:</span>
                        <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {statusResult.completed_at}
                        </p>
                      </div>
                    )}
                  </div>

                  {statusResult.status_detail || statusResult.notes ? (
                    <div className="rounded-lg bg-surface p-3 text-xs text-ink-muted border border-border">
                      {statusResult.status_detail || statusResult.notes}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
