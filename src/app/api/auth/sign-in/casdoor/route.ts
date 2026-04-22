import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCasdoorCallbackUrl, getCasdoorConfig, getCasdoorDiscovery } from "@/lib/server/casdoor";
import { AUTH_FLOW_COOKIE_NAME, createSignedToken } from "@/lib/server/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const attempt = url.searchParams.get("attempt") === "interactive" ? "interactive" : "silent";
  const returnTo = url.searchParams.get("returnTo") || "/";
  const state = randomBytes(24).toString("base64url");
  const flowToken = createSignedToken({
    state,
    returnTo,
    attempt,
    exp: Math.floor(Date.now() / 1000) + 60 * 10,
  });

  const discovery = await getCasdoorDiscovery();
  const { clientId, scope } = getCasdoorConfig();
  const authorizeUrl = new URL(discovery.authorization_endpoint);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", getCasdoorCallbackUrl({ requestUrl: request.url, headers: request.headers }));
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(AUTH_FLOW_COOKIE_NAME, flowToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
