import assert from "node:assert/strict";
import test from "node:test";
import { jobs, shenzhenCoverage } from "../app/recruitment-data.ts";

const verifiedDate = new Date("2026-08-14T23:59:59+08:00");

test("covers the complete Shenzhen official pool", () => {
  assert.equal(shenzhenCoverage.length, 49);
  assert.equal(new Set(shenzhenCoverage.map((item) => item.name)).size, 49);
});

test("validates job identifiers, salaries, dates and sources", () => {
  assert.equal(new Set(jobs.map((job) => job.id)).size, jobs.length);

  for (const job of jobs) {
    assert.ok(job.sources.length > 0, `${job.id} 缺少来源`);
    assert.ok(job.sources.every((source) => /^https?:\/\//.test(source.url)), `${job.id} 来源链接无效`);
    if (job.salaryMin != null && job.salaryMax != null) {
      assert.ok(job.salaryMin <= job.salaryMax, `${job.id} 薪资上下限倒置`);
    }
    if (job.status === "27届开放" && job.deadline) {
      assert.ok(new Date(`${job.deadline}T23:59:59+08:00`) >= verifiedDate, `${job.id} 已过期但仍标开放`);
    }
    for (const stage of job.stages) {
      assert.ok(stage.certainty, `${job.id} 流程缺少公开程度`);
    }
  }
});
