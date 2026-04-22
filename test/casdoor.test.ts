import assert from "node:assert/strict";
import test from "node:test";
import { getCasdoorCallbackUrl, resolveAppUrl } from "../src/lib/server/casdoor.ts";

test("resolveAppUrl prefers APP_URL over request URL", () => {
  process.env.APP_URL = "http://192.168.43.249:3210";

  assert.equal(
    resolveAppUrl({ requestUrl: "http://192.168.43.249:3211/jobs/123" }),
    "http://192.168.43.249:3210",
  );
});

test("resolveAppUrl falls back to request URL when APP_URL is missing", () => {
  delete process.env.APP_URL;

  assert.equal(
    resolveAppUrl({ requestUrl: "http://192.168.43.249:3211/jobs/123" }),
    "http://192.168.43.249:3211",
  );
});

test("getCasdoorCallbackUrl derives callback from APP_URL", () => {
  process.env.APP_URL = "http://192.168.43.249:3210";

  assert.equal(
    getCasdoorCallbackUrl({ requestUrl: "http://192.168.43.249:3211/api/auth/sign-in/casdoor" }),
    "http://192.168.43.249:3210/api/auth/callback/casdoor",
  );
});
