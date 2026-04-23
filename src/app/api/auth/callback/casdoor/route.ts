import { NextResponse } from "next/server";
import { SKIP_SILENT_LOGIN_COOKIE_NAME } from "@/lib/auth-login";
import { clearAuthAttempt } from "@/lib/server/auth-redirect";
import { exchangeCodeForAccessToken, fetchCasdoorUserInfo, resolveAppUrl } from "@/lib/server/casdoor";
import {
  AUTH_FLOW_COOKIE_NAME,
  createSessionToken,
  parseCookieValue,
  SESSION_COOKIE_NAME,
  verifySignedToken,
} from "@/lib/server/session";

type AuthFlowPayload = {
  state: string;
  returnTo: string;
  attempt: "silent" | "interactive";
  exp: number;
};

function buildSafeReturnTo(
  returnTo: string,
  request: Request,
  { clearAttempt = true }: { clearAttempt?: boolean } = {},
) {
  const appUrl = new URL(resolveAppUrl({ requestUrl: request.url, headers: request.headers }));
  const target = new URL(returnTo, appUrl);

  if (target.origin !== appUrl.origin) {
    return appUrl;
  }

  return clearAttempt ? clearAuthAttempt(target) : target;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const flowToken = parseCookieValue(request.headers.get("cookie"), AUTH_FLOW_COOKIE_NAME);
  const flow = flowToken ? verifySignedToken<AuthFlowPayload>(flowToken) : null;

  const fallbackReturnTo = buildSafeReturnTo(flow?.returnTo || "/", request, {
    clearAttempt: !flow?.attempt,
  });

  if (!flow || flow.exp * 1000 <= Date.now() || !state || flow.state !== state || error || !code) {
    const response = NextResponse.redirect(fallbackReturnTo);
    response.cookies.delete(AUTH_FLOW_COOKIE_NAME);
    return response;
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(code, { requestUrl: request.url, headers: request.headers });
    const user = await fetchCasdoorUserInfo(accessToken);
    const sessionToken = createSessionToken({
      id: user.sub,
      displayName: user.name || user.preferred_username || user.email || user.sub,
      loginName: user.preferred_username || user.email,
    });

    const response = NextResponse.redirect(buildSafeReturnTo(flow.returnTo, request));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: Number(process.env.AUTH_SESSION_MAX_AGE_SEC ?? 60 * 60 * 24 * 7),
    });
    response.cookies.delete(AUTH_FLOW_COOKIE_NAME);
    response.cookies.delete(SKIP_SILENT_LOGIN_COOKIE_NAME);
    return response;
  } catch {
    const response = NextResponse.redirect(fallbackReturnTo);
    response.cookies.delete(AUTH_FLOW_COOKIE_NAME);
    return response;
  }
}
