import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pool } from "@/lib/pg";

export interface AuthUser {
  uid: string;
  email: string;
  /** The Google profile picture, when they signed in with Google. Read from the login itself; never stored by us. */
  avatarUrl?: string | null;
}

/** Only accept Google's own picture hosts, so the account metadata (which a user can edit) can't point us at any other site. */
function googleAvatar(meta: Record<string, unknown> | undefined): string | null {
  const raw = meta?.avatar_url ?? meta?.picture;
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname.endsWith(".googleusercontent.com") ? u.toString() : null;
  } catch {
    return null;
  }
}

export interface AuthState {
  user: AuthUser | null;
  /** The account has two-factor on, but this login hasn't entered its code yet. */
  needsMfa: boolean;
  /** The account has a verified authenticator-app factor (so it can be required for admin access). */
  hasMfa: boolean;
  /** An admin has suspended this account: it can log in but can use nothing. */
  suspended: boolean;
  isAdmin: boolean;
}

/**
 * Who is logged in, verified with Supabase Auth (not just read from the cookie), whether they still owe a
 * two-factor code (a verified authenticator factor means the session must be at assurance level "aal2"),
 * and whether an admin has suspended them or made them an admin.
 */
export async function getAuthState(): Promise<AuthState> {
  const none: AuthState = { user: null, needsMfa: false, hasMfa: false, suspended: false, isAdmin: false };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return none;

  const hasMfa = (data.user.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
  let needsMfa = false;
  if (hasMfa) {
    const { data: claims } = await supabase.auth.getClaims();
    needsMfa = claims?.claims?.aal !== "aal2";
  }

  const row = (await pool.query(`select suspended_at, is_admin from public.app_users where email = $1`, [data.user.email])).rows[0];
  return {
    user: { uid: data.user.id, email: data.user.email, avatarUrl: googleAvatar(data.user.user_metadata) },
    needsMfa,
    hasMfa,
    suspended: Boolean(row?.suspended_at),
    isAdmin: Boolean(row?.is_admin),
  };
}

/**
 * The fully authenticated user for data and money APIs. Returns null if two-factor is on and this login hasn't
 * completed it, or if the account is suspended, so neither a stolen password nor a suspended account can spend or read.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const { user, needsMfa, suspended } = await getAuthState();
  return user && !needsMfa && !suspended ? user : null;
}

/**
 * An administrator: flagged admin in the database, not suspended, AND signed in with two-factor completed.
 * An admin without two-factor gets nothing: a stolen admin password must never be enough.
 */
export async function getAdminUser(): Promise<AuthUser | null> {
  const s = await getAuthState();
  return s.user && s.isAdmin && s.hasMfa && !s.needsMfa && !s.suspended ? s.user : null;
}
