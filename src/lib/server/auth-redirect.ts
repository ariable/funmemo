export type AuthAttempt = "silent" | "interactive";

export function withAuthAttempt(url: URL, attempt: AuthAttempt) {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set("authAttempt", attempt);
  return nextUrl;
}

export function clearAuthAttempt(url: URL) {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.delete("authAttempt");
  return nextUrl;
}

export function buildLoginRedirectUrl(input: {
  currentUrl: URL;
  loginUrl: string;
  attempt: AuthAttempt;
}) {
  const loginUrl = new URL(input.loginUrl);
  const returnToParam = process.env.AUTH_LOGIN_RETURN_TO_PARAM ?? "returnTo";
  const returnToUrl =
    input.attempt === "silent"
      ? withAuthAttempt(input.currentUrl, "silent")
      : withAuthAttempt(clearAuthAttempt(input.currentUrl), "interactive");

  loginUrl.searchParams.set(returnToParam, returnToUrl.toString());
  loginUrl.searchParams.set("attempt", input.attempt);

  if (input.attempt === "silent") {
    loginUrl.searchParams.set("silentSignin", "1");
  } else {
    loginUrl.searchParams.delete("silentSignin");
  }

  return loginUrl;
}
