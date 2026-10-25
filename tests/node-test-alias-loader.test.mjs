import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "../scripts/node-test-alias-loader.mjs";

const next = async (specifier) => ({ url: specifier });

test("test-only alias maps a known local library module to a file URL", async () => {
  const result = await resolve("@/lib/config", {}, next);
  assert.match(result.url, /\/lib\/config\.ts$/);
});

test("test-only alias rejects traversal, arbitrary paths and missing modules", async () => {
  for (const specifier of ["@/../secrets", "@/lib/../config", "@/app/page", "@/lib/not-a-module"]) {
    await assert.rejects(() => resolve(specifier, {}, next));
  }
});

test("test-only alias leaves normal package and Node built-in resolution unchanged", async () => {
  assert.deepEqual(await resolve("node:fs", {}, next), { url: "node:fs" });
  assert.deepEqual(await resolve("better-sqlite3", {}, next), { url: "better-sqlite3" });
});


test("test-only loader resolves extensionless relative imports only inside lib", async () => {
  const parentURL = new URL("../lib/client-reviewed-state.ts", import.meta.url).href;
  const result = await resolve("./base-path", { parentURL }, next);
  assert.match(result.url, /\/lib\/base-path\.ts$/);
  await assert.rejects(() => resolve("../../outside", { parentURL }, next));
  const unrelated = await resolve("./somewhere", { parentURL: import.meta.url }, next);
  assert.deepEqual(unrelated, { url: "./somewhere" });
});
