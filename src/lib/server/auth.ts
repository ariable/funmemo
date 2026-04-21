import { cookies, headers } from "next/headers";
import { resolveCurrentUser } from "@/lib/server/auth-shared";
import { getSessionUserFromHeaders, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/session";

export type { CurrentUser } from "@/lib/server/auth-shared";
export { resolveCurrentUser } from "@/lib/server/auth-shared";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionUser = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (sessionUser) {
    return sessionUser;
  }

  const requestHeaders = await headers();
  const sessionFromHeaders = getSessionUserFromHeaders(requestHeaders);
  if (sessionFromHeaders) {
    return sessionFromHeaders;
  }

  return resolveCurrentUser(requestHeaders);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("未登录，请通过统一登录入口访问。");
  }

  return user;
}

export function getCurrentUserFromRequestHeaders(reader: { get(name: string): string | null }) {
  const sessionUser = getSessionUserFromHeaders(reader);
  if (sessionUser) {
    return sessionUser;
  }

  return resolveCurrentUser(reader);
}
