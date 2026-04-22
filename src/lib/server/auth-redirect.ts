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

export function buildLoginRedirectHref(input: {
  currentPath: string;
  loginUrl: string;
  attempt: AuthAttempt;
}) {
  const currentUrl = new URL(input.currentPath, "http://local");
  const loginUrl = new URL(input.loginUrl, "http://local");
  const returnToParam = process.env.AUTH_LOGIN_RETURN_TO_PARAM ?? "returnTo";
  const returnToUrl =
    input.attempt === "silent"
      ? withAuthAttempt(currentUrl, "silent")
      : withAuthAttempt(clearAuthAttempt(currentUrl), "interactive");
  const returnToHref = `${returnToUrl.pathname}${returnToUrl.search}${returnToUrl.hash}`;

  loginUrl.searchParams.set(returnToParam, returnToHref);
  loginUrl.searchParams.set("attempt", input.attempt);

  if (input.attempt === "silent") {
    loginUrl.searchParams.set("silentSignin", "1");
  } else {
    loginUrl.searchParams.delete("silentSignin");
  }

  if (/^https?:\/\//.test(input.loginUrl)) {
    return loginUrl.toString();
  }

  return `${loginUrl.pathname}${loginUrl.search}${loginUrl.hash}`;
}
