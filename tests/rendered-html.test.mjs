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
  assert.match(html, /广州 <!-- -->43<!-- --> 所民办普高检索记录/);
  assert.match(html, /东莞 <!-- -->29<!-- --> 所民办普高检索记录/);
  assert.match(html, /佛山 <!-- -->34<!-- --> 所民办普高检索记录/);
  assert.match(html, /惠州 <!-- -->19<!-- --> 所民办普高检索记录/);
  assert.match(html, /珠海 <!-- -->9<!-- --> 所民办普高检索记录/);
  assert.match(html, /只看收藏/);
  assert.match(html, /跟进状态/);
  assert.match(html, /备考参考/);
  assert.match(html, /时间线/);
  assert.match(html, /备份数据/);
  assert.match(html, /导入备份/);
  assert.match(html, /只看临近复查/);
  assert.match(html, /核验新旧/);
  assert.match(html, /2026年11月复查/);
  assert.match(html, /核验 <!-- -->2026-08-18/);
  assert.match(html, /review-badge/);
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
