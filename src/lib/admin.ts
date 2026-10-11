import "server-only";
import { pool } from "./pg";
import { settle, refreshPayment } from "./bills";
import { verifyAndCredit } from "./funding";
import { getSettings, writeAudit } from "./settings";
import { randomBytes } from "crypto";

// Everything the admin dashboard reads and does. Every action that changes anything goes through here, validates its
// input, runs atomically where money is involved, and is written to the audit log with who/what/before/after.

export class AdminError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const requireNote = (note: unknown, min = 5): string => {
  const n = String(note ?? "").trim();
  if (n.length < min) throw new AdminError(`Please give a reason (at least ${min} characters).`);
  return n.slice(0, 300);
};

// ---- monitoring --------------------------------------------------------------------------------------------------

const CATEGORY_SQL = `
  case
    when label like 'Airtime%' then 'Airtime'
    when label like 'Data%' then 'Data'
    when label like 'Electricity%' then 'Electricity'
    when label like 'Cable TV%' then 'Cable TV'
    when label = 'NIN verification' then 'NIN lookups'
    when label = 'BVN verification' then 'BVN lookups'
    when label = 'NIN slip (PDF)' then 'NIN slips'
    when label = 'BVN slip (PDF)' then 'BVN slips'
    else 'Other'
  end`;

export async function getOverview(days: number) {
  const d = Math.min(Math.max(Math.floor(days) || 7, 1), 365);
  const interval = `${d} days`;

  const [sales, pending, failed, refunds, fundings, users, lookups] = await Promise.all([
    pool.query(
      `select ${CATEGORY_SQL} as category, count(*)::int as sales, coalesce(sum(amount), 0) as revenue,
              coalesce(sum(cost_amount) filter (where cost_amount is not null), 0) as cost,
              (count(*) filter (where cost_amount is null))::int as without_cost
         from public.ledger_entries
        where direction = 'debit' and status = 'successful' and coalesce(provider, '') <> 'admin'
          and created_at > now() - $1::interval
        group by 1 order by 3 desc`,
      [interval]
    ),
    pool.query(
      `select count(*)::int as n, min(created_at) as oldest,
              (count(*) filter (where created_at < now() - interval '10 minutes'))::int as stuck
         from public.ledger_entries where status = 'pending' and direction = 'debit'`
    ),
    pool.query(
      `select count(*)::int as n from public.ledger_entries
        where direction = 'debit' and status = 'failed' and created_at > now() - $1::interval`,
      [interval]
    ),
    pool.query(
      `select count(*)::int as n, coalesce(sum(amount), 0) as total from public.ledger_entries
        where direction = 'credit' and label like 'Refund:%' and created_at > now() - $1::interval`,
      [interval]
    ),
    pool.query(
      `select coalesce(sum(amount) filter (where status = 'success' and paid_at > now() - $1::interval), 0) as inflow,
              (count(*) filter (where status = 'success' and paid_at > now() - $1::interval))::int as paid,
              (count(*) filter (where status = 'pending' and created_at > now() - interval '2 days'))::int as pending
         from public.wallet_fundings`,
      [interval]
    ),
    pool.query(
      `select count(*)::int as total,
              (count(*) filter (where member_since > now() - $1::interval))::int as new_users,
              (count(*) filter (where suspended_at is not null))::int as suspended,
              coalesce((select sum(balance) from public.wallets), 0) as liabilities
         from public.app_users`,
      [interval]
    ),
    pool.query(
      `select kind, status, count(*)::int as n from public.verification_records
        where created_at > now() - $1::interval group by 1, 2`,
      [interval]
    ),
  ]);

  const rows = sales.rows.map((r) => ({
    category: r.category as string,
    sales: r.sales as number,
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    withoutCost: r.without_cost as number,
  }));
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const knownRevenue = rows.reduce((s, r) => s + (r.revenue * (r.sales - r.withoutCost)) / Math.max(r.sales, 1), 0);

  return {
    days: d,
    revenue,
    cost,
    // Margin is only estimated from sales that have a recorded cost (older sales have none).
    estimatedMargin: knownRevenue - cost,
    salesWithoutCost: rows.reduce((s, r) => s + r.withoutCost, 0),
    totalSales: rows.reduce((s, r) => s + r.sales, 0),
    byCategory: rows,
    pending: { count: pending.rows[0].n as number, stuck: pending.rows[0].stuck as number, oldest: pending.rows[0].oldest as string | null },
    failedCount: failed.rows[0].n as number,
    refunds: { count: refunds.rows[0].n as number, total: Number(refunds.rows[0].total) },
    fundings: { inflow: Number(fundings.rows[0].inflow), paid: fundings.rows[0].paid as number, pending: fundings.rows[0].pending as number },
    users: {
      total: users.rows[0].total as number,
      new: users.rows[0].new_users as number,
      suspended: users.rows[0].suspended as number,
      walletLiabilities: Number(users.rows[0].liabilities),
    },
    lookups: lookups.rows.map((r) => ({ kind: r.kind as string, status: r.status as string, count: r.n as number })),
  };
}

