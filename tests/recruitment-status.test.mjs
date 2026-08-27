// 招聘状态、工作负担和 DSH 批次准入的语义回归测试。
import assert from "node:assert/strict";
import test from "node:test";
import { cityDatasets } from "../app/recruitment-data.ts";
import { applyDshScanIncrements, isApprovedDshScanBatchId } from "../app/data/scan-adapter.ts";
import { inferWorkloadFromText } from "../lib/recruitment-normalizers.ts";
import { deriveRecruitmentStatus, todayInUtc8 } from "../lib/recruitment-status.ts";

function batch(overrides = {}) {
  return {
    id: "batch-test",
    employerName: "测试学校",
    schoolIds: [],
    title: "测试岗位",
    recruitmentCycle: "2027届",
    statusBasis: "current_2027",
    accepts2027: "yes",
    employmentType: "未明确",
    applicationMethod: "web",
    evidenceIds: [],
    lastVerified: "2026-08-21",
    ...overrides,
  };
}

test("deadline status is closed after the date and open on the deadline", () => {
  const item = batch({ deadline: "2026-09-03" });
  assert.equal(deriveRecruitmentStatus(item, "2026-09-03"), "27届开放");
  assert.equal(deriveRecruitmentStatus(item, "2026-09-04"), "已截止");
});

test("deadline year alone does not turn an evergreen batch into a 2027 cohort", () => {
  const item = batch({
    recruitmentCycle: "长期招聘，截止2027-01-01",
    statusBasis: "evergreen",
    accepts2027: "possible",
    deadline: "2027-01-01",
  });
  assert.equal(deriveRecruitmentStatus(item, "2026-08-27"), "常年储备");
});

test("a 2026 reference stays in the reference queue", () => {
  const item = batch({ statusBasis: "reference_2026", accepts2027: "no", deadline: "2026-05-25" });
  assert.equal(deriveRecruitmentStatus(item, "2026-08-27"), "26届参考");
});

test("UTC+8 date conversion is deterministic around midnight", () => {
  assert.equal(todayInUtc8(new Date("2026-08-26T16:30:00.000Z")), "2026-08-27");
});

test("weekend rest and homeroom compensation do not create duties", () => {
  const workload = inferWorkloadFromText(["周末双休", "班主任津贴", "班主任经验优先"]);
  assert.equal(workload.weekendDuty, "no");
  assert.equal(workload.homeroomTeacher, "未公开");
});

test("only explicit workload duties become positive", () => {
  const workload = inferWorkloadFromText(["承担周末值班", "承担班主任职责", "宿舍夜间值班"]);
  assert.equal(workload.weekendDuty, "yes");
  assert.equal(workload.homeroomTeacher, "必须");
  assert.equal(workload.residentialDuty, "yes");
});

test("only the eight reviewed DSH batches are approved", () => {
  assert.equal(isApprovedDshScanBatchId("ningbo-dsh-b1"), true);
  assert.equal(isApprovedDshScanBatchId("future-dsh-b2"), false);
  const datasets = [{ cityName: "宁波" }];
  const result = applyDshScanIncrements(datasets, [{ city: "宁波", scan: { batchId: "future-dsh-b2" } }]);
  assert.deepEqual(result, datasets);
});

test("reviewed scan corrections reach the formal data", () => {
  const allBatches = cityDatasets.flatMap((dataset) => dataset.batches);
  const allPositions = cityDatasets.flatMap((dataset) => dataset.positions);
  const techBatch = allBatches.find((item) => item.title === "高中政治教师——宁波市科技高级中学");
  const deyuanBatch = allBatches.find((item) => item.title.includes("德元新融学校2026年师资招聘"));
  const weekendPositions = allPositions.filter((item) => item.workload.evidenceIds.length > 0 && item.workload.weekendDuty === "no");
  assert.equal(techBatch?.statusBasis, "evergreen");
  assert.equal(techBatch?.accepts2027, "possible");
  assert.equal(deyuanBatch?.statusBasis, "reference_2026");
  assert.equal(deyuanBatch?.deadline, "2026-05-25");
  assert.ok(weekendPositions.length >= 2);
});

test("scan-derived fields never claim direct field evidence", () => {
  const scanned = cityDatasets.flatMap((dataset) => dataset.positions).filter((item) => item.id.includes("-dsh-"));
  assert.ok(scanned.length > 0);
  for (const position of scanned) {
    assert.notEqual(position.salaryEvidenceScope, "field_exact");
    assert.notEqual(position.housing.evidenceScope, "field_exact");
    assert.notEqual(position.meals.evidenceScope, "field_exact");
    assert.notEqual(position.workload.evidenceScope, "field_exact");
    assert.ok(position.requirements.every((requirement) => requirement.evidenceScope !== "field_exact"));
  }
});
