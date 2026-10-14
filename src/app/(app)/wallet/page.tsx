"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
  Landmark,
  Lock,
  Plus,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNaira, formatDate } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

const DEFAULT_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Zenith Bank", code: "057" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "OPay", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "Wema Bank (ALAT)", code: "035" },
];

export default function WalletPage() {
  return (
    <Suspense fallback={null}>
      <WalletContent />
    </Suspense>
  );
}

function WalletContent() {
  const { balance, ledger, loading, refresh } = useWallet();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"none" | "fund" | "withdraw">(
    searchParams.get("action") === "withdraw"
      ? "withdraw"
      : searchParams.get("action") === "fund"
      ? "fund"
      : "none"
  );

  // Deposit state
  const [amount, setAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [fundError, setFundError] = useState("");
  const [fundSuccess, setFundSuccess] = useState("");
  const [isTestMode, setIsTestMode] = useState(true);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  useEffect(() => {
    // Check if Paystack is running in test mode
    fetch("/api/wallet/fund")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.isTestMode === "boolean") {
          setIsTestMode(data.isTestMode);
        }
      })
      .catch(() => {});

    // Fetch banks
    fetch("/api/wallet/banks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.banks) && data.banks.length > 0) {
          setBanks(data.banks);
        }
      })
      .catch(() => {});
  }, []);

  const depositValue = Number(amount);
  const validDepositAmount =
    Number.isInteger(depositValue) && depositValue >= 100 && depositValue <= 1_000_000;

  const withdrawValue = Number(withdrawAmount);
  const validWithdrawAmount =
    Number.isInteger(withdrawValue) &&
    withdrawValue >= 100 &&
    withdrawValue <= balance;

  async function handleFundPaystack(e: React.FormEvent) {
    e.preventDefault();
    if (!validDepositAmount || funding || simulating) return;
    setFunding(true);
    setFundError("");
    setFundSuccess("");
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNaira: depositValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the payment.");
      window.location.assign(data.authorizationUrl);
    } catch (err) {
      setFundError(err instanceof Error ? err.message : "Could not start the payment.");
      setFunding(false);
    }
  }

  async function handleSimulateDeposit() {
    if (!validDepositAmount || funding || simulating) return;
    setSimulating(true);
    setFundError("");
    setFundSuccess("");
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNaira: depositValue, simulate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not complete test deposit.");
      setFundSuccess(
        `Test deposit of ${formatNaira(depositValue)} successful! (Ref: ${data.reference})`
      );
      setAmount("");
      await refresh();
    } catch (err) {
      setFundError(err instanceof Error ? err.message : "Could not complete test deposit.");
    } finally {
      setSimulating(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!validWithdrawAmount || withdrawing) return;
    if (accountNumber.replace(/\D/g, "").length !== 10) {
      setWithdrawError("Please enter a valid 10-digit account number.");
      return;
    }
    if (!selectedBank) {
      setWithdrawError("Please select a destination bank.");
      return;
    }
    if (!accountName.trim()) {
      setWithdrawError("Please enter the recipient account name.");
      return;
    }

    setWithdrawing(true);
    setWithdrawError("");
    setWithdrawSuccess("");

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountNaira: withdrawValue,
          bankName: selectedBank,
          accountNumber: accountNumber.replace(/\D/g, ""),
          accountName: accountName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal failed.");

      setWithdrawSuccess(
        `Withdrawal of ${formatNaira(withdrawValue)} to ${selectedBank} was submitted successfully! (Ref: ${data.reference})`
      );
      setWithdrawAmount("");
      setAccountNumber("");
      setAccountName("");
      await refresh();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Could not process withdrawal.");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <>
      <Topbar title="Wallet" subtitle="Fund your balance and review your ledger" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-3">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">
              Available balance
            </p>
            <p className="mt-2 font-display text-[36px] tracking-tight text-ink font-feature-tab">
              {formatNaira(balance)}
            </p>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <Button
                size="sm"
                variant={activeTab === "fund" ? "primary" : "secondary"}
                onClick={() => {
                  setActiveTab((v) => (v === "fund" ? "none" : "fund"));
                  setFundError("");
                  setFundSuccess("");
                }}
              >
                <Plus size={14} />
                Fund wallet
              </Button>
              <Button
                variant={activeTab === "withdraw" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab((v) => (v === "withdraw" ? "none" : "withdraw"));
                  setWithdrawError("");
                  setWithdrawSuccess("");
                }}
              >
                <ArrowUpRight size={14} />
                Withdraw
              </Button>
            </div>

            {/* Deposit Form */}
            {activeTab === "fund" && (
              <form
                onSubmit={handleFundPaystack}
                className="mt-5 space-y-4 rounded-xl border border-border bg-surface-raised p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="fund-amount" className="text-[12.5px] font-medium text-ink-muted">
                      Amount to add (₦100 – ₦1,000,000)
                    </label>
                    <span className="text-[11px] text-ink-faint">Min: ₦100</span>
                  </div>
                  <input
                    id="fund-amount"
                    autoFocus
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter amount (e.g. 5000)"
                    className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 font-mono text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                  />
                  {/* Quick presets */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1000, 2000, 5000, 10000, 20000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setAmount(String(preset))}
                        className="rounded-md border border-border bg-canvas px-2.5 py-1 text-[12px] font-mono text-ink-muted transition-colors hover:border-accent hover:text-ink"
                      >
                        +{formatNaira(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={funding || simulating || !validDepositAmount}
                  >
                    {funding
                      ? "Redirecting to Paystack…"
                      : validDepositAmount
                      ? `Pay ${formatNaira(depositValue)} with Paystack`
                      : "Enter an amount"}
                  </Button>

                  {isTestMode && validDepositAmount && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSimulateDeposit}
                      disabled={funding || simulating}
                      className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                    >
                      <Sparkles size={14} className="mr-1" />
                      {simulating ? "Crediting…" : "Instant Test Deposit (Sandbox)"}
                    </Button>
                  )}
                </div>

                {fundSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-accent-soft bg-accent-soft/20 px-3.5 py-2.5 text-accent-soft-ink">
                    <CheckCircle2 size={15} className="shrink-0 text-accent" />
                    <p className="text-[12.5px] font-medium">{fundSuccess}</p>
                  </div>
                )}

                {fundError && (
                  <div className="flex gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3.5 py-2.5">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
                    <p className="text-[12.5px] leading-relaxed text-danger">{fundError}</p>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-canvas/60 p-3 text-[12px] text-ink-muted">
                  <div className="flex items-start gap-2">
                    <HelpCircle size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                    <p className="leading-relaxed">
                      <strong>Paystack Checkout Notice:</strong> When redirected to Paystack, click{" "}
                      <strong>&quot;Card&quot;</strong> or <strong>&quot;Transfer&quot;</strong> on the left panel
                      to view and fill the test payment details.
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* Withdrawal Form */}
            {activeTab === "withdraw" && (
              <form
                onSubmit={handleWithdraw}
                className="mt-5 space-y-4 rounded-xl border border-border bg-surface-raised p-5"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Landmark size={16} className="text-accent" />
                    <h3 className="text-[14px] font-medium text-ink">Withdraw to Bank Account</h3>
                  </div>
                  <span className="text-[12px] text-ink-faint">
                    Available: <strong className="font-mono text-ink">{formatNaira(balance)}</strong>
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="withdraw-amount" className="text-[12.5px] font-medium text-ink-muted">
                        Amount to withdraw (NGN)
                      </label>
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(String(Math.floor(balance)))}
                        className="text-[11.5px] font-medium text-accent hover:underline"
                      >
                        Max ({formatNaira(balance)})
                      </button>
                    </div>
                    <input
                      id="withdraw-amount"
                      inputMode="numeric"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 5000"
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 font-mono text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>

                  <div>
                    <label htmlFor="destination-bank" className="text-[12.5px] font-medium text-ink-muted">
                      Destination bank
                    </label>
                    <select
                      id="destination-bank"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
                    >
                      <option value="">Select a bank</option>
                      {banks.map((b) => (
                        <option key={b.code + b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="account-number" className="text-[12.5px] font-medium text-ink-muted">
                        10-digit account number
                      </label>
                      <span className={`text-[11px] font-mono ${accountNumber.length === 10 ? "text-emerald-500 font-semibold" : "text-ink-faint"}`}>
                        {accountNumber.length}/10 digits
                      </span>
                    </div>
                    <input
                      id="account-number"
                      inputMode="numeric"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="0123456789"
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 font-mono text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                    {accountNumber.length > 0 && accountNumber.length < 10 && (
                      <p className="mt-1 text-[11px] text-amber-500">
                        Please enter all 10 digits ({10 - accountNumber.length} more needed).
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="account-name" className="text-[12.5px] font-medium text-ink-muted">
                      Account holder name
                    </label>
                    <input
                      id="account-name"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. IBEH PROMISE"
                      className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={withdrawing || !validWithdrawAmount || !selectedBank || accountNumber.length !== 10}
                  >
                    {withdrawing
                      ? "Processing withdrawal…"
                      : validWithdrawAmount
                      ? `Withdraw ${formatNaira(withdrawValue)}`
                      : "Enter amount and bank"}
                  </Button>
                </div>

                {withdrawSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-accent-soft bg-accent-soft/20 px-3.5 py-2.5 text-accent-soft-ink">
                    <CheckCircle2 size={15} className="shrink-0 text-accent" />
                    <p className="text-[12.5px] font-medium">{withdrawSuccess}</p>
                  </div>
                )}

                {withdrawError && (
                  <div className="flex gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3.5 py-2.5">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
                    <p className="text-[12.5px] leading-relaxed text-danger">{withdrawError}</p>
                  </div>
                )}
              </form>
            )}
          </Card>
        </div>

        <div>
          <h2 className="text-[15px] font-medium text-ink">Ledger</h2>
          <Card className="mt-4 divide-y divide-border p-0">
            {loading && (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                Loading ledger…
              </div>
            )}
            {!loading && ledger.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                No transactions yet.
              </div>
            )}
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                      (entry.direction === "credit"
                        ? "bg-accent-soft text-accent-soft-ink"
                        : "bg-surface-raised text-ink-muted")
                    }
                  >
                    {entry.direction === "credit" ? (
                      <ArrowDownLeft size={15} />
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {entry.label}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-faint">
                      {entry.detail}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {entry.status === "pending" && <Badge tone="warning">Processing</Badge>}
                  {entry.status === "failed" && <Badge tone="danger">Failed</Badge>}
                  <div className="text-right">
                    <p
                      className={
                        "font-mono text-[13.5px] " +
                        (entry.direction === "credit" ? "text-accent-soft-ink" : "text-ink")
                      }
                    >
                      {entry.direction === "credit" ? "+" : "-"}
                      {formatNaira(entry.amount)}
                    </p>
                    <p className="text-[11.5px] text-ink-faint">
                      {formatDate(entry.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </main>
    </>
  );
}
