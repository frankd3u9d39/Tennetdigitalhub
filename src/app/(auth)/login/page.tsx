"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }
  if (m.includes("valid email") || m.includes("invalid email")) return "Enter a valid email address.";
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Try again in a few minutes.";
  }
  if (m.includes("not confirmed")) return "Confirm your email first, then log in.";
  return "Something went wrong. Please try again.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") === "link"
      ? "That link has expired or was already used. Log in or request a new one."
      : ""
  );
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(friendlyAuthError(signInError.message));
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) throw new Error(friendlyAuthError(resetError.message));
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <AuthShell
      title="Log in to Tennet"
      subtitle="Enter your credentials to access your verification console."
    >
      <GoogleButton next={searchParams.get("next") || "/dashboard"} onError={setError} />
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-faint">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[12.5px] font-medium text-ink-muted">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[12.5px] font-medium text-ink-muted">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[12.5px] text-ink-faint hover:text-ink"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>

        {resetSent && (
          <p className="text-[12.5px] text-accent-soft-ink">
            Password reset email sent — check your inbox.
          </p>
        )}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
          {!loading && <ArrowRight size={15} />}
        </Button>
      </form>
      <p className="mt-6 text-[13.5px] text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-ink hover:text-accent">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
