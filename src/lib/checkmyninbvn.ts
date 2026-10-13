import "server-only";

export class CheckMyNinBvnError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function getClientConfig() {
  const key = process.env.CHECKMYNINBVN_API_KEY;
  if (!key) throw new CheckMyNinBvnError("CheckMyNINBVN API key is not configured.", 503);
  const base = (process.env.CHECKMYNINBVN_BASE_URL || "https://checkmyninbvn.com/api").replace(/\/+$/, "");
  return { key, base };
}

async function request(endpoint: string, options: { method?: string; body?: unknown } = {}) {
  const { key, base } = getClientConfig();
  const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const method = options.method || "POST";

  const headers: Record<string, string> = {
    "x-api-key": key,
    Accept: "application/json",
  };
  if (options.body && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, json, ok: res.ok && json?.status === "success" };
}

// ---- BVN & NIN Retrieval Endpoints ---------------------------------------------------------------

export async function searchBvnByPhone(phone: string) {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  const reply = await request("/bvn-phone", {
    body: { phone: cleanPhone, consent: true },
  });
  if (!reply.ok) {
    throw new CheckMyNinBvnError(reply.json?.message || "Failed to search BVN by phone.", reply.status);
  }
  return reply.json;
}

export async function searchNinByPhone(phone: string) {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  const reply = await request("/nin-phone", {
    body: { phone: cleanPhone, consent: true },
  });
  if (!reply.ok) {
    throw new CheckMyNinBvnError(reply.json?.message || "Failed to search NIN by phone.", reply.status);
  }
  return reply.json;
}

export async function searchNinByTracking(trackingId: string) {
  const reply = await request("/nin-tracking", {
    body: { tracking_id: trackingId.trim(), consent: true },
  });
  if (!reply.ok) {
    throw new CheckMyNinBvnError(reply.json?.message || "Failed to search NIN by tracking ID.", reply.status);
  }
  return reply.json;
}

// ---- NIN Modification & Validation Orders --------------------------------------------------------

export type NinModificationType =
  | "nin_name_modification"
  | "nin_phone_modification"
  | "nin_address_modification"
  | "nin_validation";

export interface NinModificationInput {
  service_type: NinModificationType;
  nin?: string;
  nin_digits?: string;
  surname?: string;
  firstname?: string;
  middlename?: string;
  phone_number?: string;
  new_surname?: string;
  new_firstname?: string;
  new_middlename?: string;
  new_phone_number?: string;
  new_address?: string;
  date_of_birth?: string;
}

export async function submitNinModificationOrder(input: NinModificationInput) {
  const payload = {
    ...input,
    consent: true,
  };
  const reply = await request("/nin-modification", {
    body: payload,
  });
  if (!reply.ok) {
    throw new CheckMyNinBvnError(reply.json?.message || "NIN modification order failed.", reply.status);
  }
  return reply.json;
}

export async function checkNinModificationOrderStatus(referenceId: string) {
  const reply = await request(`/nin-modification-status?reference_id=${encodeURIComponent(referenceId)}`, {
    method: "GET",
  });
  if (!reply.ok) {
    throw new CheckMyNinBvnError(reply.json?.message || "Failed to fetch order status.", reply.status);
  }
  return reply.json;
}
