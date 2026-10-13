import type { ServiceItem } from "./types";

export const services: ServiceItem[] = [
  // VTU: real, via /api/bills/*
  {
    slug: "airtime",
    name: "Airtime top-up",
    category: "vtu",
    flow: "vtu",
    description: "Recharge any Nigerian network instantly from your wallet.",
    price: 0,
    icon: "phone",
  },
  {
    slug: "data",
    name: "Data bundles",
    category: "vtu",
    flow: "vtu",
    description: "Buy data plans across MTN, Airtel, Glo, and 9mobile.",
    price: 0,
    icon: "wifi",
  },
  {
    slug: "bill",
    name: "Bill payment",
    category: "vtu",
    flow: "vtu",
    description: "Settle electricity and utility bills against a meter number.",
    price: 0,
    icon: "zap",
  },
  {
    slug: "tv-cable",
    name: "TV cable subscription",
    category: "vtu",
    flow: "vtu",
    description: "Renew DStv, GOtv, and Startimes subscriptions by smartcard.",
    price: 0,
    icon: "tv",
  },
  {
    slug: "exam-pins",
    name: "Exam PINs",
    category: "vtu",
    flow: "exam",
    description: "Instant scratch card tokens for WAEC, NECO, and NABTEB.",
    price: 1500,
    icon: "receipt",
  },

  // Verification: real registry lookups, via /api/verify/lookup
  {
    slug: "nin",
    name: "NIN verification",
    category: "verification",
    flow: "lookup",
    description: "Confirm a National Identification Number against demographic records.",
    price: 150,
    icon: "id-badge",
  },
  {
    slug: "bvn",
    name: "BVN verification",
    category: "verification",
    flow: "lookup",
    description: "Match a Bank Verification Number and pull enrolment details.",
    price: 170,
    icon: "landmark",
  },

  // Modification & Retrieval services: via CheckMyNINBVN API
  {
    slug: "nin-modification",
    name: "NIN modification",
    category: "modification",
    flow: "modification",
    description: "Submit a correction request for name, DOB, or phone fields.",
    price: 17500,
    icon: "file-edit",
  },
  {
    slug: "nin-validation",
    name: "NIN validation",
    category: "modification",
    flow: "modification",
    description: "Cross-check a NIN slip against the live enrolment register.",
    price: 6500,
    icon: "check-check",
  },
  {
    slug: "bvn-retrieval",
    name: "BVN retrieval",
    category: "modification",
    flow: "retrieval",
    description: "Recover a lost or forgotten BVN linked to a phone number.",
    price: 300,
    icon: "search",
  },
  {
    slug: "nin-phone",
    name: "NIN phone search",
    category: "modification",
    flow: "retrieval",
    description: "Recover or look up a NIN record using a phone number.",
    price: 350,
    icon: "phone",
  },

  // Registration services: via AYGlobalData API
  {
    slug: "cac-registration",
    name: "Register CAC",
    category: "registration",
    flow: "cac",
    description: "Register a business name or company with the Corporate Affairs Commission.",
    price: 18000,
    icon: "briefcase",
  },
];

