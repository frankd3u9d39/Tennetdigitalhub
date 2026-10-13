"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  ArrowLeft,
  Banknote,
  ClipboardList,
  Gauge,
  Menu,
  Receipt,
  SlidersHorizontal,
  Tags,
  Users,
  X,
} from "lucide-react";
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
  const [open, setOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll and handle escape key when drawer is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const items = nav.map((item) => {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
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
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/admin">
            <Logo />
          </Link>
        </div>
        <p className="px-6 pt-4 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Admin</p>
        <nav className="flex-1 space-y-1 px-3 py-3">{items}</nav>
        <div className="space-y-2 border-t border-border p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>User Dashboard</span>
          </Link>
          <p className="truncate text-[12px] text-ink-faint" title={email}>
            {email}
          </p>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar with hamburger menu */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-canvas text-ink transition-colors hover:bg-surface-raised active:scale-95"
            aria-label="Open admin navigation menu"
          >
            <Menu size={18} />
          </button>
          <Link href="/admin">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            User View
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-out sidebar drawer */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-200 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/admin" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-4 pt-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Admin Portal
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2.5">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-ink text-canvas dark:bg-accent dark:text-accent-ink"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                )}
              >
                <item.icon size={17} strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2.5 border-t border-border p-4">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>Switch to User View</span>
          </Link>
          <div className="flex items-center justify-between pt-1">
            <p className="truncate text-[12px] text-ink-faint" title={email}>
              {email}
            </p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
}


