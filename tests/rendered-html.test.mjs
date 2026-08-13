import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the recruitment decision site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>广东民办中学 2027 秋招决策台<\/title>/);
  assert.match(html, /广东民办中学/);
  assert.match(html, /秋招决策台/);
  assert.match(html, /深圳 49 所官方民办普高检索记录/);
  assert.doesNotMatch(html, /Starter Project|Your site is taking shape/);
});

test("keeps source data identifiers unique", async () => {
  const source = await readFile(new URL("../app/recruitment-data.ts", import.meta.url), "utf8");
  const ids = [...source.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(ids.length >= 25);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(source, /officialShenzhenPoolSource/);
  assert.match(source, /lastVerified:\s*"2026-08-14"/);
});
