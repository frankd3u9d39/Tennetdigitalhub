import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/wallet", "/history", "/settings", "/verify", "/two-factor", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  // Verifies the JWT (and refreshes it when needed). The (app) layout and every API route
  // re-check the session with Supabase Auth.
  const { data } = await supabase.auth.getClaims();
  let signedIn = Boolean(data?.claims);
  const { pathname } = req.nextUrl;

  // A token can still look valid after its user was deleted or its session revoked. On the login pages, confirm
  // with Supabase and clear the dead cookie; otherwise /login -> /dashboard -> /login would redirect forever.
  if (signedIn && AUTH_PAGES.includes(pathname)) {
    const { data: current, error } = await supabase.auth.getUser();
    if (error || !current.user) {
      await supabase.auth.signOut({ scope: "local" });
      signedIn = false;
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtected && !signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Keep the query string too (e.g. Paystack's ?reference=… when a customer returns after their session expired).
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/wallet/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/verify/:path*",
    "/admin/:path*",
    "/two-factor",
    "/login",
    "/signup",
  ],
};
