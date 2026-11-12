import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import {
  initializeTransaction,
  isValidWebhookSignature,
  verifyTransaction,
  createTransferRecipient,
  initiateTransfer,
  resolveAccountName,
  verifyTransfer,
  type PaystackTransaction,
} from "./paystack";
import { bankCodeFor } from "./banks";

export class FundingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const MIN_FUNDING_NAIRA = 100;
export const MAX_FUNDING_NAIRA = 1_000_000;

export type FundingOutcome = "credited" | "already_credited" | "rejected" | "unknown_reference";

function makeReference() {
  return `TDF${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.toUpperCase();
}

/** Records a pending funding and returns the Paystack checkout URL. Nothing is credited here. */
export async function startFunding(email: string, amountNaira: number, callbackUrl: string) {
  if (!Number.isInteger(amountNaira) || amountNaira < MIN_FUNDING_NAIRA || amountNaira > MAX_FUNDING_NAIRA) {
    throw new FundingError(`Enter a whole amount between ₦${MIN_FUNDING_NAIRA.toLocaleString()} and ₦${MAX_FUNDING_NAIRA.toLocaleString()}.`);
  }
  const account = await getAccount(email);
  const reference = makeReference();

  await pool.query(`insert into public.wallet_fundings (user_id, reference, amount) values ($1, $2, $3)`, [
    account.userId,
    reference,
    amountNaira,
  ]);

  try {
    const { authorizationUrl } = await initializeTransaction({
      email,
      amountKobo: amountNaira * 100,
      reference,
      callbackUrl: `${callbackUrl}?reference=${reference}`,
    });
    return { authorizationUrl, reference };
  } catch (err) {
    await pool.query(`update public.wallet_fundings set status = 'failed', note = 'initialize failed' where reference = $1`, [reference]);
    throw err;
  }
}

/**
 * Credits the wallet for a confirmed payment, exactly once. The amount credited is the amount WE recorded when the
 * checkout started, and Paystack must report that same amount in NGN, so a tampered or partial payment is never
 * credited in full.
 */
export async function creditFunding(reference: string, paid: PaystackTransaction): Promise<FundingOutcome> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const row = (
      await client.query(`select id, user_id, amount, status from public.wallet_fundings where reference = $1 for update`, [reference])
    ).rows[0];

    if (!row) {
      await client.query("rollback");
      return "unknown_reference";
    }
    if (row.status === "success") {
      await client.query("rollback");
      return "already_credited";
    }

    const expectedKobo = Math.round(Number(row.amount) * 100);
    if (paid.status !== "success" || paid.currency !== "NGN" || Number(paid.amount) !== expectedKobo) {
      if (paid.status === "success") {
        await client.query(
          `update public.wallet_fundings set status = 'mismatch', note = $2 where id = $1`,
          [row.id, `Paystack reported ${paid.amount} ${paid.currency}, expected ${expectedKobo} NGN`]
        );
        console.error(`[funding] amount mismatch for ${reference}: paystack ${paid.amount} ${paid.currency}, expected ${expectedKobo}`);
      }
      await client.query("commit");
      return "rejected";
    }

    await client.query(
      `update public.wallet_fundings set status = 'success', paid_at = now(), paystack_id = $2 where id = $1`,
      [row.id, paid.id != null ? String(paid.id) : null]
    );
    await client.query(`update public.wallets set balance = balance + $2 where user_id = $1`, [row.user_id, row.amount]);
    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, provider)
       values ($1, 'Wallet funding', $2, $3, 'credit', 'successful', $4, 'paystack')`,
      [row.user_id, `Paystack · ${reference}`, row.amount, reference]
    );
    await client.query("commit");
    return "credited";
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export interface FundingStatus {
  status: "success" | "pending" | "failed";
  reference: string;
  amountNaira: number;
}

