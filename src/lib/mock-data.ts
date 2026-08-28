import type { LedgerEntry, LookupResult, ServiceItem, VerificationRecord } from "./types";

export const currentUser = {
  name: "James Okon",
  initials: "JO",
  email: "james.okon@clearline.dev",
  role: "Verification Agent",
  memberSince: "March 2025",
  reference: "usr_6a8ea6983287a",
  walletBalance: 24500,
  accounts: [
    { bank: "Wema Bank", number: "9816530408", label: "Naira settlement" },
    { bank: "Providus Bank", number: "9606028341", label: "Virtual account" },
  ],
};

export const services: ServiceItem[] = [
  {
    slug: "nin",
    name: "NIN verification",
    category: "verification",
    description: "Confirm a National Identification Number against demographic records.",
    price: 150,
    icon: "id-badge",
    status: "available",
  },
  {
    slug: "bvn",
    name: "BVN verification",
    category: "verification",
    description: "Match a Bank Verification Number and pull enrolment details.",
    price: 170,
    icon: "landmark",
    status: "available",
  },
  {
    slug: "nin-modification",
    name: "NIN modification",
    category: "records",
    description: "Submit a correction request for name, DOB, or phone fields.",
    price: 2500,
    icon: "file-edit",
    status: "available",
  },
  {
    slug: "bvn-modification",
    name: "BVN modification",
    category: "records",
    description: "Update BVN demographic fields through the enrolment partner.",
    price: 3000,
    icon: "file-cog",
    status: "maintenance",
  },
  {
    slug: "cac-registration",
    name: "CAC registration",
    category: "registration",
    description: "Register a business name with the Corporate Affairs Commission.",
    price: 15000,
    icon: "briefcase",
    status: "available",
  },
  {
    slug: "tin-registration",
    name: "TIN registration",
    category: "registration",
    description: "Issue a Tax Identification Number for an individual or entity.",
    price: 1000,
    icon: "receipt",
    status: "available",
  },
];

export const ledger: LedgerEntry[] = [
  {
    id: "lg_1042",
    label: "NIN verification",
    detail: "Lookup for 22nd Aug batch",
    amount: 150,
    direction: "debit",
    timestamp: "2026-08-27T09:14:00",
    status: "successful",
  },
  {
    id: "lg_1041",
    label: "Wallet top-up",
    detail: "Bank transfer · Wema Bank",
    amount: 10000,
    direction: "credit",
    timestamp: "2026-08-26T18:02:00",
    status: "successful",
  },
  {
    id: "lg_1040",
    label: "BVN verification",
    detail: "Lookup for onboarding file #24",
    amount: 170,
    direction: "debit",
    timestamp: "2026-08-26T11:31:00",
    status: "successful",
  },
  {
    id: "lg_1039",
    label: "CAC registration",
    detail: "Business name: Okon Trade Ventures",
    amount: 15000,
    direction: "debit",
    timestamp: "2026-08-24T15:47:00",
    status: "pending",
  },
  {
    id: "lg_1038",
    label: "NIN verification",
    detail: "Lookup declined — insufficient match",
    amount: 150,
    direction: "debit",
    timestamp: "2026-08-23T10:05:00",
    status: "failed",
  },
];

export const verificationHistory: VerificationRecord[] = [
  {
    id: "vr_3311",
    type: "NIN",
    queried: "•••••••4021",
    subjectName: "Adaeze N. Chukwu",
    status: "successful",
    cost: 150,
    timestamp: "2026-08-27T09:14:00",
  },
  {
    id: "vr_3310",
    type: "BVN",
    queried: "•••••••7742",
    subjectName: "Michael O. Bassey",
    status: "successful",
    cost: 170,
    timestamp: "2026-08-26T11:31:00",
  },
  {
    id: "vr_3309",
    type: "NIN",
    queried: "•••••••1298",
    subjectName: "—",
    status: "failed",
    cost: 150,
    timestamp: "2026-08-23T10:05:00",
  },
  {
    id: "vr_3308",
    type: "NIN",
    queried: "•••••••5560",
    subjectName: "Grace T. Uduak",
    status: "successful",
    cost: 150,
    timestamp: "2026-08-21T16:22:00",
  },
  {
    id: "vr_3307",
    type: "BVN",
    queried: "•••••••3387",
    subjectName: "Ibrahim K. Lawal",
    status: "successful",
    cost: 170,
    timestamp: "2026-08-19T08:47:00",
  },
];

const sampleNames = [
  "Adaeze N. Chukwu",
  "Michael O. Bassey",
  "Grace T. Uduak",
  "Ibrahim K. Lawal",
  "Blessing A. Eze",
  "Samuel D. Okafor",
];

const sampleStates = ["Lagos", "Rivers", "Akwa Ibom", "Kano", "Enugu", "Oyo"];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function simulateLookup(query: string): Promise<LookupResult> {
  await new Promise((resolve) => setTimeout(resolve, 1400 + Math.random() * 600));

  if (query.length < 11) {
    throw new Error("Enter a valid 11-digit number to continue.");
  }
  if (query.endsWith("0000")) {
    throw new Error("No matching record found for this number in the sandbox dataset.");
  }

  const h = hashString(query);
  const name = sampleNames[h % sampleNames.length];
  const state = sampleStates[h % sampleStates.length];
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return {
    fullName: name,
    dateOfBirth: `19${70 + (h % 28)}-0${1 + (h % 9)}-${10 + (h % 18)}`,
    gender: h % 2 === 0 ? "Female" : "Male",
    phone: `080${(h % 90000000).toString().padStart(8, "0")}`,
    stateOfOrigin: state,
    lgaOfOrigin: `${state} Central`,
    trackingId: `CLR-${h.toString(16).toUpperCase().slice(0, 8)}`,
    photoInitials: initials,
  };
}
