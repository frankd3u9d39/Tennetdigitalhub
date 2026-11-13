import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { settle } from "./bills";
import { searchBvnByPhone, searchNinByPhone, searchNinByTracking, searchNinByDemography, CheckMyNinBvnError, type NinDemographyInput } from "./checkmyninbvn";

export class RetrievalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type RetrievalType = "bvn_phone" | "nin_phone" | "nin_tracking" | "nin_demography";

const RETRIEVAL_CONFIG: Record<RetrievalType, { label: string; price: number; cost: number }> = {
  // `cost` = what CheckMyNINBVN charges us (per the provider dashboard); `price` = what the customer pays.
  bvn_phone: { label: "BVN phone search", price: 300, cost: 200 },
  nin_phone: { label: "NIN phone search", price: 350, cost: 250 },
  nin_tracking: { label: "NIN tracking search", price: 350, cost: 200 },
  nin_demography: { label: "NIN demography search", price: 400, cost: 300 },
};

function makeReference() {
  return `TDR${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);
}

const mask = (n: string) => `•••••••${n.slice(-4)}`;

export async function retrieveIdentity(input: {
  email: string;
  type: RetrievalType;
  query?: string;
  demographics?: Partial<NinDemographyInput>;
  consent: boolean;
}) {
  const cfg = RETRIEVAL_CONFIG[input.type];
  if (!cfg) throw new RetrievalError("Invalid retrieval type.");
  if (input.consent !== true) throw new RetrievalError("You must confirm the customer's consent.");

  // Demography searches on four fields; the others on one query string (phone or tracking ID).
  let cleanQuery = "";
  let demographics: NinDemographyInput | null = null;
  let maskedQuery: string;
  if (input.type === "nin_demography") {
    const firstname = (input.demographics?.firstname ?? "").trim();
    const lastname = (input.demographics?.lastname ?? "").trim();
    const gender = (input.demographics?.gender ?? "").trim().toLowerCase();
    const dob = (input.demographics?.dob ?? "").trim();
    if (!firstname || !lastname || !gender || !dob) {
      throw new RetrievalError("Enter first name, surname, gender and date of birth.");
    }
    if (gender !== "male" && gender !== "female") throw new RetrievalError("Gender must be male or female.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new RetrievalError("Date of birth must be in YYYY-MM-DD format.");
    demographics = { firstname, lastname, gender, dob };
    maskedQuery = `${firstname} ${lastname} · ${dob}`;
  } else {
    cleanQuery = (input.query ?? "").trim();
    if (!cleanQuery) throw new RetrievalError("Please provide a phone number or tracking ID.");
    maskedQuery = mask(cleanQuery);
  }

  const account = await getAccount(input.email);
  const reference = makeReference();

  // 1. Debit wallet atomically
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`retrieval:${account.userId}`]);

    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, cfg.price]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new RetrievalError("Insufficient wallet balance.", 402);
    }

    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount, provider)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6, 'checkmyninbvn')`,
      [account.userId, cfg.label, maskedQuery, cfg.price, reference, cfg.cost]
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // 2. Call CheckMyNINBVN provider
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    if (input.type === "bvn_phone") {
      result = await searchBvnByPhone(cleanQuery);
    } else if (input.type === "nin_phone") {
      result = await searchNinByPhone(cleanQuery);
    } else if (input.type === "nin_tracking") {
      result = await searchNinByTracking(cleanQuery);
    } else {
      result = await searchNinByDemography(demographics!);
    }

    const data = result?.data;
    if (!data) {
      await settle(reference, "failed", { provider: "checkmyninbvn" });
      throw new RetrievalError("No record found. You were not charged.", 404);
    }

    const providerRef = result?.reportID ? String(result.reportID) : undefined;
    await settle(reference, "successful", { provider: "checkmyninbvn", providerRef, result: { found: true } });

    // Also record in verification_records for auditing
    const subjectName = [data.firstname, data.middlename, data.surname || data.lastname].filter(Boolean).join(" ");
    await pool.query(
      `insert into public.verification_records (user_id, type, queried, subject_name, status, cost, consent, reference, kind)
       values ($1, $2, $3, $4, 'successful', $5, true, $6, 'retrieval')`,
      [account.userId, input.type.includes("bvn") ? "BVN" : "NIN", maskedQuery, subjectName || null, cfg.price, reference]
    ).catch(() => {});

    return {
      reference,
      type: input.type,
      data,
      costNaira: cfg.price,
    };
  } catch (err) {
    await settle(reference, "failed", { provider: "checkmyninbvn" }).catch(() => {});
    if (err instanceof CheckMyNinBvnError) {
      throw new RetrievalError(err.message, err.status);
    }
    if (err instanceof RetrievalError) {
      throw err;
    }
    throw new RetrievalError("Retrieval failed. You were refunded in full.", 500);
  }
}
