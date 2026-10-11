export type ServiceCategory = "vtu" | "verification" | "registration";
export type ServiceFlow = "lookup" | "vtu" | "request";

export interface ServiceItem {
  slug: string;
  name: string;
  category: ServiceCategory;
  flow: ServiceFlow;
  description: string;
  price: number;
  icon: string;
  /** Listed but not purchasable: no real provider behind it yet. */
  comingSoon?: boolean;
}

export interface LedgerEntry {
  id: string;
  label: string;
  detail: string;
  amount: number;
  direction: "credit" | "debit";
  timestamp: string;
  status: "successful" | "pending" | "failed";
}

export interface VerificationRecord {
  id: string;
  type: "NIN" | "BVN";
  queried: string;
  subjectName: string;
  status: "successful" | "failed";
  cost: number;
  /** A plain lookup, or a purchased PDF slip. */
  kind: "lookup" | "slip";
  timestamp: string;
}
