import type { ServiceItem } from "./types";

// Prices are NOT stored here: they are editable settings (see pricing.ts / the admin dashboard).
// Only services that are really connected to a provider belong here as purchasable. A service that isn't
// wired up must be marked `comingSoon`, never left selectable: customers would be charged for nothing.
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
  // Verification: real registry lookups, via /api/verify/lookup
  {
    slug: "nin",
    name: "NIN verification",
    category: "verification",
    flow: "lookup",
    description: "Confirm a National Identification Number against demographic records.",
    price: 0,
    icon: "id-badge",
  },
  {
    slug: "bvn",
    name: "BVN verification",
    category: "verification",
    flow: "lookup",
    description: "Match a Bank Verification Number and pull enrolment details.",
    price: 0,
    icon: "landmark",
  },
  // Registration: not available until each has a real way to be fulfilled.
  {
    slug: "tin-registration",
    name: "Register TIN",
    category: "registration",
    flow: "request",
    description: "Issue a Tax Identification Number for an individual or entity.",
    price: 0,
    icon: "receipt",
    comingSoon: true,
  },
  {
    slug: "cac-registration",
    name: "Register CAC",
    category: "registration",
    flow: "request",
    description: "Register a business name with the Corporate Affairs Commission.",
    price: 0,
    icon: "briefcase",
    comingSoon: true,
  },
];
