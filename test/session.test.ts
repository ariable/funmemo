import assert from "node:assert/strict";
import test from "node:test";
import { createSessionToken, parseCookieValue, readSessionToken } from "../src/lib/server/session.ts";

process.env.AUTH_SECRET ??= "test-secret-for-session-signing";

test("session token round-trips user identity", () => {
  const token = createSessionToken({
    id: "user_123",
    displayName: "王小明",
    loginName: "wangxm@example.com",
  });

  assert.deepEqual(readSessionToken(token), {
    id: "user_123",
    displayName: "王小明",
    loginName: "wangxm@example.com",
  });
});

test("parseCookieValue returns the matching cookie", () => {
  const cookieHeader = "foo=bar; funmemo_session=session-token; theme=dark";
  assert.equal(parseCookieValue(cookieHeader, "funmemo_session"), "session-token");
});
