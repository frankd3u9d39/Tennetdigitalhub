import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { FundingError, isPaystackTestMode } from "./funding";
import { createTransferRecipient, initiateTransfer, resolveAccountName, verifyTransfer } from "./paystack";
import { bankCodeFor } from "./banks";
import { getSettings } from "./settings";

// Wallet withdrawals.
//
// The money leaves the wallet as soon as a withdrawal is requested (so it can't be spent twice) and the ledger row
// stays 'pending' until it is settled one of three ways:
//   - paid: an admin sent the money by hand (manual mode), or Paystack confirmed the transfer;
//   - rejected: an admin refused it, and the money goes back to the wallet;
//   - queued for an admin: Paystack refused or reversed it. It is NOT refunded automatically; it waits in the
//     admin queue so the customer still gets paid.
//
// Everything needed to pay by hand is kept on the ledger row in `result.payout`. `result.manual` marks rows that need an
// admin; provider = 'manual' keeps Paystack webhooks away from them.

export const WITHDRAWAL_LABEL = "Wallet withdrawal";

export interface PayoutDetails {
  bankName: string;
  bankCode: string | null;
  accountNumber: string;
  accountName: string;
  verified: boolean;
}

export async function withdrawFunds(
  email: string,
  input: { amountNaira: number; bankName: string; bankCode?: string; accountNumber: string; accountName: string }
) {
  const { amountNaira, bankName, accountNumber, accountName } = input;
  if (!Number.isInteger(amountNaira) || amountNaira < 100) throw new FundingError("Minimum withdrawal amount is ₦100.");
  const cleanAcc = (accountNumber || "").replace(/\D/g, "");
  if (cleanAcc.length !== 10) throw new FundingError("Enter a valid 10-digit account number.");
  if (!bankName?.trim()) throw new FundingError("Please select a bank.");
  if (!accountName?.trim()) throw new FundingError("Please provide the account name.");

  const live = !isPaystackTestMode();
  const { withdrawals } = await getSettings();
  // The server picks the bank code from the bank name; a client-sent code is only a fallback for unlisted banks.
  const bankCode = bankCodeFor(bankName) ?? (input.bankCode?.trim() || null);
  let payeeName = accountName.trim();
  let verified = false;

  // Live: confirm the account exists before touching the wallet, and use the name the bank reports.
  if (live) {
    if (!bankCode) throw new FundingError("This bank isn't supported for withdrawals yet.");
    try {
      const resolved = await resolveAccountName(cleanAcc, bankCode);
      payeeName = resolved.account_name || payeeName;
      verified = true;
    } catch {
      throw new FundingError("We couldn't verify that account number with the selected bank. Check both and try again.");
    }
  }

  const payout: PayoutDetails = { bankName: bankName.trim(), bankCode, accountNumber: cleanAcc, accountName: payeeName, verified };
  const viaPaystack = live && !withdrawals.manual;
  const account = await getAccount(email);
  const reference = `TDW${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase();
  const detail = `Withdrawal to ${payout.bankName} (${cleanAcc}) · ${payeeName}`;

  // 1) Take the money out of the wallet and record the request, in one transaction.
  const client = await pool.connect();
  let newBalance: number;
  try {
    await client.query("begin");
    const updated = await client.query(
      `update public.wallets set balance = balance - $2 where user_id = $1 and balance >= $2 returning balance`,
      [account.userId, amountNaira]
    );
    if (updated.rowCount === 0) {
      const bal = await client.query(`select balance from public.wallets where user_id = $1`, [account.userId]);
      throw new FundingError(`Insufficient balance. You have ₦${Number(bal.rows[0]?.balance ?? 0).toLocaleString()} available.`);
    }
    newBalance = Number(updated.rows[0].balance);
    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, provider, result)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6, $7::jsonb)`,
      [
        account.userId,
        WITHDRAWAL_LABEL,
        detail,
        amountNaira,
        reference,
        viaPaystack ? "paystack" : "manual",
        JSON.stringify({ payout, manual: !viaPaystack, manualReason: viaPaystack ? null : "Manual payouts are on." }),
      ]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const base = { reference, amountNaira, newBalance, detail, accountName: payeeName };
  if (!viaPaystack) return { ...base, status: "pending" as const, manual: true };

  // 2) Automatic mode: try Paystack. If it refuses, the request waits for an admin instead of failing.
  try {
    const recipient = await createTransferRecipient({ name: payeeName, accountNumber: cleanAcc, bankCode: bankCode! });
    const transfer = await initiateTransfer({
      amountKobo: amountNaira * 100,
      recipientCode: recipient.recipient_code,
      reason: "Tennet wallet withdrawal",
      reference,
    });
    if (transfer.status === "otp") throw new Error("Paystack asked for an OTP (turn off 'Confirm transfers with OTP').");
    if (transfer.status === "failed" || transfer.status === "reversed") throw new Error(`Paystack reported the transfer as ${transfer.status}.`);
    const status = transfer.status === "success" ? "successful" : "pending";
    await pool.query(`update public.ledger_entries set status = $2, provider_ref = $3 where reference = $1`, [reference, status, transfer.transfer_code]);
    return { ...base, status, manual: false, transferCode: transfer.transfer_code };
  } catch (err) {
    const why = err instanceof Error ? err.message : "Paystack transfer could not be initiated.";
    console.error(`[withdrawal] ${reference}: Paystack refused, queued for an admin:`, why);
    await queueForAdmin(reference, `Paystack: ${why}`);
    return { ...base, status: "pending" as const, manual: true };
  }
}

