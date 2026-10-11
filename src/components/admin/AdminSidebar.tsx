"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Activity, Banknote, ClipboardList, Gauge, Receipt, SlidersHorizontal, Tags, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/fundings", label: "Wallet funding", icon: Banknote },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/services", label: "Services & providers", icon: SlidersHorizontal },
  { href: "/admin/providers", label: "Provider health", icon: Activity },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const items = nav.map((item) => {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={clsx(
          "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
          active ? "bg-ink text-canvas dark:bg-accent dark:text-accent-ink" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
        )}
      >
        <item.icon size={16} strokeWidth={1.9} />
        {item.label}
      </Link>
    );
  });

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/admin">
            <Logo />
          </Link>
        </div>
        <p className="px-6 pt-4 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Admin</p>
        <nav className="flex-1 space-y-1 px-3 py-3">{items}</nav>
        <div className="space-y-2 border-t border-border p-4">
          <p className="truncate text-[12px] text-ink-faint" title={email}>
            {email}
          </p>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile: a scrolling bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface lg:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/admin">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{items}</nav>
      </div>
    </>
  );
}
