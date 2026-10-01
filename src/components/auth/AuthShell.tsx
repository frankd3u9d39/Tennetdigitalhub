import Link from "next/link";
import { BadgeCheck, ShieldCheck, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";

const points = [
  { icon: BadgeCheck, text: "Structured NIN & BVN match responses" },
  { icon: Wallet, text: "Prepaid wallet with per-lookup billing" },
  { icon: ShieldCheck, text: "Full audit trail on every query" },
];

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8 sm:p-12">
        <Link href="/">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-sm py-12">
          <h1 className="font-display text-[28px] tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-[14px] text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-[12px] text-ink-faint">
          © 2026 Tennet Digital Services Ltd.
        </p>
      </div>
      <div className="relative hidden flex-col justify-center overflow-hidden border-l border-border bg-surface px-16 lg:flex">
        <p className="font-display text-[26px] leading-snug tracking-tight text-ink">
          &ldquo;Our onboarding desk cut lookup turnaround from minutes to
          seconds.&rdquo;
        </p>
        <p className="mt-3 text-[13.5px] text-ink-faint">
          Verification lead, mid-size lending platform
        </p>
        <div className="mt-12 space-y-4 border-t border-border pt-8">
          {points.map((point) => (
            <div key={point.text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-ink">
                <point.icon size={15} />
              </div>
              <span className="text-[13.5px] text-ink-muted">{point.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
