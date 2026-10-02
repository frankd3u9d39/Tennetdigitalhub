"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

// Reached from the password-reset email via /auth/callback, which signs the user in first.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Enter a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[12.5px] font-medium text-ink-muted">New password</label>
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
          {loading ? "Saving…" : "Save password"}
          {!loading && <ArrowRight size={15} />}
        </Button>
      </form>
    </AuthShell>
  );
}
