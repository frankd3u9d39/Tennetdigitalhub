// This file is the ONE seam between the app and the outside world for
// verification, VTU, and request-based services. Every page in the app
// calls verificationProvider / vtuProvider / requestProvider — never the
// mock implementations directly — so going live is a matter of writing a
// real adapter (see ENV_SETUP.md) and swapping the export below, not
// rewriting the app.
//
// Note: real API keys must never run in the browser. A real adapter here
// should call your own Next.js API route (src/app/api/...), which holds
// the secret key server-side and forwards the request to the provider.

import { mockRequestProvider, mockVerificationProvider } from "./mock";
import { vtpassVtuProvider } from "./vtpass";
import type { RequestProviderClient, VerificationProvider, VtuProviderClient } from "./types";

export const verificationProvider: VerificationProvider = mockVerificationProvider;
export const vtuProvider: VtuProviderClient = vtpassVtuProvider;
export const requestProvider: RequestProviderClient = mockRequestProvider;
