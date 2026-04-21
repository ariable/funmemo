import assert from "node:assert/strict";
import test from "node:test";
import { buildLoginRedirectUrl, clearAuthAttempt, withAuthAttempt } from "../src/lib/server/auth-redirect.ts";

test("withAuthAttempt appends the auth attempt marker", () => {
  const url = withAuthAttempt(new URL("http://192.168.43.249:3210/jobs/123?foo=bar"), "silent");
  assert.equal(url.toString(), "http://192.168.43.249:3210/jobs/123?foo=bar&authAttempt=silent");
});

test("clearAuthAttempt removes the auth attempt marker", () => {
  const url = clearAuthAttempt(new URL("http://192.168.43.249:3210/?authAttempt=silent&foo=bar"));
  assert.equal(url.toString(), "http://192.168.43.249:3210/?foo=bar");
});

test("silent login redirect includes silentSignin and returnTo", () => {
  const loginUrl = buildLoginRedirectUrl({
    currentUrl: new URL("http://192.168.43.249:3210/settings"),
    loginUrl: "http://192.168.43.249:3210/api/auth/sign-in/casdoor",
    attempt: "silent",
  });

  assert.equal(loginUrl.searchParams.get("silentSignin"), "1");
  assert.equal(loginUrl.searchParams.get("attempt"), "silent");
  assert.equal(
    loginUrl.searchParams.get("returnTo"),
    "http://192.168.43.249:3210/settings?authAttempt=silent",
  );
});

test("interactive fallback removes silentSignin and marks returnTo", () => {
  const loginUrl = buildLoginRedirectUrl({
    currentUrl: new URL("http://192.168.43.249:3210/settings?authAttempt=silent"),
    loginUrl: "http://192.168.43.249:3210/api/auth/sign-in/casdoor",
    attempt: "interactive",
  });

  assert.equal(loginUrl.searchParams.get("silentSignin"), null);
  assert.equal(loginUrl.searchParams.get("attempt"), "interactive");
  assert.equal(
    loginUrl.searchParams.get("returnTo"),
    "http://192.168.43.249:3210/settings?authAttempt=interactive",
  );
});
