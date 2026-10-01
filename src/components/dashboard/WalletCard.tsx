"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/lib/wallet";
import { currentUser } from "@/lib/mock-data";
import { formatNaira } from "@/lib/format";

export function WalletCard() {
  const { balance } = useWallet();

  return (
    <Card className="p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">
            Available balance
          </p>
          <p className="mt-2 font-display text-[36px] tracking-tight text-ink font-feature-tab">
            {formatNaira(balance)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button as={Link} href="/wallet" size="sm">
            <Plus size={14} />
            Fund wallet
          </Button>
          <Button as={Link} href="/wallet" variant="secondary" size="sm">
            Withdraw
          </Button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        {currentUser.accounts.map((account) => (
          <div
            key={account.number}
            className="rounded-xl border border-border bg-surface-raised px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-faint">{account.bank}</span>
              <Badge tone="neutral" className="normal-case">
                {account.label}
              </Badge>
            </div>
            <p className="mt-1.5 font-mono text-[14px] text-ink">{account.number}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
