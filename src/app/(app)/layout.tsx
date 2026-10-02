import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { WalletProvider } from "@/lib/wallet";
import { getSessionUser } from "@/lib/auth-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSessionUser())) redirect("/login");

  return (
    <WalletProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </WalletProvider>
  );
}
