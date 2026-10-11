"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { BillFlow } from "@/components/bills/BillFlow";
import { IdentityFlow } from "@/components/identity/IdentityFlow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { services } from "@/lib/services";
import { usePricing } from "@/lib/use-pricing";

export default function VerifyPage() {
  const params = useParams<{ type: string }>();
  const service = services.find((s) => s.slug === params.type);
  const pricing = usePricing();
  const flagKey: Record<string, keyof NonNullable<typeof pricing>["services"]> = { airtime: "airtime", data: "data", bill: "electricity", "tv-cable": "cable", nin: "nin", bvn: "bvn" };

  if (!service) {
    notFound();
  }

  // Listed but not connected to a real provider yet: never let a customer pay for it.
  if (service.comingSoon) {
    return (
      <>
        <Topbar title={service.name} subtitle={service.description} />
        <main className="flex-1 p-6 lg:p-8">
          <Card className="mx-auto max-w-lg p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
              <Clock size={22} />
            </div>
            <p className="mt-4 text-[15px] font-medium text-ink">{service.name} is coming soon</p>
            <p className="mt-1 text-[13px] text-ink-faint">
              We&apos;re not taking orders for this yet, so nothing can be charged. It will appear here as soon as it is ready.
            </p>
            <Button as={Link} href="/dashboard" size="sm" className="mt-6">
              Back to dashboard
            </Button>
          </Card>
        </main>
      </>
    );
  }

  // An admin switched this service off: say so plainly (the server refuses it as well).
  if (pricing && flagKey[service.slug] && !pricing.services[flagKey[service.slug]]) {
    return (
      <>
        <Topbar title={service.name} subtitle={service.description} />
        <main className="flex-1 p-6 lg:p-8">
          <Card className="mx-auto max-w-lg p-8 text-center">
            <p className="text-[15px] font-medium text-ink">{service.name} is temporarily unavailable</p>
            <p className="mt-1 text-[13px] text-ink-faint">Please try again later. Nothing has been charged.</p>
            <Button as={Link} href="/dashboard" size="sm" className="mt-6">
              Back to dashboard
            </Button>
          </Card>
        </main>
      </>
    );
  }

  // Airtime, data, electricity and cable are real, server-priced purchases (see /api/bills/*).
  if (service.flow === "vtu") {
    return <BillFlow service={service} />;
  }

  // NIN and BVN are real registry lookups, charged and recorded server-side (see /api/verify/lookup).
  if (service.slug === "nin" || service.slug === "bvn") {
    return <IdentityFlow service={service} />;
  }

  notFound();
}
