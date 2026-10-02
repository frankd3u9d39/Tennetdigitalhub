import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthUser {
  uid: string;
  email: string;
}

/** The logged-in Supabase user, verified with Supabase Auth (not just read from the cookie). */
export async function getSessionUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { uid: data.user.id, email: data.user.email };
}
