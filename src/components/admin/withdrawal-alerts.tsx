"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";

// Tells admins about withdrawals waiting to be paid by hand, again and again until none are left:
//   - a banner (admin pages, and the user dashboard for admins) that can only be hidden for a few minutes;
//   - a count badge on the Withdrawals nav item;
//   - a desktop notification + short beep every REMIND_MS while the tab is open (after the admin allows it).
// One shared poller feeds every component on the page.

export interface WithdrawalSummary {
  count: number;
  total: number;
  oldest: string | null;
}

const POLL_MS = 60_000;
const REMIND_MS = 5 * 60_000;
const SNOOZE_MS = 10 * 60_000;
const CHANGED_EVENT = "admin-withdrawals-changed";

let summary: WithdrawalSummary | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let lastReminder = 0;

const naira = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch {}
}

function remind(s: WithdrawalSummary) {
  if (s.count === 0 || Date.now() - lastReminder < REMIND_MS) return;
  lastReminder = Date.now();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const n = new Notification(`${s.count} withdrawal${s.count === 1 ? "" : "s"} waiting`, {
        body: `${naira(s.total)} to send. Open the admin Withdrawals page to pay.`,
        tag: "tennet-withdrawals", // replaces the previous one instead of piling up
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        // A desktop notification fires outside React, so there is no router here: a full navigation is intended.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/admin/withdrawals";
      };
    } catch {}
    beep();
  }
}

async function refresh() {
  try {
    const res = await fetch("/api/admin/withdrawals?summary=1", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { summary?: WithdrawalSummary };
    if (!data.summary) return;
    summary = data.summary;
    listeners.forEach((l) => l());
    remind(data.summary);
  } catch {}
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    void refresh();
    timer = setInterval(() => void refresh(), POLL_MS);
    window.addEventListener(CHANGED_EVENT, refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      window.removeEventListener(CHANGED_EVENT, refresh);
    }
  };
}

export function usePendingWithdrawals(): WithdrawalSummary | null {
  return useSyncExternalStore(subscribe, () => summary, () => null);
}

/** Small count pill for the nav item. */
export function WithdrawalCountBadge() {
  const s = usePendingWithdrawals();
  if (!s || s.count === 0) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
      {s.count}
    </span>
  );
}

/** Banner shown while any withdrawal waits. Hiding it only lasts SNOOZE_MS. */
export function WithdrawalAlertBanner({ className = "" }: { className?: string }) {
  const s = usePendingWithdrawals();
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    const p = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
    // Read once on mount: the browser's permission isn't available during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(p);
    return () => clearInterval(id);
  }, []);

  if (!s || s.count === 0 || now < snoozedUntil) return null;

  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13.5px] text-ink ${className}`}>
      <BellRing size={18} className="shrink-0 animate-pulse text-danger" />
      <p className="min-w-0 flex-1">
        <strong>
          {s.count} withdrawal{s.count === 1 ? "" : "s"} waiting
        </strong>{" "}
        · {naira(s.total)} to send to customers by bank transfer.
      </p>
      {permission === "default" ? (
        <button
          type="button"
          onClick={async () => {
            const p = await Notification.requestPermission();
            setPermission(p);
            if (p === "granted") {
              lastReminder = 0;
              remind(s);
            }
          }}
          className="h-8 rounded-lg border border-border bg-surface px-3 text-[12.5px] font-medium text-ink hover:bg-surface-raised"
        >
          Turn on desktop alerts
        </button>
      ) : null}
      <Link href="/admin/withdrawals" className="h-8 rounded-lg bg-danger px-3 text-[12.5px] font-medium leading-8 text-white hover:opacity-90">
        Pay now
      </Link>
      <button
        type="button"
        aria-label="Hide for 10 minutes"
        title="Hide for 10 minutes"
        onClick={() => {
          setSnoozedUntil(Date.now() + SNOOZE_MS);
          setNow(Date.now());
        }}
        className="rounded p-1 text-ink-faint hover:text-ink"
      >
        <X size={15} />
      </button>
    </div>
  );
}