export interface TransactionFilters {
  status?: string;
  direction?: string;
  provider?: string;
  q?: string;
  days?: number;
  limit?: number;
  offset?: number;
}

export async function listTransactions(f: TransactionFilters) {
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    args.push(v);
    where.push(sql.replace("?", `$${args.length}`));
  };
  if (f.status && ["pending", "successful", "failed"].includes(f.status)) add("l.status = ?", f.status);
  if (f.direction && ["debit", "credit"].includes(f.direction)) add("l.direction = ?", f.direction);
  if (f.provider && /^[a-z]{3,20}$/.test(f.provider)) add("l.provider = ?", f.provider);
  if (f.days) add("l.created_at > now() - (?::text || ' days')::interval", String(Math.min(Math.max(Math.floor(f.days), 1), 365)));
  const q = String(f.q ?? "").trim().slice(0, 80);
  if (q) {
    args.push(`%${q}%`);
    const i = args.length;
    where.push(`(u.email ilike $${i} or u.name ilike $${i} or l.reference ilike $${i} or l.label ilike $${i} or l.provider_ref ilike $${i})`);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const limit = Math.min(Math.max(Math.floor(f.limit ?? 50), 1), 200);
  const offset = Math.max(Math.floor(f.offset ?? 0), 0);

  const [rows, total] = await Promise.all([
    pool.query(
      `select l.id, l.created_at, l.label, l.detail, l.amount, l.direction, l.status, l.provider, l.reference, l.provider_ref, l.cost_amount,
              u.id as user_id, u.email, u.name
         from public.ledger_entries l join public.app_users u on u.id = l.user_id
         ${whereSql} order by l.created_at desc limit ${limit} offset ${offset}`,
      args
    ),
    pool.query(`select count(*)::int as n from public.ledger_entries l join public.app_users u on u.id = l.user_id ${whereSql}`, args),
  ]);
  return {
    total: total.rows[0].n as number,
    rows: rows.rows.map((r) => ({
      id: r.id as string,
      createdAt: new Date(r.created_at).toISOString(),
      label: r.label as string,
      detail: (r.detail ?? "") as string,
      amount: Number(r.amount),
      direction: r.direction as string,
      status: r.status as string,
      provider: (r.provider ?? null) as string | null,
      reference: (r.reference ?? null) as string | null,
      providerRef: (r.provider_ref ?? null) as string | null,
      cost: r.cost_amount === null ? null : Number(r.cost_amount),
      userId: r.user_id as string,
      email: r.email as string,
      name: r.name as string,
    })),
  };
}

export async function listFundings(status?: string) {
  const r = await pool.query(
    `select f.reference, f.amount, f.status, f.created_at, f.paid_at, f.note, u.email, u.name
       from public.wallet_fundings f join public.app_users u on u.id = f.user_id
      ${status && ["pending", "success", "failed", "mismatch"].includes(status) ? "where f.status = $1" : ""}
      order by f.created_at desc limit 100`,
    status && ["pending", "success", "failed", "mismatch"].includes(status) ? [status] : []
  );
  return r.rows.map((x) => ({
    reference: x.reference as string,
    amount: Number(x.amount),
    status: x.status as string,
    createdAt: new Date(x.created_at).toISOString(),
    paidAt: x.paid_at ? new Date(x.paid_at).toISOString() : null,
    note: (x.note ?? null) as string | null,
    email: x.email as string,
    name: x.name as string,
  }));
}

