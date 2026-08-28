export type ServiceCategory = "verification" | "records" | "registration";

export interface ServiceItem {
  slug: string;
  name: string;
  category: ServiceCategory;
  description: string;
  price: number;
  icon: string;
  status: "available" | "maintenance";
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
