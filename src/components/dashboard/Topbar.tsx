"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/Avatar";
import { WalletBalancePill } from "@/components/dashboard/WalletBalancePill";
import { useWallet } from "@/lib/wallet";
import { useMobileNav } from "@/lib/mobile-nav";

export function Topbar({
  title,
  subtitle,
  greeting,
}: {
  title: string;
  subtitle?: string;
  greeting?: boolean;
}) {
  const { profile } = useWallet();
  const { toggle } = useMobileNav();
  const firstName = profile?.name?.split(" ")[0];

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-canvas/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-canvas text-ink transition-colors hover:bg-surface-raised active:scale-95 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-[16px] font-medium text-ink">{title}</h1>
          {greeting ? (
            <p className="text-[12.5px] text-ink-faint">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </p>
          ) : subtitle ? (
            <p className="text-[12.5px] text-ink-faint">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <WalletBalancePill />
        <ThemeToggle />
        <Link href="/settings" aria-label="Settings">
          <Avatar name={profile?.name} src={profile?.avatarUrl} className="h-9 w-9 text-[13px]" />
        </Link>
      </div>
    </header>
  );
}

