import { NextResponse } from "next/server";
import { getCasdoorDiscovery, resolveAppUrl } from "@/lib/server/casdoor";
import { SESSION_COOKIE_NAME } from "@/lib/server/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  const redirectTo = new URL(returnTo, resolveAppUrl({ requestUrl: request.url, headers: request.headers }));
  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete(SESSION_COOKIE_NAME);

  try {
    const discovery = await getCasdoorDiscovery();
    if (discovery.end_session_endpoint) {
      const logoutUrl = new URL(discovery.end_session_endpoint);
      logoutUrl.searchParams.set("service", redirectTo.toString());
      response.headers.set("Location", logoutUrl.toString());
    }
  } catch {
    // Fall back to local logout redirect when Casdoor metadata is unavailable.
  }

  return response;
}
