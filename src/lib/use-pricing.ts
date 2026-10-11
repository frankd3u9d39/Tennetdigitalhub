"use client";

import { useEffect, useState } from "react";
import type { BillKind, IdentityType, Markup, ServiceFlags, SlipPrices } from "./pricing";

export interface PublicPricing {
  identity: Record<IdentityType, number>;
  slips: Record<IdentityType, SlipPrices>;
  markup: Record<BillKind, Markup>;
  services: ServiceFlags;
}

let cached: PublicPricing | null = null;
let inflight: Promise<PublicPricing | null> | null = null;

function load(force: boolean): Promise<PublicPricing | null> {
  if (!force && cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/prices")
      .then((r) => (r.ok ? (r.json() as Promise<PublicPricing>) : null))
      .then((p) => {
        if (p) cached = p;
        return p;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Live prices and service switches from the server (set in the admin dashboard). null while loading or if unavailable.
 * Always re-fetched when a screen opens, so a price change shows up on the next visit.
 */
export function usePricing(): PublicPricing | null {
  const [pricing, setPricing] = useState<PublicPricing | null>(cached);

  useEffect(() => {
    let cancelled = false;
    load(true).then((p) => {
      if (!cancelled && p) setPricing(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return pricing;
}
