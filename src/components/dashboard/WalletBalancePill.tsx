"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { formatNaira } from "@/lib/format";

export function WalletBalancePill() {
  const { balance } = useWallet();
  return (
    <Link
      href="/wallet"
      className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-border-strong hover:text-ink sm:flex"
    >
      <Wallet size={14} />
      <span className="font-mono font-medium text-ink">{formatNaira(balance)}</span>
    </Link>
  );
}
