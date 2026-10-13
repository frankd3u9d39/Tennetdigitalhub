import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SuspendedNotice } from "@/components/dashboard/SuspendedNotice";
import { WalletProvider } from "@/lib/wallet";
import { getAuthState } from "@/lib/auth-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, needsMfa, suspended, isAdmin } = await getAuthState();
  if (!user) redirect("/login");
  // Two-factor is on but this login hasn't entered its code: nothing in the app is shown until it does.
  if (needsMfa) redirect("/two-factor");
  // An admin suspended this account: it can sign in but sees nothing and can do nothing.
  if (suspended) return <SuspendedNotice />;

  return (
    <WalletProvider>
      <div className="flex min-h-screen">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </WalletProvider>
  );
}
