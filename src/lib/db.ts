import "firebase-admin/app";
import { initializeApp, getApps } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";
import {
  connectorConfig,
  getUserByEmail,
  createUser,
  createWallet,
  getWalletByUser,
  setWalletBalance,
  insertLedgerEntry,
  listLedgerForUser,
  insertVerificationRecord,
  listVerificationsForUser,
} from "./dataconnect-admin-generated";

if (getApps().length === 0) {
  initializeApp();
}

const dc = getDataConnect(connectorConfig);

const DEMO_EMAIL = "james.okon@tennetdigital.ng";
const DEMO_NAME = "James Okon";
const DEMO_STARTING_BALANCE = 24500;

interface AccountSnapshot {
  userId: string;
  name: string;
  email: string;
  role: string | null;
  reference: string | null;
  memberSince: string | null;
  walletId: string;
  balance: number;
}

async function getOrCreateAccount(email: string = DEMO_EMAIL): Promise<AccountSnapshot> {
  const existing = await getUserByEmail(dc, { email });
  const found = existing.data.users[0];
  let userId = found?.id;
  let name = found?.name ?? DEMO_NAME;
  let role = found?.role ?? null;
  let reference = found?.reference ?? null;
  let memberSince = found?.memberSince ?? null;

  if (!userId) {
    const created = await createUser(dc, {
      name: DEMO_NAME,
      email,
      role: "Verification Agent",
      reference: `usr_${Math.random().toString(16).slice(2, 12)}`,
    });
    userId = created.data.user_insert.id;
    name = DEMO_NAME;
    role = "Verification Agent";

    const refetch = await getUserByEmail(dc, { email });
    const refetched = refetch.data.users[0];
    reference = refetched?.reference ?? null;
    memberSince = refetched?.memberSince ?? null;
  }

  const walletRes = await getWalletByUser(dc, { userId });
  let wallet = walletRes.data.wallets[0];

  if (!wallet) {
    const created = await createWallet(dc, { userId, balance: DEMO_STARTING_BALANCE });
    wallet = { id: created.data.wallet_insert.id, balance: DEMO_STARTING_BALANCE };
  }

  return {
    userId,
    name,
    email,
    role,
    reference,
    memberSince,
    walletId: wallet.id,
    balance: wallet.balance,
  };
}

export async function getAccountSnapshot(email: string = DEMO_EMAIL) {
  const account = await getOrCreateAccount(email);
  const [ledger, verifications] = await Promise.all([
    listLedgerForUser(dc, { userId: account.userId, limit: 20 }),
    listVerificationsForUser(dc, { userId: account.userId, limit: 20 }),
  ]);

  return {
    user: {
      id: account.userId,
      name: account.name,
      email: account.email,
      role: account.role,
      reference: account.reference,
      memberSince: account.memberSince,
    },
    balance: account.balance,
    ledger: ledger.data.ledgerEntries,
    verifications: verifications.data.verificationRecords,
  };
}

export async function applyWalletTransaction(input: {
  direction: "credit" | "debit";
  amount: number;
  label: string;
  detail?: string;
  email?: string;
}) {
  const account = await getOrCreateAccount(input.email);

  if (input.direction === "debit" && account.balance < input.amount) {
    throw new Error("Insufficient wallet balance.");
  }

  const nextBalance =
    input.direction === "credit"
      ? account.balance + input.amount
      : account.balance - input.amount;

  await setWalletBalance(dc, { walletId: account.walletId, balance: nextBalance });
  const entry = await insertLedgerEntry(dc, {
    userId: account.userId,
    label: input.label,
    detail: input.detail,
    amount: input.amount,
    direction: input.direction,
    status: "successful",
  });

  return { balance: nextBalance, ledgerEntryId: entry.data.ledgerEntry_insert.id };
}

export async function recordVerification(input: {
  type: string;
  queried: string;
  subjectName?: string;
  status: string;
  cost: number;
  email?: string;
}) {
  const account = await getOrCreateAccount(input.email);
  const record = await insertVerificationRecord(dc, {
    userId: account.userId,
    type: input.type,
    queried: input.queried,
    subjectName: input.subjectName,
    status: input.status,
    cost: input.cost,
  });
  return record.data.verificationRecord_insert.id;
}
