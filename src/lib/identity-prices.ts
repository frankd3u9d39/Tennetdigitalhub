// Labels for identity services. PRICES are no longer hard-coded here: they are editable settings (see pricing.ts and
// the admin dashboard) and the server reads them at charge time.
export type { IdentityType, SlipTier } from "./pricing";

export const IDENTITY_LABEL = {
  nin: "NIN verification",
  bvn: "BVN verification",
} as const;

export const SLIP_LABEL = {
  nin: "NIN slip (PDF)",
  bvn: "BVN slip (PDF)",
} as const;

export const SLIP_TIERS: ("standard" | "premium")[] = ["standard", "premium"];
