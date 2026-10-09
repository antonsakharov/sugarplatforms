import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const cssPath = new URL("../app/assessment/[id]/report/report-print.css", import.meta.url);
const layoutPath = new URL("../app/assessment/[id]/report/layout.tsx", import.meta.url);

test("report route imports a dedicated presentation stylesheet", async () => {
  const layout = await readFile(layoutPath, "utf8");
  assert.match(layout, /import "\.\/report-print\.css"/);
  assert.match(layout, /className="report-route"/);
});

test("print stylesheet defines formal page geometry and print-only controls", async () => {
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /@media print/);
  assert.match(css, /@page\{size:A4;margin:/);
  assert.match(css, /\.site-header,\.site-footer,\.report-route \.form-actions\{display:none!important\}/);
  assert.match(css, /details:not\(\[open\]\)>:not\(summary\)\{display:block!important\}/);
  assert.match(css, /break-inside:avoid-page/);
});

test("print stylesheet keeps report presentation evidence-neutral", async () => {
  const css = await readFile(cssPath, "utf8");
  assert.doesNotMatch(css, /localStorage|fetch\(|OPENAI_API_KEY|artifact content/i);
});