/** Moves a withdrawal into the admin queue (pending, manual). Works for pending rows and for reversed 'successful' ones. */
async function queueForAdmin(reference: string, why: string) {
  await pool.query(
    `update public.ledger_entries
        set status = 'pending', provider = 'manual',
            result = coalesce(result, '{}'::jsonb) || jsonb_build_object('manual', true, 'manualReason', $2::text)
      where reference = $1 and label = $3 and status in ('pending', 'successful')`,
    [reference, why, WITHDRAWAL_LABEL]
  );
}

/**
 * Paystack transfer.success / transfer.failed / transfer.reversed webhook. The event body is only a hint: the transfer is
 * re-fetched from Paystack. Failed or reversed transfers go to the admin queue. Returns the HTTP status to answer with.
 */
export async function settleWithdrawalFromWebhook(reference: string): Promise<number> {
  const row = (
    await pool.query(`select status from public.ledger_entries where reference = $1 and label = $2 and provider = 'paystack'`, [
      reference,
      WITHDRAWAL_LABEL,
    ])
  ).rows[0];
  if (!row) return 200; // not ours, or already handed to an admin

  try {
    const transfer = await verifyTransfer(reference);
    if (transfer.status === "success") {
      await pool.query(
        `update public.ledger_entries set status = 'successful', provider_ref = coalesce(provider_ref, $2)
          where reference = $1 and status = 'pending' and provider = 'paystack'`,
        [reference, transfer.transfer_code]
      );
    } else if (transfer.status === "failed" || transfer.status === "reversed") {
      await queueForAdmin(reference, `Paystack reported the transfer as ${transfer.status}.`);
    }
    return 200; // pending / processing / queued: wait for the next event
  } catch (err) {
    console.error(`[withdrawal] webhook settle failed for ${reference}:`, err instanceof Error ? err.message : err);
    return 500; // Paystack retries
  }
}

// ---- admin queue ---------------------------------------------------------------------------------------------------

export class WithdrawalAdminError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface AdminWithdrawal {
  reference: string;
  amount: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone: string | null };
  payout: PayoutDetails | null;
  detail: string;
  manualReason: string | null;
  paidBy: string | null;
  paidAt: string | null;
  payoutNote: string | null;
  rejectReason: string | null;
}

