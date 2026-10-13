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

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar email={user.email} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

