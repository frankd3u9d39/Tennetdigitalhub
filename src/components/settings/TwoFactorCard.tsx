"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Mode = "loading" | "off" | "enrolling" | "on" | "disabling";

const WRONG_CODE = "That code is incorrect or has expired. Check your authenticator app and try again.";

export function TwoFactorCard() {
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.[0];
    if (verified) {
      setFactorId(verified.id);
      setMode("on");
    } else {
      setMode("off");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function startEnroll() {
    setBusy(true);
    setError("");
    try {
      // Clear out abandoned, never-verified enrolments first (they would block a new one).
      const { data: all } = await supabase.auth.mfa.listFactors();
      for (const f of all?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Tennet authenticator", issuer: "Tennet Digital Services" });
      if (enrollError || !data) throw new Error("Could not start setup. Please try again.");
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode("");
      setMode("enrolling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError(WRONG_CODE);
      setCode("");
    } else {
      setQr("");
      setSecret("");
      setCode("");
      await load();
    }
    setBusy(false);
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    // A fresh code proves it's really the owner turning protection off.
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) {
      setError(WRONG_CODE);
      setCode("");
      setBusy(false);
      return;
    }
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      setError("Could not turn off two-factor. Please try again.");
    } else {
      setCode("");
      await load();
    }
    setBusy(false);
  }

  async function cancelEnroll() {
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
    setQr("");
    setSecret("");
    setCode("");
    setError("");
    setMode("off");
    setBusy(false);
  }

  const codeInput = (
    <input
      autoFocus
      required
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
      placeholder="123456"
      aria-label="6-digit code"
      className="w-40 rounded-lg border border-border bg-canvas px-3.5 py-2 text-center font-mono text-[16px] tracking-[0.4em] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
    />
  );

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <Shield size={17} className="text-ink-faint" />
        <p className="text-[14px] font-medium text-ink">Security</p>
      </div>

      <div className="mt-4 rounded-xl border border-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[13.5px] text-ink">
              Two-factor authentication
              {mode === "on" && <Badge tone="success">On</Badge>}
            </p>
            <p className="text-[12.5px] text-ink-faint">
              {mode === "on"
                ? "A code from your authenticator app is required every time you log in."
                : "Require a verification code at login"}
            </p>
          </div>
          {mode === "off" && (
            <Button variant="secondary" size="sm" onClick={startEnroll} disabled={busy}>
              {busy ? "Starting…" : "Enable"}
            </Button>
          )}
          {mode === "on" && (
            <Button
              variant="secondary"
              size="sm"
              className="text-danger"
              onClick={() => {
                setError("");
                setCode("");
                setMode("disabling");
              }}
            >
              Disable
            </Button>
          )}
          {mode === "loading" && <div className="h-8 w-16 animate-shimmer rounded-lg" />}
        </div>

        {mode === "enrolling" && (
          <form onSubmit={confirmEnroll} className="mt-4 space-y-4 border-t border-border pt-4">
            <ol className="list-decimal space-y-1 pl-5 text-[12.5px] leading-relaxed text-ink-muted">
              <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…).</li>
              <li>Scan this QR code, or enter the key below by hand.</li>
              <li>Type the 6-digit code the app shows to finish.</li>
            </ol>
            <div className="flex flex-wrap items-start gap-5">
              {/* The QR code is a data: URL generated by Supabase for this one-time enrolment. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="Two-factor QR code" className="h-40 w-40 rounded-lg border border-border bg-white p-2" />}
              <div className="min-w-0">
                <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">Or enter this key</p>
                <p className="mt-1 break-all font-mono text-[13px] text-ink">{secret}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {codeInput}
              <Button type="submit" size="sm" disabled={busy || code.length !== 6}>
                {busy ? "Verifying…" : "Verify and turn on"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelEnroll} disabled={busy}>
                Cancel
              </Button>
            </div>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
          </form>
        )}

        {mode === "disabling" && (
          <form onSubmit={confirmDisable} className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-[12.5px] text-ink-muted">Enter a current code from your authenticator app to turn two-factor off.</p>
            <div className="flex flex-wrap items-center gap-2">
              {codeInput}
              <Button type="submit" size="sm" variant="danger" disabled={busy || code.length !== 6}>
                {busy ? "Turning off…" : "Turn off"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("on")} disabled={busy}>
                Cancel
              </Button>
            </div>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
          </form>
        )}

        {(mode === "off" || mode === "on") && error && <p className="mt-3 text-[12.5px] text-danger">{error}</p>}
      </div>
    </Card>
  );
}
