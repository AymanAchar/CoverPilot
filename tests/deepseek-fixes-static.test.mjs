import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("workspace persistence uses localStorage instead of sessionStorage", async () => {
  const source = await read("src/lib/workspace-session.ts");

  assert.match(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
});

test("case review exposes the one-click demo, interactive ask, live claim warning, and automatic meeting pack handoff", async () => {
  const source = await read("src/app/case-review/page.tsx");

  assert.match(source, /Start seeded demo/i);
  assert.match(source, /askAnswer/);
  assert.match(source, /claimWarning/);
  assert.match(source, /generateReport\(nextComparisons, nextCalculations\)/);
});