export async function listUsers(q?: string) {
  const search = String(q ?? "").trim().slice(0, 80);
  const r = await pool.query(
    `select u.id, u.name, u.email, u.member_since, u.is_admin, u.suspended_at, coalesce(w.balance, 0) as balance,
            (select max(created_at) from public.ledger_entries l where l.user_id = u.id) as last_active,
            (select count(*)::int from public.ledger_entries l where l.user_id = u.id and l.direction = 'debit' and l.status = 'successful') as purchases
       from public.app_users u left join public.wallets w on w.user_id = u.id
      ${search ? "where u.email ilike $1 or u.name ilike $1" : ""}
      order by u.member_since desc limit 200`,
    search ? [`%${search}%`] : []
  );
  return r.rows.map((x) => ({
    id: x.id as string,
    name: x.name as string,
    email: x.email as string,
    memberSince: new Date(x.member_since).toISOString(),
    isAdmin: Boolean(x.is_admin),
    suspended: Boolean(x.suspended_at),
    balance: Number(x.balance),
    lastActive: x.last_active ? new Date(x.last_active).toISOString() : null,
    purchases: x.purchases as number,
  }));
}

export async function getUserDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AdminError("Customer not found.", 404);
  const u = (
    await pool.query(
      `select u.id, u.auth_id, u.name, u.email, u.member_since, u.is_admin, u.suspended_at, coalesce(w.balance, 0) as balance
         from public.app_users u left join public.wallets w on w.user_id = u.id where u.id = $1`,
      [id]
    )
  ).rows[0];
  if (!u) throw new AdminError("Customer not found.", 404);
  const [ledger, mfa] = await Promise.all([
    pool.query(
      `select created_at, label, detail, amount, direction, status, provider, reference from public.ledger_entries
        where user_id = $1 order by created_at desc limit 25`,
      [id]
    ),
    pool.query(`select count(*)::int as n from auth.mfa_factors where user_id = $1 and status = 'verified'`, [u.auth_id]),
  ]);
  return {
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    memberSince: new Date(u.member_since).toISOString(),
    isAdmin: Boolean(u.is_admin),
    suspended: Boolean(u.suspended_at),
    balance: Number(u.balance),
    twoFactorOn: mfa.rows[0].n > 0,
    ledger: ledger.rows.map((r) => ({
      createdAt: new Date(r.created_at).toISOString(),
      label: r.label as string,
      detail: (r.detail ?? "") as string,
      amount: Number(r.amount),
      direction: r.direction as string,
      status: r.status as string,
      provider: (r.provider ?? null) as string | null,
      reference: (r.reference ?? null) as string | null,
    })),
  };
}

export async function listAudit(limit = 100) {
  const r = await pool.query(
    `select created_at, admin_email, action, target, before, after, note from public.admin_audit order by created_at desc limit $1`,
    [Math.min(Math.max(Math.floor(limit), 1), 500)]
  );
  return r.rows.map((x) => ({
    createdAt: new Date(x.created_at).toISOString(),
    admin: x.admin_email as string,
    action: x.action as string,
    target: (x.target ?? null) as string | null,
    before: x.before ?? null,
    after: x.after ?? null,
    note: (x.note ?? null) as string | null,
  }));
}

// ---- actions -----------------------------------------------------------------------------------------------------

/** Adds or removes money on a wallet, with a reason, as a visible ledger entry. A debit can never overdraw. */
export async function adjustBalance(adminEmail: string, userId: string, direction: "credit" | "debit", amount: number, note: unknown) {
  if (direction !== "credit" && direction !== "debit") throw new AdminError("Invalid direction.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    throw new AdminError("Amount must be between ₦0.01 and ₦1,000,000 with at most two decimals.");
  }
  const reason = requireNote(note);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = (await client.query(`select id, email from public.app_users where id = $1`, [userId])).rows[0];
    if (!user) throw new AdminError("Customer not found.", 404);

    const wallet = (
      await client.query(
        `update public.wallets set balance = balance ${direction === "credit" ? "+" : "-"} $2
          where user_id = $1 ${direction === "debit" ? "and balance >= $2" : ""} returning balance`,
        [userId, amount]
      )
    ).rows[0];
    if (!wallet) throw new AdminError(direction === "debit" ? "That is more than the customer's balance." : "Customer has no wallet.");

    const reference = `ADJ${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toUpperCase();
    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, provider)
       values ($1, $2, $3, $4, $5, 'successful', $6, 'admin')`,
      [userId, "Admin adjustment", reason, amount, direction, reference]
    );
    await client.query(
      `insert into public.admin_audit (admin_email, action, target, after, note) values ($1, $2, $3, $4::jsonb, $5)`,
      [adminEmail, `wallet.${direction}`, user.email, JSON.stringify({ amount, newBalance: Number(wallet.balance), reference }), reason]
    );
    await client.query("commit");
    return { balance: Number(wallet.balance), reference };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function setSuspended(adminEmail: string, userId: string, suspend: boolean, note: unknown) {
  const reason = requireNote(note);
  const u = (await pool.query(`select email, suspended_at from public.app_users where id = $1`, [userId])).rows[0];
  if (!u) throw new AdminError("Customer not found.", 404);
  if (u.email === adminEmail) throw new AdminError("You can't suspend your own account.");
  await pool.query(`update public.app_users set suspended_at = ${suspend ? "coalesce(suspended_at, now())" : "null"} where id = $1`, [userId]);
  await writeAudit({ adminEmail, action: suspend ? "user.suspend" : "user.unsuspend", target: u.email, before: { suspended: Boolean(u.suspended_at) }, after: { suspended: suspend }, note: reason });
}

