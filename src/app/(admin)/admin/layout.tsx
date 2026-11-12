import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { adminMfaRequired, getAuthState } from "@/lib/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { WithdrawalAlertBanner } from "@/components/admin/withdrawal-alerts";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, needsMfa, hasMfa, suspended, isAdmin } = await getAuthState();
  if (!user) redirect("/login?next=/admin");
  if (needsMfa) redirect("/two-factor?next=/admin");
  // Everyone who isn't an admin sees an ordinary "not found" page: the admin area does not announce itself.
  if (suspended || !isAdmin) notFound();
  // Admins must have two-factor enrolled. Send them to Settings to set it up rather than locking them out.
  if (adminMfaRequired() && !hasMfa) redirect("/settings?reason=admin-2fa");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar email={user.email} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <WithdrawalAlertBanner className="mb-5" />
        {children}
      </main>
    </div>
  );
}

