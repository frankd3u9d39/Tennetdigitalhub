import "server-only";

export class AyGlobalServiceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function getConfig() {
  const key = process.env.AYGLOBAL_API_KEY;
  if (!key) throw new AyGlobalServiceError("AYGlobalData API key is not configured.", 503);
  const base = (process.env.AYGLOBAL_BASE_URL || "https://ayglobaldata.com").replace(/\/+$/, "");
  return { key, base };
}

export interface CacSubmitInput {
  type: "business_name" | "company_1m" | "ngo";
  ownerFullname: string;
  passportBlob: Blob;
  filename?: string;
}

export async function submitCacRegistration(input: CacSubmitInput) {
  const { key, base } = getConfig();

  const formData = new FormData();
  formData.append("type", input.type);
  formData.append("owner_fullname", input.ownerFullname);
  formData.append("passport", input.passportBlob, input.filename || "passport.jpg");

  const res = await fetch(`${base}/api/cac/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
    },
    body: formData,
    signal: AbortSignal.timeout(90_000),
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok || json?.status !== "success") {
    throw new AyGlobalServiceError(json?.message || json?.msg || "CAC registration submission failed.", res.status || 400);
  }

  return json;
}

export async function getCacPlans() {
  const { key, base } = getConfig();
  const res = await fetch(`${base}/api/app/list/cacplan.php`, {
    headers: { Authorization: `Token ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  return res.json().catch(() => null);
}

export interface ExamPinInput {
  provider: 1 | 2 | 3; // 1=WAEC, 2=NECO, 3=NABTEB
  quantity: number;
  ref: string;
}

export async function buyExamPin(input: ExamPinInput) {
  const { key, base } = getConfig();

  const res = await fetch(`${base}/api/exam/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: input.provider,
      quantity: input.quantity,
      ref: input.ref,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok || json?.status !== "success") {
    throw new AyGlobalServiceError(json?.message || json?.msg || "Exam PIN purchase failed.", res.status || 400);
  }

  return json;
}
