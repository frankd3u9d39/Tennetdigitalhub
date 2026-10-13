"use client";

import { useEffect, useRef } from "react";
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
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMobileNav } from "@/lib/mobile-nav";
import { useWallet } from "@/lib/wallet";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/verify/nin", label: "NIN verify", icon: Fingerprint },
  { href: "/verify/bvn", label: "BVN verify", icon: Landmark },
  { href: "/history", label: "History", icon: History },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { open, close } = useMobileNav();
  const { profile } = useWallet();

  // Close mobile drawer ONLY when route actually changes
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      close();
    }
  }, [pathname, close]);

  // Lock scroll and handle escape key when drawer is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const navItems = (onItemClick?: () => void) => (
    <>
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
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

      {isAdmin && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Admin
          </p>
          <Link
            href="/admin"
            onClick={onItemClick}
            className={clsx(
              "flex items-center gap-3 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-[13.5px] font-medium text-accent transition-colors hover:bg-accent/20",
              pathname.startsWith("/admin") && "ring-1 ring-accent"
            )}
          >
            <ShieldCheck size={16} strokeWidth={2} />
            Admin Portal
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">{navItems()}</nav>
      </aside>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-out sidebar drawer */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-200 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" onClick={close}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems(close)}
        </nav>

        {profile && (
          <div className="space-y-2 border-t border-border p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{profile.name}</p>
                <p className="truncate text-[11.5px] text-ink-faint">{profile.email}</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </>
  );
}


