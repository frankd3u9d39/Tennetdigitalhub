"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { LedgerEntry, VerificationRecord } from "./types";

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  role: string | null;
  reference: string | null;
  memberSince: string | null;
}

interface WalletContextValue {
  balance: number;
  loading: boolean;
  profile: AccountProfile | null;
  ledger: LedgerEntry[];
  verifications: VerificationRecord[];
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  balance: 0,
  loading: true,
  profile: null,
  ledger: [],
  verifications: [],
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
  kind?: string;
  createdAt: string;
}[]): VerificationRecord[] {
  return raw.map((record) => ({
    id: record.id,
    type: record.type as VerificationRecord["type"],
    queried: record.queried,
    subjectName: record.subjectName ?? "—",
    status: record.status as VerificationRecord["status"],
    cost: record.cost,
    kind: record.kind === "slip" ? "slip" : "lookup",
    timestamp: record.createdAt,
  }));
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await fetch("/api/account");
      if (!res.ok) return;
      const data = await res.json();
      setBalance(data.balance);
      setProfile(data.user);
      setLedger(mapLedger(data.ledger));
      setVerifications(mapVerifications(data.verifications));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <WalletContext.Provider
      value={{ balance, loading, profile, ledger, verifications, refresh }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
