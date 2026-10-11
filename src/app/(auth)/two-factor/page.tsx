"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

export default function TwoFactorPage() {
  return (
    <Suspense fallback={null}>
      <TwoFactorForm />
    </Suspense>
  );
}

// Second step of login for accounts with two-factor on. Until a valid code is entered the session stays at the lower
// assurance level, and the app and every data/money API refuse it (see getAuthState).
function TwoFactorForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      // Nothing to do here: no two-factor on this account, or this login has already completed it.
      if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
        return;
      }
      const { data } = await supabase.auth.mfa.listFactors();
      if (!cancelled) setFactorId(data?.totp?.[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError("");
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError("That code is incorrect or has expired. Check your authenticator app and try again.");
      setCode("");
      setLoading(false);
      return;
    }
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthShell title="Two-factor verification" subtitle="Enter the 6-digit code from your authenticator app.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="text-[12.5px] font-medium text-ink-muted">
            Authentication code
          </label>
          <input
            id="code"
            autoFocus
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-center text-[20px] tracking-[0.5em] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || code.length !== 6 || !factorId}>
          {loading ? "Verifying…" : "Verify and continue"}
          {!loading && <ArrowRight size={15} />}
        </Button>
      </form>
      <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-faint">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        Lost your phone? Contact support to reset two-factor on your account.
      </p>
      <p className="mt-4 text-[13.5px] text-ink-muted">
        <button type="button" onClick={handleSignOut} className="font-medium text-ink hover:text-accent">
          Sign out
        </button>
      </p>
    </AuthShell>
  );
}
