"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Whether Google sign-in is switched on in Supabase. Asked once per page load; if it can't be determined (network
// error) or it is off, the button is simply not shown, so a customer never lands on a raw provider error page.
let googleEnabledCache: boolean | null = null;

async function isGoogleEnabled(): Promise<boolean> {
  if (googleEnabledCache !== null) return googleEnabledCache;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    });
    const json = await res.json();
    googleEnabledCache = Boolean(json?.external?.google);
  } catch {
    googleEnabledCache = false;
  }
  return googleEnabledCache;
}

/** "Continue with Google" plus its "or" divider, shown only when Google sign-in is actually enabled. */
export function GoogleSection({
  next = "/dashboard",
  onError,
}: {
  next?: string;
  onError: (message: string) => void;
}) {
  const [enabled, setEnabled] = useState(googleEnabledCache === true);

  useEffect(() => {
    let cancelled = false;
    isGoogleEnabled().then((on) => {
      if (!cancelled) setEnabled(on);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <GoogleButton next={next} onError={onError} />
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-faint">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    onError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      onError("Could not start Google sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-canvas px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-60"
    >
      <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
        <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/>
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
