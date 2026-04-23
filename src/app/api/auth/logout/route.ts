import { NextResponse } from "next/server";
import { SKIP_SILENT_LOGIN_COOKIE_NAME, SKIP_SILENT_LOGIN_MAX_AGE_SEC } from "@/lib/auth-login";
import { resolveAppUrl } from "@/lib/server/casdoor";
import { SESSION_COOKIE_NAME } from "@/lib/server/session";

export async function GET(request: Request) {
  const redirectTo = new URL("/logged-out", resolveAppUrl({ requestUrl: request.url, headers: request.headers }));
  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.set(SKIP_SILENT_LOGIN_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: redirectTo.protocol === "https:",
    path: "/",
    maxAge: SKIP_SILENT_LOGIN_MAX_AGE_SEC,
  });

  return response;
}
