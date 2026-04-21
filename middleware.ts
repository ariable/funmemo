import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildLoginRedirectUrl } from "@/lib/server/auth-redirect";
import { getAppUrl } from "@/lib/server/casdoor";

function isProtectedPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/settings") || pathname.startsWith("/jobs");
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.cookies.get("funmemo_session")?.value) {
    return NextResponse.next();
  }

  const loginUrl = process.env.AUTH_LOGIN_URL?.trim() || `${getAppUrl()}/api/auth/sign-in/casdoor`;

  const authAttempt = request.nextUrl.searchParams.get("authAttempt");

  if (authAttempt === "interactive") {
    return NextResponse.next();
  }

  const redirectUrl = buildLoginRedirectUrl({
    currentUrl: request.nextUrl,
    loginUrl,
    attempt: authAttempt === "silent" ? "interactive" : "silent",
  });

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/", "/settings/:path*", "/jobs/:path*"],
};
