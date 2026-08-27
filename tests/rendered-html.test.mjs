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
  assert.match(html, /<title>十四城中学教师招聘决策台<\/title>/);
  assert.match(html, /十四城中学教师招聘决策台/);
  assert.match(html, /当前机会/);
  assert.match(html, /民办学校/);
  assert.match(html, /公办招考/);
  assert.match(html, /录用结果/);
  assert.match(html, /覆盖与来源/);
  for (const city of ["广州", "深圳", "佛山", "珠海", "惠州", "东莞", "杭州", "宁波", "温州", "嘉兴", "绍兴", "南京", "苏州", "无锡"]) {
    assert.match(html, new RegExp(`<option>${city}<\\/option>`), `SSR 城市筛选缺少 ${city}`);
  }
  assert.doesNotMatch(html, /<option>上海<\/option>/);
  assert.match(html, /只看收藏/);
  for (const label of ["餐食", "授课语言", "教师资格", "经验", "选拔流程", "资格/匹配"]) assert.match(html, new RegExp(label));
  assert.match(html, /流程复杂度/);
  assert.match(html, /跟进状态/);
  assert.match(html, /准备笔试\/试讲/);
  assert.match(html, /我的资料/);
  assert.match(html, /备份/);
  assert.match(html, /恢复/);
  assert.match(html, /正式入池民办校/);
  assert.match(html, /公办关注目标/);
  assert.match(html, /匿名录用样本/);
  assert.match(html, /来源核验日期见岗位卡；截止状态按当前日期计算。/);
  assert.match(html, /https:\/\/guangdong-teacher-jobs-2027\.baymax1001\.chatgpt\.site\/social-preview\.png/);
  assert.doesNotMatch(html, /localhost:\d+\/social-preview\.png/);
  assert.match(html, /核验 <!-- -->2026-08-18/);
  assert.doesNotMatch(html, /Starter Project|Your site is taking shape/);
});

test("keeps source data identifiers unique", async () => {
  // 阶段 A 之后，V1 原始数据与类型迁移到 app/data/legacy.ts，recruitment-data.ts 仅作再导出。
  const source = await readFile(new URL("../app/data/legacy.ts", import.meta.url), "utf8");
  const ids = [...source.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(ids.length >= 25);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(source, /officialShenzhenPoolSource/);
  assert.match(source, /lastVerified:\s*"2026-08-14"/);
});