export async function setAdmin(adminEmail: string, userId: string, makeAdmin: boolean, note: unknown) {
  const reason = requireNote(note);
  const u = (await pool.query(`select email, is_admin from public.app_users where id = $1`, [userId])).rows[0];
  if (!u) throw new AdminError("Customer not found.", 404);
  if (!makeAdmin) {
    if (u.email === adminEmail) throw new AdminError("You can't remove your own admin access.");
    const admins = (await pool.query(`select count(*)::int as n from public.app_users where is_admin`)).rows[0].n as number;
    if (admins <= 1) throw new AdminError("There must always be at least one admin.");
  }
  await pool.query(`update public.app_users set is_admin = $2 where id = $1`, [userId, makeAdmin]);
  await writeAudit({ adminEmail, action: makeAdmin ? "user.make_admin" : "user.remove_admin", target: u.email, before: { isAdmin: Boolean(u.is_admin) }, after: { isAdmin: makeAdmin }, note: reason });
}

/** For a customer who lost their phone: removes their authenticator so they can log in with the password and set it up again. */
export async function resetTwoFactor(adminEmail: string, userId: string, note: unknown) {
  const reason = requireNote(note);
  const u = (await pool.query(`select email, auth_id from public.app_users where id = $1`, [userId])).rows[0];
  if (!u) throw new AdminError("Customer not found.", 404);
  const r = await pool.query(`delete from auth.mfa_factors where user_id = $1`, [u.auth_id]);
  await writeAudit({ adminEmail, action: "user.reset_2fa", target: u.email, after: { factorsRemoved: r.rowCount }, note: reason });
  return { factorsRemoved: r.rowCount ?? 0 };
}

/** Resolves a payment that is stuck in "pending": ask the provider again, or settle it by hand with a recorded reason. */
export async function resolvePayment(adminEmail: string, reference: string, action: "recheck" | "mark_success" | "refund", note: unknown) {
  if (!/^[A-Z0-9]{6,40}$/.test(reference)) throw new AdminError("Invalid reference.");
  const row = (
    await pool.query(
      `select l.status, l.direction, l.amount, l.label, u.email from public.ledger_entries l join public.app_users u on u.id = l.user_id where l.reference = $1`,
      [reference]
    )
  ).rows[0];
  if (!row) throw new AdminError("Payment not found.", 404);
  if (row.direction !== "debit") throw new AdminError("Only purchases can be resolved.");

  if (action === "recheck") {
    const result = await refreshPayment(row.email, reference);
    await writeAudit({ adminEmail, action: "payment.recheck", target: reference, before: { status: row.status }, after: { status: result.status } });
    return { status: result.status };
  }

  const reason = requireNote(note);
  if (row.status !== "pending") throw new AdminError(`This payment is already ${row.status}.`);
  // The original provider stays on the row; the audit log records that an admin settled it and why.
  const changed = await settle(reference, action === "mark_success" ? "successful" : "failed", {});
  if (!changed) throw new AdminError("This payment was settled by someone else a moment ago.");
  await writeAudit({
    adminEmail,
    action: action === "mark_success" ? "payment.mark_success" : "payment.refund",
    target: reference,
    before: { status: "pending", label: row.label, amount: Number(row.amount) },
    after: { status: action === "mark_success" ? "successful" : "failed (refunded)" },
    note: reason,
  });
  return { status: action === "mark_success" ? "successful" : "failed" };
}

