// 阶段 A.1：导出一致性测试。
// 读取 npm run export:data 生成的 V2 JSON，断言实际序列化的岗位数与 metadata 一致，
// 且 48 个 V1 岗位 ID 全部存在。运行本测试前需先执行 npm run export:data。
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { cityDatasets, jobs, multiCityDataset } from "../app/recruitment-data.ts";
import { derivePositionStatus } from "../lib/recruitment-status.ts";

const V2_FILE = new URL("../outputs/十四城决策台_V2数据.json", import.meta.url);

test("serialized V2 positions match metadata.totalPositions", async () => {
  let raw;
  try {
    raw = await readFile(V2_FILE, "utf8");
  } catch {
    assert.fail("缺少 outputs/十四城决策台_V2数据.json，请先运行 npm run export:data");
  }
  const data = JSON.parse(raw);

  const cityPositions = data.cityDatasets.flatMap((dataset) => dataset.positions);
  const multiCityPositions = data.multiCity?.positions ?? [];
  const actual = cityPositions.length + multiCityPositions.length;

  assert.equal(
    actual,
    data.metadata.totalPositions,
    `metadata.totalPositions 为 ${data.metadata.totalPositions}，实际序列化 ${actual} 条`,
  );
  assert.equal(cityPositions.length, data.metadata.cityPositions);
  assert.equal(multiCityPositions.length, data.metadata.multiCityPositions);
});

test("all 48 V1 job ids exist in the serialized V2 output", async () => {
  const raw = await readFile(V2_FILE, "utf8");
  const data = JSON.parse(raw);

  const ids = [
    ...data.cityDatasets.flatMap((dataset) => dataset.positions.map((position) => position.id)),
    ...(data.multiCity?.positions ?? []).map((position) => position.id),
  ];
  assert.equal(new Set(ids).size, ids.length, "序列化后的岗位 ID 不唯一");

  const v1Ids = new Set(jobs.map((job) => job.id));
  assert.equal(v1Ids.size, 48, "V1 岗位 ID 应为 48 个且唯一");
  for (const id of v1Ids) {
    assert.ok(ids.includes(id), `V1 岗位 ${id} 未出现在 V2 导出中`);
  }
  assert.ok(ids.length > 48, "原生 V2 招聘岗位应与48个迁移岗位同时导出");
  assert.equal(ids.length, data.metadata.totalPositions);
  assert.equal(data.cityDatasets.length, 14);
  assert.equal(data.cityDatasets.some((dataset) => dataset.cityName === "上海"), false);
});

test("multi-city records are complete in the serialized output", async () => {
  const raw = await readFile(V2_FILE, "utf8");
  const data = JSON.parse(raw);
  const multiCity = data.multiCity;
  assert.ok(multiCity, "缺少 multiCity 数据体");
  assert.ok(Array.isArray(multiCity.schools) && multiCity.schools.length === multiCity.positions.length, "多城市机构记录不完整");
  assert.ok(Array.isArray(multiCity.batches) && multiCity.batches.length === multiCity.positions.length, "多城市批次记录不完整");
  assert.ok(Array.isArray(multiCity.evidence) && multiCity.evidence.length >= multiCity.positions.length, "多城市证据记录不完整");
  for (const position of multiCity.positions) {
    assert.equal(position.city, null, "教培多城市岗位 city 应为 null");
  }
});

test("serialized status statistics use the shared status function", async () => {
  const data = JSON.parse(await readFile(V2_FILE, "utf8"));
  const datasets = [...cityDatasets, multiCityDataset];
  const batchById = new Map(datasets.flatMap((dataset) => dataset.batches).map((batch) => [batch.id, batch]));
  const expected = Object.fromEntries(
    datasets.flatMap((dataset) => dataset.positions).reduce((counts, position) => {
      const status = derivePositionStatus(position, batchById.get(position.batchId), data.metadata.statusAsOf);
      counts.set(status, (counts.get(status) ?? 0) + 1);
      return counts;
    }, new Map()),
  );
  assert.deepEqual(data.metadata.statusCounts, expected);
  assert.equal(data.metadata.totalPositions, 80);
  assert.equal(data.metadata.totalFormalPoolSchools, 384);
});
