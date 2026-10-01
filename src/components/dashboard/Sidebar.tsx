"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutGrid,
  Fingerprint,
  Landmark,
  History,
  Wallet,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/verify/nin", label: "NIN verify", icon: Fingerprint },
  { href: "/verify/bvn", label: "BVN verify", icon: Landmark },
  { href: "/history", label: "History", icon: History },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-ink text-canvas dark:bg-accent dark:text-accent-ink"
                  : "text-ink-muted hover:bg-surface-raised hover:text-ink"
              )}
            >
              <item.icon size={16} strokeWidth={1.9} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <p className="text-[12.5px] font-medium text-ink">Sandbox mode</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
            Lookups return simulated data. No live registry is queried.
          </p>
        </div>
      </div>
    </aside>
  );
}
