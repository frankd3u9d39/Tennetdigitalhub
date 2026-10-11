"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/lib/wallet";
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
      <p className="mt-6 border-t border-border pt-5 text-[12px] text-ink-faint">
        Fund your wallet securely with Paystack by card, bank transfer or USSD. Purchases are paid from this balance.
      </p>
    </Card>
  );
}
