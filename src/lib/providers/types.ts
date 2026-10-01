import type { LookupResult, RequestResult, VtuResult } from "@/lib/types";

export interface VerificationProvider {
  lookup(query: string): Promise<LookupResult>;
}

export interface VtuProviderClient {
  purchase(input: {
    slug: string;
    recipient: string;
    amount: number;
    provider?: string;
  }): Promise<VtuResult>;
}

export interface RequestProviderClient {
  submit(input: { slug: string; fullName: string }): Promise<RequestResult>;
}
