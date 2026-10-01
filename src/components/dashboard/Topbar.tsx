import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletBalancePill } from "@/components/dashboard/WalletBalancePill";
import { currentUser } from "@/lib/mock-data";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-canvas/85 px-6 backdrop-blur lg:px-8">
      <div>
        <h1 className="text-[16px] font-medium text-ink">{title}</h1>
        {subtitle ? (
          <p className="text-[12.5px] text-ink-faint">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <WalletBalancePill />
        <ThemeToggle />
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-[13px] text-canvas dark:bg-accent dark:text-accent-ink"
        >
          {currentUser.initials}
        </Link>
      </div>
    </header>
  );
}
