import type { VerificationProvider, VtuProviderClient, RequestProviderClient } from "./types";

const sampleNames = [
  "Adaeze N. Chukwu",
  "Michael O. Bassey",
  "Grace T. Uduak",
  "Ibrahim K. Lawal",
  "Blessing A. Eze",
  "Samuel D. Okafor",
];

const sampleStates = ["Lagos", "Rivers", "Akwa Ibom", "Kano", "Enugu", "Oyo"];
const networks = ["MTN", "Airtel", "Glo", "9mobile", "IBEDC", "EKEDC", "DStv", "GOtv"];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const mockVerificationProvider: VerificationProvider = {
  async lookup(query) {
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
  },
};

export const mockVtuProvider: VtuProviderClient = {
  async purchase(input) {
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 500));

    if (input.recipient.replace(/\D/g, "").length < 10) {
      throw new Error("Enter a valid recipient number to continue.");
    }

    const h = hashString(input.recipient + input.slug);
    return {
      reference: `TXN-${h.toString(16).toUpperCase().slice(0, 8)}`,
      recipient: input.recipient,
      amount: input.amount,
      provider: input.provider ?? networks[h % networks.length],
    };
  },
};

export const mockRequestProvider: RequestProviderClient = {
  async submit(input) {
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 500));

    if (input.fullName.trim().length < 3) {
      throw new Error("Enter a full name to continue.");
    }

    const h = hashString(input.fullName + input.slug);
    return {
      reference: `REQ-${h.toString(16).toUpperCase().slice(0, 8)}`,
      status: h % 2 === 0 ? "Under review" : "Processing",
      eta: h % 2 === 0 ? "1-2 business days" : "Same business day",
    };
  },
};