/** Called when the customer returns from Paystack: confirms the payment with Paystack, then credits. */
export async function verifyAndCredit(email: string, reference: string): Promise<FundingStatus> {
  const account = await getAccount(email);
  const row = (
    await pool.query(`select amount, status from public.wallet_fundings where reference = $1 and user_id = $2`, [reference, account.userId])
  ).rows[0];
  if (!row) throw new FundingError("Payment not found.", 404);

  const amountNaira = Number(row.amount);
  if (row.status === "success") return { status: "success", reference, amountNaira };
  if (row.status === "mismatch") return { status: "failed", reference, amountNaira };

  // Pending, or marked failed earlier: ask Paystack again, because a checkout link stays payable and a late
  // payment must still be credited.
  const tx = await verifyTransaction(reference);
  if (tx.status === "success") {
    const outcome = await creditFunding(reference, tx);
    return { status: outcome === "credited" || outcome === "already_credited" ? "success" : "failed", reference, amountNaira };
  }
  if (tx.status === "failed" || tx.status === "reversed") {
    await pool.query(`update public.wallet_fundings set status = 'failed', note = $2 where reference = $1 and status = 'pending'`, [reference, `paystack: ${tx.status}`]);
    return { status: "failed", reference, amountNaira };
  }
  // "abandoned", "ongoing", "pending"…: not finished YET (an unpaid checkout reports "abandoned" until it is paid).
  await pool.query(`update public.wallet_fundings set status = 'pending', note = null where reference = $1 and status = 'failed'`, [reference]);
  return { status: "pending", reference, amountNaira };
}

/**
 * Paystack webhook: the reliable path, since the customer may close the tab before returning. Verifies the signature,
 * re-confirms the transaction with Paystack, and credits. Returns the HTTP status to answer with.
 */
export async function handlePaystackWebhook(rawBody: string, signature: string | null): Promise<number> {
  if (!signature) return 401; // unsigned requests are rejected before anything else, even if the key isn't configured
  if (!isValidWebhookSignature(rawBody, signature)) return 401;

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return 400;
  }
  if (event.event?.startsWith("transfer.") && event.data?.reference) {
    return settleWithdrawalFromWebhook(event.data.reference);
  }
  if (event.event !== "charge.success" || !event.data?.reference) return 200; // not an event we act on

  const reference = event.data.reference;
  try {
    // Ignore payments that aren't ours (no funding row) without bothering Paystack.
    const known = await pool.query(`select 1 from public.wallet_fundings where reference = $1`, [reference]);
    if (known.rowCount === 0) return 200;

    const tx = await verifyTransaction(reference);
    await creditFunding(reference, tx);
    return 200;
  } catch (err) {
    console.error("[funding] webhook processing failed:", err instanceof Error ? err.message : err);
    return 500; // makes Paystack retry later
  }
}

export function isPaystackTestMode(): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY || "";
  return key.startsWith("sk_test_") || !key;
}

/**
 * Simulates a deposit immediately for test/sandbox mode without redirecting to Paystack.
 */
export async function simulateTestDeposit(email: string, amountNaira: number) {
  if (!Number.isInteger(amountNaira) || amountNaira < MIN_FUNDING_NAIRA || amountNaira > MAX_FUNDING_NAIRA) {
    throw new FundingError(`Enter an amount between ₦${MIN_FUNDING_NAIRA.toLocaleString()} and ₦${MAX_FUNDING_NAIRA.toLocaleString()}.`);
  }
  const account = await getAccount(email);
  const reference = makeReference();

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into public.wallet_fundings (user_id, reference, amount, status, paid_at, note) values ($1, $2, $3, 'success', now(), 'Simulated test deposit')`,
      [account.userId, reference, amountNaira]
    );
    const updated = await client.query(
      `update public.wallets set balance = balance + $2 where user_id = $1 returning balance`,
      [account.userId, amountNaira]
    );
    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, provider)
       values ($1, 'Wallet funding', $2, $3, 'credit', 'successful', $4, 'paystack')`,
      [account.userId, `Paystack (Test) · ${reference}`, amountNaira, reference]
    );
    await client.query("commit");
    return {
      reference,
      amountNaira,
      newBalance: Number(updated.rows[0]?.balance ?? 0),
    };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Withdraws funds from wallet to a Nigerian bank account.
 */
