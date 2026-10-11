import "server-only";
import { ikonect } from "./ikonect";
import { interswitch } from "./interswitch";
import { vtugate } from "./vtugate";
import { getSettings } from "../settings";
import type { BillKind, BillProvider, ProviderName } from "./types";

const ALL: Record<ProviderName, BillProvider> = { vtugate, ikonect, interswitch };

/**
 * Providers in the order they are tried.
 *  - A provider only takes part if the ENVIRONMENT allows it (keys present and its enable flag on). An admin can never
 *    switch on something the environment has not allowed.
 *  - An admin can switch a provider OFF (e.g. during an outage) and can set the order (otherwise BILL_PROVIDER_ORDER).
 */
export async function enabledProviders(kind?: BillKind): Promise<BillProvider[]> {
  const admin = (await getSettings()).providers;
  const envOrder = (process.env.BILL_PROVIDER_ORDER || "vtugate,ikonect,interswitch").split(",").map((s) => s.trim());
  const order = (admin.order ?? envOrder).filter((s): s is ProviderName => s in ALL);
  return order.map((n) => ALL[n]).filter((pr) => pr.isEnabled() && !admin.disabled.includes(pr.name) && (!kind || pr.supports(kind)));
}

/** Environment allows it AND no admin has switched it off. */
export async function providerAllowed(provider: BillProvider): Promise<boolean> {
  const admin = (await getSettings()).providers;
  return provider.isEnabled() && !admin.disabled.includes(provider.name);
}

export function getProvider(name: string | null | undefined): BillProvider | null {
  return name && name in ALL ? ALL[name as ProviderName] : null;
}
