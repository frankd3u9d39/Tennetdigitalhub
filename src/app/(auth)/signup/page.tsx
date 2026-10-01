"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/dashboard"), 600);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up a verification desk in under a minute."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[12.5px] font-medium text-ink-muted">
            Full name
          </label>
          <input
            required
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
            placeholder="At least 8 characters"
            className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>
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
