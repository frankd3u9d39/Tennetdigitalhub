import type { VtuProviderClient } from "./types";
import { mockVtuProvider } from "./mock";

// Live ClubKonnect integration — currently wired for airtime only (the only
// endpoint we've verified against their docs). Every other VTU slug still
// falls back to the mock provider until it's wired up the same way.
export const clubkonnectVtuProvider: VtuProviderClient = {
  async purchase(input) {
    if (input.slug !== "airtime") {
      return mockVtuProvider.purchase(input);
    }

    const res = await fetch("/api/vtu/airtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: input.provider,
        phone: input.recipient,
        amount: input.amount,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Airtime purchase failed.");
    }

    return {
      reference: data.reference,
      recipient: input.recipient,
      amount: input.amount,
      provider: input.provider ?? "Unknown",
    };
  },
};
