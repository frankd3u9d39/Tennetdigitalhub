export type ServiceCategory = "vtu" | "verification" | "records" | "registration";
export type ServiceFlow = "lookup" | "vtu" | "request";

export interface ServiceItem {
  slug: string;
  name: string;
  category: ServiceCategory;
  flow: ServiceFlow;
  description: string;
  price: number;
  icon: string;
}

export interface VtuOption {
  label: string;
  price: number;
}

export interface VtuFlowConfig {
  recipientLabel: string;
  recipientPlaceholder: string;
  mode: "amount" | "plan";
  presetAmounts?: number[];
  plans?: VtuOption[];
  providers?: string[];
}

export interface RequestResult {
  reference: string;
  status: "Under review" | "Processing";
  eta: string;
}

export interface VtuResult {
  reference: string;
  recipient: string;
  amount: number;
  provider: string;
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
  timestamp: string;
}

export interface LookupResult {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  trackingId: string;
  photoInitials: string;
}