export async function recheckFunding(adminEmail: string, reference: string) {
  if (!/^[A-Z0-9]{8,60}$/.test(reference)) throw new AdminError("Invalid reference.");
  const row = (await pool.query(`select u.email, f.status from public.wallet_fundings f join public.app_users u on u.id = f.user_id where f.reference = $1`, [reference])).rows[0];
  if (!row) throw new AdminError("Funding not found.", 404);
  const result = await verifyAndCredit(row.email, reference);
  await writeAudit({ adminEmail, action: "funding.recheck", target: reference, before: { status: row.status }, after: { status: result.status } });
  return result;
}

// ---- provider health (live, read-only calls; cached briefly) ------------------------------------------------------

export interface ProviderHealth {
  name: string;
  mode: string;
  configured: boolean;
  balance: number | null;
  note: string | null;
  error: string | null;
  /** True when the balance is below the admin's alert level AND it is the prepaid balance that pays for orders. */
  low: boolean;
}

type RawHealth = Omit<ProviderHealth, "low"> & { /** This balance pays for customer orders (Paystack's does not). */ isFloat: boolean };

let healthCache: { at: number; value: RawHealth[] } | null = null;

async function timed<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timed out")), 8000))]);
}

export async function getProviderHealth(force = false): Promise<ProviderHealth[]> {
  const alertAt = (await getSettings()).providers.lowBalanceAlert;
  const withLow = (list: RawHealth[]): ProviderHealth[] =>
    list.map(({ isFloat, ...h }) => ({ ...h, low: isFloat && h.configured && h.balance !== null && h.balance < alertAt }));
  if (!force && healthCache && Date.now() - healthCache.at < 60_000) return withLow(healthCache.value);

  const ik = async (): Promise<RawHealth> => {
    const key = process.env.IKONECT_API_KEY;
    const h: RawHealth = { isFloat: true, name: "iKonect", mode: "live only (no sandbox)", configured: Boolean(key), balance: null, note: process.env.IKONECT_ENABLED === "true" ? "bills ON" : "bills OFF", error: null };
    if (!key) return h;
    try {
      const r = await timed(fetch("https://ikonect.com.ng/api/v1/balance/", { headers: { Authorization: `Bearer ${key}` } }));
      const j = await r.json();
      if (typeof j.balance === "number") h.balance = j.balance;
      else h.error = "unexpected response";
      h.note += process.env.IKONECT_IDENTITY_ENABLED === "true" ? " · lookups ON" : " · lookups OFF";
    } catch (e) {
      h.error = e instanceof Error ? e.message : "unreachable";
    }
    return h;
  };

  const vg = async (): Promise<RawHealth> => {
    const live = process.env.VTUGATE_ENV === "live";
    const key = live ? process.env.VTUGATE_API_KEY : process.env.VTUGATE_TEST_API_KEY;
    const h: RawHealth = { isFloat: live, name: "VTUGate", mode: live ? "LIVE" : "sandbox (fake purchases)", configured: Boolean(key), balance: null, note: process.env.VTUGATE_ENABLED === "false" ? "switched off" : null, error: null };
    if (!key) return h;
    try {
      const r = await timed(fetch("https://api.vtugate.com/api/v1/accountdetails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "" }));
      const j = await r.json();
      if (j?.data) {
        h.balance = Number(j.data.wallet_balance);
        h.note = [h.note, `KYC ${j.data.kyc_status}`, `account ${j.data.account_status}`].filter(Boolean).join(" · ");
      } else h.error = String(j?.message ?? "unexpected response");
    } catch (e) {
      h.error = e instanceof Error ? e.message : "unreachable";
    }
    return h;
  };

  const ps = async (): Promise<RawHealth> => {
    const key = process.env.PAYSTACK_SECRET_KEY;
    const h: RawHealth = { isFloat: false, name: "Paystack", mode: key?.startsWith("sk_live_") ? "LIVE" : key ? "test mode" : "not set", configured: Boolean(key), balance: null, note: null, error: null };
    if (!key) return h;
    try {
      const r = await timed(fetch("https://api.paystack.co/balance", { headers: { Authorization: `Bearer ${key}` } }));
      const j = await r.json();
      const ngn = (j?.data ?? []).find((b: { currency: string }) => b.currency === "NGN");
      if (ngn) h.balance = Number(ngn.balance) / 100;
      else h.error = String(j?.message ?? "unexpected response");
    } catch (e) {
      h.error = e instanceof Error ? e.message : "unreachable";
    }
    return h;
  };

  const value = await Promise.all([ik(), vg(), ps()]);
  healthCache = { at: Date.now(), value };
  return withLow(value);
}