export async function withdrawFunds(email: string, input: {
  amountNaira: number;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
}) {
  const { amountNaira, bankName, accountNumber, accountName } = input;
  if (!Number.isInteger(amountNaira) || amountNaira < 100) {
    throw new FundingError("Minimum withdrawal amount is ₦100.");
  }
  const cleanAcc = (accountNumber || "").replace(/\D/g, "");
  if (cleanAcc.length !== 10) {
    throw new FundingError("Enter a valid 10-digit account number.");
  }
  if (!bankName?.trim()) {
    throw new FundingError("Please select a bank.");
  }
  if (!accountName?.trim()) {
    throw new FundingError("Please provide the account name.");
  }

  const live = !isPaystackTestMode();
  // The server picks the bank code from the bank name; a client-sent code is only a fallback for unlisted banks.
  const bankCode = bankCodeFor(bankName) ?? (input.bankCode?.trim() || undefined);
  let payeeName = accountName.trim();

  // Live: confirm the account exists before touching the wallet, and use the name the bank reports.
  if (live) {
    if (!bankCode) throw new FundingError("This bank isn't supported for withdrawals yet.");
    try {
      const resolved = await resolveAccountName(cleanAcc, bankCode);
      payeeName = resolved.account_name || payeeName;
    } catch {
      throw new FundingError("We couldn't verify that account number with the selected bank. Check both and try again.");
    }
  }

  const account = await getAccount(email);
  const reference = `TDW${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase();
  const detail = `Withdrawal to ${bankName.trim()} (${cleanAcc}) · ${payeeName}`;

  // 1) Debit the wallet and record the withdrawal (pending in live mode) in one transaction.
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
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, provider)
       values ($1, 'Wallet withdrawal', $2, $3, 'debit', $4, $5, 'paystack')`,
      [account.userId, detail, amountNaira, live ? "pending" : "successful", reference]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  if (!live) {
    return { reference, amountNaira, newBalance, detail, accountName: payeeName, status: "successful" as const };
  }

  // 2) Live: send the money through Paystack. If Paystack refuses, put the money back in the wallet.
  try {
    const recipient = await createTransferRecipient({ name: payeeName, accountNumber: cleanAcc, bankCode: bankCode! });
    const transfer = await initiateTransfer({
      amountKobo: amountNaira * 100,
      recipientCode: recipient.recipient_code,
      reason: "Tennet wallet withdrawal",
      reference,
    });
    if (transfer.status === "otp") {
      throw new Error("Paystack is asking for an OTP for transfers. Turn off 'Confirm transfers with OTP' in Paystack Settings → Preferences.");
    }
    if (transfer.status === "failed" || transfer.status === "reversed") {
      throw new Error(`Paystack reported the transfer as ${transfer.status}.`);
    }
    const status = transfer.status === "success" ? "successful" : "pending";
    await pool.query(`update public.ledger_entries set status = $2, provider_ref = $3 where reference = $1`, [
      reference,
      status,
      transfer.transfer_code,
    ]);
    return { reference, transferCode: transfer.transfer_code, amountNaira, newBalance, detail, accountName: payeeName, status };
  } catch (err) {
    const why = err instanceof Error ? err.message : "Paystack transfer could not be initiated.";
    console.error(`[withdrawal] ${reference} failed, refunding:`, why);
    await refundWithdrawal(account.userId, reference, amountNaira, why);
    throw new FundingError(`Withdrawal failed and your ₦${amountNaira.toLocaleString()} was returned to your wallet. ${why}`, 502);
  }
}

/**
 * Step 5: Paystack's transfer.success / transfer.failed / transfer.reversed webhook. The event body is only a hint:
 * we re-fetch the transfer from Paystack and settle our ledger row from that. Returns the HTTP status to answer with.
 */
async function settleWithdrawalFromWebhook(reference: string): Promise<number> {
  const row = (
    await pool.query(
      `select user_id, amount, status from public.ledger_entries
       where reference = $1 and label = 'Wallet withdrawal' and provider = 'paystack'`,
      [reference]
    )
  ).rows[0];
  if (!row) return 200; // not one of ours

  try {
    const transfer = await verifyTransfer(reference);
    if (transfer.status === "success") {
      await pool.query(
        `update public.ledger_entries set status = 'successful', provider_ref = coalesce(provider_ref, $2)
         where reference = $1 and status = 'pending'`,
        [reference, transfer.transfer_code]
      );
    } else if (transfer.status === "failed" || transfer.status === "reversed") {
      await refundWithdrawal(row.user_id, reference, Number(row.amount), `Paystack reported the transfer as ${transfer.status}.`);
    }
    // pending / processing / queued: wait for the next event.
    return 200;
  } catch (err) {
    console.error(`[withdrawal] webhook settle failed for ${reference}:`, err instanceof Error ? err.message : err);
    return 500; // Paystack retries
  }
}

/**
 * Puts a failed withdrawal's money back, exactly once: a row that is already 'failed' is never refunded again.
 * A 'successful' row can still be refunded, because Paystack may reverse a transfer after it succeeded.
 */
async function refundWithdrawal(userId: string, reference: string, amountNaira: number, why: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const row = await client.query(
      `update public.ledger_entries set status = 'failed', result = jsonb_build_object('error', $2::text)
       where reference = $1 and status in ('pending', 'successful') returning id`,
      [reference, why]
    );
    if (row.rowCount) {
      await client.query(`update public.wallets set balance = balance + $2 where user_id = $1`, [userId, amountNaira]);
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error(`[withdrawal] REFUND FAILED for ${reference}:`, err);
  } finally {
    client.release();
  }
}

