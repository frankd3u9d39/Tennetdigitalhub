import { LogOut, Shield } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { currentUser } from "@/lib/mock-data";

const fields = [
  { label: "Full name", value: currentUser.name },
  { label: "Email address", value: currentUser.email },
  { label: "Role", value: currentUser.role },
  { label: "Member since", value: currentUser.memberSince },
  { label: "Agent reference", value: currentUser.reference },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Manage your profile and security" />
      <main className="flex-1 space-y-6 p-6 lg:p-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-[18px] text-canvas dark:bg-accent dark:text-accent-ink">
              {currentUser.initials}
            </div>
            <div>
              <p className="text-[16px] font-medium text-ink">{currentUser.name}</p>
              <p className="text-[13px] text-ink-faint">{currentUser.role}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-[11.5px] uppercase tracking-wide text-ink-faint">
                  {field.label}
                </dt>
                <dd className="mt-1 text-[14px] text-ink">{field.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Shield size={17} className="text-ink-faint" />
            <p className="text-[14px] font-medium text-ink">Security</p>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-[13.5px] text-ink">Two-factor authentication</p>
              <p className="text-[12.5px] text-ink-faint">
                Require a verification code at login
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Enable
            </Button>
          </div>
        </Card>

        <Button variant="secondary" className="text-danger">
          <LogOut size={14} />
          Sign out
        </Button>
      </main>
    </>
  );
}
