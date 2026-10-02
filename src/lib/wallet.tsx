"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { currentUser } from "./mock-data";
import type { LedgerEntry, VerificationRecord } from "./types";

interface WalletContextValue {
  balance: number;
  loading: boolean;
  ledger: LedgerEntry[];
  verifications: VerificationRecord[];
  spend: (amount: number, label: string, detail?: string) => Promise<void>;
  credit: (amount: number, label: string, detail?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  balance: currentUser.walletBalance,
  loading: true,
  ledger: [],
  verifications: [],
  spend: async () => {},
  credit: async () => {},
  refresh: async () => {},
});

function mapLedger(raw: {
  id: string;
  label: string;
  detail?: string | null;
  amount: number;
  direction: string;
  status: string;
  createdAt: string;
}[]): LedgerEntry[] {
  return raw.map((entry) => ({
    id: entry.id,
    label: entry.label,
    detail: entry.detail ?? "",
    amount: entry.amount,
    direction: entry.direction as LedgerEntry["direction"],
    status: entry.status as LedgerEntry["status"],
    timestamp: entry.createdAt,
  }));
}

function mapVerifications(raw: {
  id: string;
  type: string;
  queried: string;
  subjectName?: string | null;
  status: string;
  cost: number;
  createdAt: string;
}[]): VerificationRecord[] {
  return raw.map((record) => ({
    id: record.id,
    type: record.type as VerificationRecord["type"],
    queried: record.queried,
    subjectName: record.subjectName ?? "—",
    status: record.status as VerificationRecord["status"],
    cost: record.cost,
    timestamp: record.createdAt,
  }));
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(currentUser.walletBalance);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await fetch("/api/account");
      if (!res.ok) return;
      const data = await res.json();
      setBalance(data.balance);
      setLedger(mapLedger(data.ledger));
      setVerifications(mapVerifications(data.verifications));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runTransaction(
    direction: "credit" | "debit",
    amount: number,
    label: string,
    detail?: string
  ) {
    const res = await fetch("/api/wallet/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, amount, label, detail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Transaction failed.");
    await refresh();
  }

  const spend = (amount: number, label: string, detail?: string) =>
    runTransaction("debit", amount, label, detail);

  const credit = (amount: number, label: string, detail?: string) =>
    runTransaction("credit", amount, label, detail);

  return (
    <WalletContext.Provider
      value={{ balance, loading, ledger, verifications, spend, credit, refresh }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
