"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function SuspendedNotice() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert size={22} />
        </div>
        <p className="mt-4 text-[15px] font-medium text-ink">Your account is suspended</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
          You can&apos;t use Tennet right now. Your wallet balance is safe. Please contact support to find out why and how to get access back.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          Sign out
        </Button>
      </Card>
    </main>
  );
}
