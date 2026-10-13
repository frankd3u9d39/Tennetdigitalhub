export type ServiceCategory = "vtu" | "verification" | "modification" | "registration";
export type ServiceFlow = "lookup" | "vtu" | "request" | "modification" | "retrieval" | "cac" | "exam";

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
  /** A plain lookup, purchased PDF slip, phone retrieval, or modification order. */
  kind: "lookup" | "slip" | "retrieval" | "modification";
  timestamp: string;
}
