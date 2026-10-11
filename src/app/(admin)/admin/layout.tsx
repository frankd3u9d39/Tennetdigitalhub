import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, needsMfa, hasMfa, suspended, isAdmin } = await getAuthState();
  if (!user) redirect("/login?next=/admin");
  if (needsMfa) redirect("/two-factor?next=/admin");
  // Everyone who isn't an admin sees an ordinary "not found" page: the admin area does not announce itself.
  if (suspended || !isAdmin) notFound();

  // Admin power over money and prices needs a second factor on the account, not just a password.
  if (!hasMfa) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="font-display text-[26px] text-ink">Turn on two-factor first</h1>
        <p className="mt-2 text-[14px] text-ink-muted">
          The admin area can change prices and move money, so it only opens for accounts protected by an authenticator app.
        </p>
        <Link href="/settings" className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-canvas dark:bg-accent dark:text-accent-ink">
          Set up two-factor in Settings
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar email={user.email} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
