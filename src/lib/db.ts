import "server-only";
import { pool } from "./pg";

const NEW_ACCOUNT_STARTING_BALANCE = 0;

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

async function getOrCreateAccount(
  email: string,
  nameForNewAccount?: string
): Promise<AccountSnapshot> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    let user = (
      await client.query(
        `select id, name, email, role, reference, member_since from public.app_users where email = $1`,
        [email]
      )
    ).rows[0];

    if (!user) {
      // The display name comes from signup (email/password) or Google profile metadata.
      const auth = await client.query(
        `select id, coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name') as meta_name
         from auth.users where email = $1`,
        [email]
      );
      if (!auth.rows[0]) throw new Error("No login exists for this email.");
      user = (
        await client.query(
          `insert into public.app_users (auth_id, name, email, role, reference)
           values ($1, $2, $3, 'Verification Agent', $4)
           on conflict (email) do update set email = excluded.email
           returning id, name, email, role, reference, member_since`,
          [
            auth.rows[0].id,
            nameForNewAccount ?? auth.rows[0].meta_name ?? email,
            email,
            `usr_${Math.random().toString(16).slice(2, 12)}`,
          ]
        )
      ).rows[0];
    }

    const wallet = (
      await client.query(
        `insert into public.wallets (user_id, balance) values ($1, $2)
         on conflict (user_id) do update set user_id = excluded.user_id
         returning id, balance`,
        [user.id, NEW_ACCOUNT_STARTING_BALANCE]
      )
    ).rows[0];

    await client.query("commit");

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      reference: user.reference,
      memberSince: user.member_since ? new Date(user.member_since).toISOString() : null,
      walletId: wallet.id,
      balance: Number(wallet.balance),
    };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export const getAccount = getOrCreateAccount;

export async function getAccountSnapshot(email: string) {
  const account = await getOrCreateAccount(email);
  const [ledger, verifications] = await Promise.all([
    pool.query(
      `select id, label, detail, amount, direction, status, created_at
       from public.ledger_entries where user_id = $1 order by created_at desc limit 20`,
      [account.userId]
    ),
    pool.query(
      `select id, type, queried, subject_name, status, cost, created_at, kind
       from public.verification_records where user_id = $1 order by created_at desc limit 20`,
      [account.userId]
    ),
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
    ledger: ledger.rows.map((r) => ({
      id: r.id,
      label: r.label,
      detail: r.detail,
      amount: Number(r.amount),
      direction: r.direction,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    })),
    verifications: verifications.rows.map((r) => ({
      id: r.id,
      type: r.type,
      queried: r.queried,
      subjectName: r.subject_name,
      status: r.status,
      cost: Number(r.cost),
      kind: r.kind,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}
