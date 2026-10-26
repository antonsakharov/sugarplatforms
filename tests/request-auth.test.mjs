import test from "node:test";
import assert from "node:assert/strict";
import { extractAccessToken } from "../lib/server-auth.ts";
import { AuthenticationRequiredError } from "../lib/auth.ts";

test("request auth prefers bearer token", () => {
  const request = new Request("http://localhost", { headers: { authorization: `Bearer ${"a".repeat(32)}`, cookie: `sugar-access-token=${"b".repeat(32)}` } });
  assert.equal(extractAccessToken(request), "a".repeat(32));
});

test("request auth accepts configured HttpOnly-cookie envelope", () => {
  const token = "header.payload.signature-123456789";
  const request = new Request("http://localhost", { headers: { cookie: `other=x; sugar-access-token=${encodeURIComponent(token)}` } });
  assert.equal(extractAccessToken(request), token);
});

test("request auth fails closed without a session token", () => {
  assert.throws(() => extractAccessToken(new Request("http://localhost")), AuthenticationRequiredError);
});
