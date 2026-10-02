"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "An account with that email already exists.";
  }
  if (m.includes("password")) return "Password must be at least 6 characters.";
  if (m.includes("valid email") || m.includes("invalid email")) return "Enter a valid email address.";
  if (m.includes("rate limit")) return "Too many attempts. Try again in a few minutes.";
  if (m.includes("signups are disabled")) return "Email sign-up is switched off for this project.";
  return "Something went wrong. Please try again.";
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (signUpError) {
      setError(friendlyAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    // With "Confirm email" on in Supabase there is no session until the user clicks the emailed link.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <MailCheck size={18} className="mt-0.5 text-accent" />
          <p className="text-[13.5px] text-ink-muted">
            Click the link in that email to finish creating your account. It can take a minute to
            arrive, so check your spam folder too.
          </p>
        </div>
        <p className="mt-6 text-[13.5px] text-ink-muted">
          <Link href="/login" className="font-medium text-ink hover:text-accent">
            Back to log in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up a verification desk in under a minute."
    >
      <GoogleButton onError={setError} />
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-faint">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[12.5px] font-medium text-ink-muted">
            Full name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="James Okon"
            className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>
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
          <label className="text-[12.5px] font-medium text-ink-muted">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>

        {error && <p className="text-[12.5px] text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create free account"}
          {!loading && <ArrowRight size={15} />}
        </Button>
      </form>
      <p className="mt-6 text-[13.5px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:text-accent">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
