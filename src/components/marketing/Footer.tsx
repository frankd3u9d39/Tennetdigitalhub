import Link from "next/link";
import { Logo } from "@/components/Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Verification", href: "#platform" },
      { label: "Pricing", href: "#pricing" },
      { label: "API reference", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Compliance", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "#" },
      { label: "Privacy policy", href: "#" },
      { label: "Data processing", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-muted">
              Identity verification infrastructure for agents, onboarding teams, and
              compliance desks operating in Nigeria.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="text-[13px] font-medium text-ink">{column.title}</h4>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Tennet Digital Services Ltd. All rights reserved.</p>
          <p>Demo environment — connects to sandbox data, not live registries.</p>
        </div>
      </div>
    </footer>
  );
}