/** Waiting withdrawals first (oldest first, so nobody waits longest), then the latest settled ones. */
export async function listWithdrawals(filter: "pending" | "all" = "pending"): Promise<AdminWithdrawal[]> {
  const r = await pool.query(
    `select l.reference, l.amount, l.status, l.created_at, l.detail, l.result, u.id as user_id, u.name, u.email, u.phone
       from public.ledger_entries l join public.app_users u on u.id = l.user_id
      where l.label = $1 ${filter === "pending" ? "and l.status = 'pending'" : ""}
      order by (l.status = 'pending') desc,
               case when l.status = 'pending' then l.created_at end asc,
               l.created_at desc
      limit 200`,
    [WITHDRAWAL_LABEL]
  );
  return r.rows.map((x) => {
    const res = (x.result ?? {}) as Record<string, unknown>;
    return {
      reference: x.reference,
      amount: Number(x.amount),
      status: x.status,
      createdAt: new Date(x.created_at).toISOString(),
      customer: { id: x.user_id, name: x.name, email: x.email, phone: x.phone ?? null },
      payout: (res.payout as PayoutDetails) ?? null,
      detail: x.detail ?? "",
      manualReason: (res.manualReason as string) ?? null,
      paidBy: (res.paidBy as string) ?? null,
      paidAt: (res.paidAt as string) ?? null,
      payoutNote: (res.payoutNote as string) ?? null,
      rejectReason: (res.rejectReason as string) ?? null,
    };
  });
}

/** How many withdrawals wait for an admin and how much they add up to: drives the admin alerts. */
export async function pendingWithdrawalSummary() {
  const r = await pool.query(
    `select count(*)::int as n, coalesce(sum(amount), 0) as total, min(created_at) as oldest
       from public.ledger_entries where label = $1 and status = 'pending'`,
    [WITHDRAWAL_LABEL]
  );
  const row = r.rows[0];
  return { count: row.n as number, total: Number(row.total), oldest: row.oldest ? new Date(row.oldest).toISOString() : null };
}

/** The admin sent the money by hand: close the request. The wallet was already debited when it was requested. */
export async function markWithdrawalPaid(adminEmail: string, reference: string, note: unknown) {
  const payoutNote = String(note ?? "").trim().slice(0, 300) || null;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const row = (
      await client.query(
        `update public.ledger_entries
            set status = 'successful',
                result = coalesce(result, '{}'::jsonb) || jsonb_build_object('paidBy', $2::text, 'paidAt', now(), 'payoutNote', $3::text)
          where reference = $1 and label = $4 and status = 'pending'
          returning amount, user_id`,
        [reference, adminEmail, payoutNote, WITHDRAWAL_LABEL]
      )
    ).rows[0];
    if (!row) throw new WithdrawalAdminError("This withdrawal is no longer waiting (someone may have handled it already).", 409);
    await client.query(
      `insert into public.admin_audit (admin_email, action, target, after, note) values ($1, 'withdrawal.paid', $2, $3::jsonb, $4)`,
      [adminEmail, reference, JSON.stringify({ amount: Number(row.amount) }), payoutNote]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** The admin refused the request: give the money back to the wallet, exactly once. */
export async function rejectWithdrawal(adminEmail: string, reference: string, reason: unknown) {
  const why = String(reason ?? "").trim();
  if (why.length < 5) throw new WithdrawalAdminError("Please give a reason (at least 5 characters). The customer sees it.");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const row = (
      await client.query(
        `update public.ledger_entries
            set status = 'failed',
                result = coalesce(result, '{}'::jsonb) || jsonb_build_object('rejectedBy', $2::text, 'rejectReason', $3::text, 'error', $3::text)
          where reference = $1 and label = $4 and status = 'pending'
          returning amount, user_id`,
        [reference, adminEmail, why.slice(0, 300), WITHDRAWAL_LABEL]
      )
    ).rows[0];
    if (!row) throw new WithdrawalAdminError("This withdrawal is no longer waiting (someone may have handled it already).", 409);
    await client.query(`update public.wallets set balance = balance + $2 where user_id = $1`, [row.user_id, row.amount]);
    await client.query(
      `insert into public.admin_audit (admin_email, action, target, after, note) values ($1, 'withdrawal.rejected', $2, $3::jsonb, $4)`,
      [adminEmail, reference, JSON.stringify({ amount: Number(row.amount), refunded: true }), why.slice(0, 300)]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
