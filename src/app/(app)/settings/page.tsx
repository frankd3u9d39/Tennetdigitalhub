"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { Topbar } from "@/components/dashboard/Topbar";
import { TwoFactorCard } from "@/components/settings/TwoFactorCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/lib/wallet";
import { formatDate } from "@/lib/format";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading } = useWallet();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
    }
  }

  const fields = [
    { label: "Full name", value: profile?.name ?? "—" },
    { label: "Email address", value: profile?.email ?? "—" },
    { label: "Role", value: profile?.role ?? "—" },
    { label: "Member since", value: profile?.memberSince ? formatDate(profile.memberSince) : "—" },
    { label: "Agent reference", value: profile?.reference ?? "—" },
  ];

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your profile and security" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={profile?.name} src={profile?.avatarUrl} className="h-14 w-14 text-[18px]" />
            <div>
              <p className="text-[16px] font-medium text-ink">
                {loading ? "Loading…" : (profile?.name ?? "—")}
              </p>
              <p className="text-[13px] text-ink-faint">{profile?.role ?? ""}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-[11.5px] uppercase tracking-wide text-ink-faint">
                  {field.label}
                </dt>
                <dd className="mt-1 text-[14px] text-ink">
                  {loading ? "—" : field.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <TwoFactorCard />

        <Button
          variant="secondary"
          className="text-danger"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut size={14} />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </main>
    </>
  );
}
