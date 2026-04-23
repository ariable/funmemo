import assert from "node:assert/strict";
import test from "node:test";
import { getAuthBannerState } from "../src/lib/auth-login.ts";

test("getAuthBannerState disables silent redirect after logout", () => {
  const state = getAuthBannerState({
    authAttempt: null,
    returnTo: "/",
    skipSilent: true,
  });

  assert.equal(state.title, "已退出");
  assert.equal(state.autoRedirectUrl, undefined);
  assert.equal(state.actionLabel, "重新登录");
  assert.match(state.actionUrl, /attempt=interactive/);
});
