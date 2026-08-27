// 城市资料包校验器的无网络回归测试。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateCityIntake } from "../scripts/validate-research-intake.mjs";

function validIntake() {
  return {
    schemaVersion: 1,
    isTemplate: false,
    batchId: "b1-hangzhou-2026-08-20",
    province: "浙江",
    city: "杭州",
    researchedAt: "2026-08-20",
    researcher: "CodeBuddy",
    sources: [
      {
        id: "src-hz-private-list",
        title: "杭州市民办初高中名单",
        url: "https://edu.example.gov.cn/private-schools",
        publisher: "杭州市教育局",
        sourceLevel: "A1_government",
        sourceType: "学校名单",
        publishedAt: "2026-06-01",
        accessedAt: "2026-08-20",
        accessState: "ok",
        note: "页面可正常访问",
      },
      {
        id: "src-hz-public-target",
        title: "杭州第二中学学校概况",
        url: "https://school.example.edu.cn/about",
        publisher: "杭州第二中学",
        sourceLevel: "A2_school_official",
        sourceType: "公办目标依据",
        publishedAt: null,
        accessedAt: "2026-08-20",
        accessState: "ok",
        note: "学校官方页面",
      },
    ],
    privateSchools: [
      {
        id: "school-hz-example",
        officialName: "杭州市示例民办高级中学",
        district: "西湖区",
        schoolStages: ["高中"],
        ownership: "民办",
        officialPoolEvidenceIds: ["src-hz-private-list"],
        aliasNames: [],
        activeState: "正常办学",
        note: "仅用于校验器单元测试",
      },
    ],
    publicTargets: [
      {
        id: "public-hz-no2",
        officialName: "杭州第二中学",
        district: "滨江区",
        schoolStages: ["高中"],
        targetTier: "核心",
        targetReason: "原交付文档的首批候选校，并由学校官方页面复核",
        evidenceIds: ["src-hz-public-target"],
        note: "",
      },
    ],
    coverageGaps: [],
    unresolvedAliases: [],
    notes: [],
  };
}

test("资料模板通过校验", async () => {
  const template = JSON.parse(await readFile("research/templates/city-intake.template.json", "utf8"));
  assert.deepEqual(validateCityIntake(template), []);
});

test("最小正式资料包通过校验", () => {
  assert.deepEqual(validateCityIntake(validIntake()), []);
});

test("城市与省份必须匹配", () => {
  const data = validIntake();
  data.province = "江苏";
  assert.ok(validateCityIntake(data).some((error) => error.includes("不匹配")));
});

test("民办学校必须引用政府学校名单", () => {
  const data = validIntake();
  data.privateSchools[0].officialPoolEvidenceIds = ["src-hz-public-target"];
  assert.ok(validateCityIntake(data).some((error) => error.includes("必须是政府学校名单")));
});

test("外键和 ID 重复会被拒绝", () => {
  const data = validIntake();
  data.sources.push({ ...data.sources[0] });
  data.publicTargets[0].evidenceIds = ["src-missing"];
  const errors = validateCityIntake(data);
  assert.ok(errors.some((error) => error.includes("重复值")));
  assert.ok(errors.some((error) => error.includes("不存在的来源")));
});

test("ID 格式必须使用固定前缀", () => {
  const data = validIntake();
  data.batchId = "B1 杭州";
  data.sources[0].id = "evidence-1";
  data.privateSchools[0].id = "private-1";
  data.publicTargets[0].id = "school-public-1";
  const errors = validateCityIntake(data);
  assert.ok(errors.some((error) => error.includes("batchId")));
  assert.ok(errors.some((error) => error.includes("src- 前缀")));
  assert.ok(errors.some((error) => error.includes("school- 前缀")));
  assert.ok(errors.some((error) => error.includes("public- 前缀")));
});

test("个人信息字段和值会被拒绝", () => {
  const data = validIntake();
  data.candidateName = "某候选人";
  data.notes = ["联系方式为 13812345678"];
  const errors = validateCityIntake(data);
  assert.ok(errors.some((error) => error.includes("个人信息字段")));
  assert.ok(errors.some((error) => error.includes("手机号码")));
});

test("正式资料包为空时必须登记覆盖缺口", () => {
  const data = validIntake();
  data.privateSchools = [];
  data.publicTargets = [];
  const errors = validateCityIntake(data);
  assert.ok(errors.some((error) => error.includes("private_school_pool")));
  assert.ok(errors.some((error) => error.includes("public_target_pool")));
});

test("第三方域名不得冒充官方来源", () => {
  const data = validIntake();
  data.sources[0].url = "https://www.sohu.com/example";
  assert.ok(validateCityIntake(data).some((error) => error.includes("不得标为官方来源")));
});

test("搜索摘要或超时页面不得标为已访问", () => {
  const data = validIntake();
  data.sources[0].note = "校园网 504，只通过搜索引擎索引确认";
  assert.ok(validateCityIntake(data).some((error) => error.includes("不能在正文未实际打开")));
});
