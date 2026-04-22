import assert from "node:assert/strict";
import test from "node:test";
import { getCasdoorCallbackUrl, resolveAppUrl } from "../src/lib/server/casdoor.ts";

test("resolveAppUrl prefers request URL over APP_URL", () => {
  process.env.APP_URL = "http://should-not-be-used:3000";

  assert.equal(
    resolveAppUrl({ requestUrl: "http://192.168.43.249:3211/jobs/123" }),
    "http://192.168.43.249:3211",
  );
});

test("getCasdoorCallbackUrl derives callback from current request", () => {
  assert.equal(
    getCasdoorCallbackUrl({ requestUrl: "http://192.168.43.249:3211/api/auth/sign-in/casdoor" }),
    "http://192.168.43.249:3211/api/auth/callback/casdoor",
  );
});
