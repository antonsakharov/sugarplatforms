import { createRequire } from "node:module";

export interface StatementSync {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid?: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close(): void;
}

type DatabaseConstructor = new (filename: string) => DatabaseSync;

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as DatabaseConstructor;

// Node 20 compatibility shim for the subset of node:sqlite DatabaseSync used by
// Sugar Platform Diagnostic. better-sqlite3 exposes the same synchronous
// exec()/prepare().run|get|all() surface used by our repositories.
export const DatabaseSync = BetterSqlite3;
