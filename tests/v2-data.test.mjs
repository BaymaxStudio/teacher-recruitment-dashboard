// V2 数据层完整性：十四城、V1 无损迁移、原生公办岗位与匿名录用结果。
// 覆盖：十四城无上海、48 个 V1 岗位无丢失、顺德归属、覆盖数、结构化字段、
// 覆盖状态不得无证据升级为 27 届、食宿语义、硬性条件硬度、学校别名归并、
// 外键完整性与各类 ID 唯一性。
import assert from "node:assert/strict";
import test from "node:test";
import {
  jobs,
  cityDatasets,
  multiCityDataset,
  allPositions,
  multiCityPositions,
  computeFitScore,
  computePrivateFit,
  evaluatePublicEligibility,
} from "../app/recruitment-data.ts";

const EXPECTED_COVERAGE = { 深圳: 49, 广州: 43, 东莞: 29, 佛山: 34, 惠州: 19, 珠海: 9 };
const ALLOWED_CITIES = new Set(["广州", "深圳", "佛山", "珠海", "惠州", "东莞", "杭州", "宁波", "温州", "嘉兴", "绍兴", "南京", "苏州", "无锡"]);
const FREE_HOUSING_PROVISIONS = new Set(["免费单间", "免费合住", "免费（房型未公开）"]);
const FREE_MEAL_PROVISIONS = new Set(["免费三餐", "免费工作餐", "免费（餐次未公开）"]);
const ALL_DATASETS = [...cityDatasets, multiCityDataset];
const legacyPositions = allPositions.filter((position) => position.legacy);

test("exposes exactly fourteen city datasets without Shanghai", () => {
  assert.equal(cityDatasets.length, 14);
  const names = cityDatasets.map((dataset) => dataset.cityName);
  for (const name of names) {
    assert.ok(ALLOWED_CITIES.has(name), `出现非预期城市：${name}`);
    assert.notEqual(name, "上海");
  }
  assert.deepEqual(new Set(names), ALLOWED_CITIES);
});

test("migrates all legacy positions without loss", () => {
  assert.equal(legacyPositions.length, jobs.length, "V2 中的 V1 迁移岗位数不一致，存在静默丢失");
  assert.ok(jobs.length >= 48, `岗位数 ${jobs.length} 少于基线 48`);
  const ids = allPositions.map((position) => position.id);
  assert.equal(new Set(ids).size, ids.length, "V2 岗位 ID 不唯一");
  const migratedIds = new Set(legacyPositions.map((position) => position.id));
  const v1Ids = new Set(jobs.map((job) => job.id));
  for (const id of v1Ids) assert.ok(migratedIds.has(id), `V1 岗位 ID ${id} 未迁移`);
  assert.ok(allPositions.length > jobs.length, "原生 V2 公办岗位未接入统一加载器");
});

test("preserves 顺德 as a Foshan district, not a standalone city", () => {
  const foshan = cityDatasets.find((dataset) => dataset.cityName === "佛山");
  assert.ok(foshan, "缺少佛山数据集");
  const shundePositions = foshan.positions.filter((position) => position.district === "顺德");
  assert.ok(shundePositions.length > 0, "佛山数据集缺少顺德区岗位");
  for (const position of shundePositions) {
    assert.equal(position.city, "佛山", "顺德岗位的城市应为佛山");
  }
});

test("keeps coverage school counts per city", () => {
  for (const [city, expected] of Object.entries(EXPECTED_COVERAGE)) {
    const dataset = cityDatasets.find((d) => d.cityName === city);
    assert.ok(dataset, `缺少 ${city} 数据集`);
    const migratedCoverage = dataset.coverage.filter((record) => record.recordOrigin === "v1_migration");
    assert.equal(migratedCoverage.length, expected, `${city} V1 迁移覆盖学校数不符`);
  }
  const migratedTotal = cityDatasets.reduce(
    (sum, dataset) => sum + dataset.coverage.filter((record) => record.recordOrigin === "v1_migration").length,
    0,
  );
  const formalTotal = cityDatasets.reduce((sum, dataset) => sum + dataset.coverage.length, 0);
  assert.equal(migratedTotal, 183, "广东六城 V1 覆盖基线应保持183所");
  assert.ok(formalTotal > migratedTotal, "十四城正式学校池应在广东六城183所基线上增加学校");
});

test("Guangdong official private high-school pools carry stage evidence and an explicit junior-school gap", () => {
  for (const city of Object.keys(EXPECTED_COVERAGE)) {
    const dataset = cityDatasets.find((item) => item.cityName === city);
    assert.ok(dataset);
    const evidenceIds = new Set(dataset.evidence.filter((item) => item.sourceLevel === "A1_government").map((item) => item.id));
    for (const record of dataset.coverage.filter((item) => item.recordOrigin === "v1_migration")) {
      const school = dataset.schools.find((item) => item.id === record.schoolId);
      assert.ok(school?.schoolStages.includes("高中"), `${city} ${school?.officialName} 未保留民办普高学段事实`);
      assert.ok(school?.fieldEvidence?.schoolStages?.some((id) => evidenceIds.has(id)), `${city} ${school?.officialName} 学段缺少 A1 字段证据`);
    }
    assert.ok(dataset.coverageGaps?.some((gap) => gap.scope === "private_school_pool" && /民办初中/.test(gap.description)), `${city} 未登记民办初中完整池缺口`);
  }
});

test("every city keeps explicit public-target and outcome gaps when data is absent", () => {
  for (const dataset of cityDatasets) {
    if (!dataset.schools.some((school) => school.ownership === "公办")) {
      assert.ok(dataset.coverageGaps?.some((gap) => gap.scope === "public_target_pool"), `${dataset.cityName} 缺少公办目标池缺口`);
    }
    if (dataset.outcomes.length === 0) {
      assert.ok(dataset.coverageGaps?.some((gap) => gap.scope === "outcomes"), `${dataset.cityName} 缺少录用结果缺口`);
    }
    if (dataset.coverage.some((record) => record.currentOutcome === "待检索")) {
      assert.ok(dataset.coverageGaps?.some((gap) => gap.scope === "recruitment"), `${dataset.cityName} 缺少逐校招聘检索缺口`);
    }
  }
});

test("adds evidence-backed public target pools for the five recovered Guangdong cities", () => {
  const expected = { 广州: 7, 深圳: 7, 佛山: 5, 惠州: 5, 东莞: 5 };
  for (const [city, count] of Object.entries(expected)) {
    const dataset = cityDatasets.find((item) => item.cityName === city);
    assert.ok(dataset);
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    const publicSchools = dataset.schools.filter((item) => item.ownership === "公办");
    assert.equal(publicSchools.length, count, `${city} 公办目标池数量异常`);
    for (const school of publicSchools) {
      assert.ok(school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government"), `${city} ${school.officialName} 缺少 A1 入池依据`);
    }
  }
});

test("integrates the recovered Ningbo, Jiaxing and Shaoxing public target evidence", () => {
  const expected = { 宁波: 5, 嘉兴: 4, 绍兴: 7 };
  for (const [city, count] of Object.entries(expected)) {
    const dataset = cityDatasets.find((item) => item.cityName === city);
    assert.ok(dataset);
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    const publicSchools = dataset.schools.filter((item) => item.ownership === "公办");
    assert.equal(publicSchools.length, count, `${city} 公办目标池数量异常`);
    for (const school of publicSchools) {
      assert.ok(
        school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government"),
        `${city} ${school.officialName} 缺少 A1 入池依据`,
      );
    }
  }

  const jiaxing = cityDatasets.find((item) => item.cityName === "嘉兴");
  const pinghu = jiaxing?.positions.find((item) => item.id === "pos-jiaxing-pinghu-2025-politics");
  assert.ok(pinghu, "平湖中学2025届高中政治参考岗未接入统一加载器");
  assert.equal(pinghu.legacy, undefined, "原生 V2 岗位不应制造 legacy 字段");
  assert.ok(pinghu.selectionStages.some((stage) => stage.name === "试讲" && stage.certainty === "confirmed"));
  assert.ok(pinghu.selectionStages.some((stage) => stage.name === "结构化面试" && stage.certainty === "confirmed"));
});

test("restores Wuxi private junior and high schools from the official 2025 directories", () => {
  const wuxi = cityDatasets.find((item) => item.cityName === "无锡");
  assert.ok(wuxi);
  const evidenceById = new Map(wuxi.evidence.map((item) => [item.id, item]));
  const privateSchools = wuxi.schools.filter((item) => item.ownership === "民办");
  assert.equal(privateSchools.length, 30);
  assert.ok(privateSchools.some((item) => item.schoolStages.includes("初中")));
  assert.ok(privateSchools.some((item) => item.schoolStages.includes("高中")));
  for (const school of privateSchools) {
    assert.ok(
      school.officialPoolEvidenceIds.every((id) => evidenceById.get(id)?.sourceLevel === "A1_government"),
      `${school.officialName} 的无锡正式池来源不是 A1`,
    );
    assert.ok(wuxi.coverage.some((record) => record.schoolId === school.id), `${school.officialName} 缺少招聘检索记录`);
  }
  const mergedAlias = privateSchools.find((item) => item.id === "private-wx-jiangyin-linkang");
  assert.deepEqual(mergedAlias?.aliasNames, ["江阴临港新城科创实验学校"]);
});

test("keeps the Ningbo urban private-high-school recovery partial and district-safe", () => {
  const ningbo = cityDatasets.find((item) => item.cityName === "宁波");
  assert.ok(ningbo);
  const privateSchools = ningbo.schools.filter((item) => item.ownership === "民办");
  assert.equal(privateSchools.length, 12);
  assert.ok(privateSchools.every((item) => item.schoolStages.length === 1 && item.schoolStages[0] === "高中"));
  const districtUnknown = privateSchools.filter((item) => item.district === "待确认");
  assert.equal(districtUnknown.length, 10);
  assert.ok(districtUnknown.every((item) => (item.fieldEvidence?.district ?? []).length === 0));
  assert.ok(
    ningbo.coverageGaps?.some((gap) => gap.scope === "private_school_pool" && /不完整|仍未完整/.test(gap.description)),
    "宁波城区局部名单不得写成全市完整池",
  );
});

test("structures housing, meals, workload and selection for every position", () => {
  for (const position of allPositions) {
    assert.ok(position.housing && typeof position.housing.provision === "string", `${position.id} 缺少结构化住宿`);
    assert.ok(position.meals && typeof position.meals.provision === "string", `${position.id} 缺少结构化餐食`);
    assert.ok(position.workload && typeof position.workload.officeHours === "string", `${position.id} 缺少结构化工作量`);
    assert.ok(Array.isArray(position.selectionStages) && position.selectionStages.length > 0, `${position.id} 缺少选拔环节`);
    assert.ok(Array.isArray(position.requirements) && position.requirements.length > 0, `${position.id} 缺少硬性条件`);
    if (position.legacy) assert.equal(typeof position.legacyFitScore, "number", `${position.id} 缺少静态匹配分`);
    assert.ok(["field_exact", "position_general", "unverified"].includes(position.salaryEvidenceScope), `${position.id} 薪资证据范围异常`);
    assert.ok(["field_exact", "position_general", "unverified"].includes(position.housing.evidenceScope), `${position.id} 住宿证据范围异常`);
    assert.ok(["field_exact", "position_general", "unverified"].includes(position.meals.evidenceScope), `${position.id} 餐食证据范围异常`);
    assert.ok(["field_exact", "position_general", "unverified"].includes(position.workload.evidenceScope), `${position.id} 工作量证据范围异常`);
    for (const rule of position.requirements) {
      assert.ok(["field_exact", "position_general", "unverified"].includes(rule.evidenceScope), `${position.id} 要求证据范围异常`);
    }
  }
});

test("ordinary official homepages are not mislabeled as recruitment pages", () => {
  const evidence = ALL_DATASETS.flatMap((dataset) => dataset.evidence);
  const ordinaryHomepages = evidence.filter(
    (item) => item.sourceLevel === "A2_school_official" && /官网|主页/.test(item.title) && !/招聘|人才/.test(item.title),
  );
  assert.ok(ordinaryHomepages.length > 0, "测试数据应包含普通官网来源");
  for (const item of ordinaryHomepages) assert.equal(item.sourceType, "学校主页");
});

// ---------------------------------------------------------------------------
// 修正二：覆盖状态不得无 27 届证据升级。
// ---------------------------------------------------------------------------
test("never marks coverage as 发现27届岗位 without a linked 27届开放 position", () => {
  let upgraded = 0;
  for (const dataset of cityDatasets) {
    const positionById = new Map(dataset.positions.map((position) => [position.id, position]));
    for (const record of dataset.coverage) {
      if (record.currentOutcome !== "发现27届岗位") continue;
      upgraded += 1;
      assert.ok(
        record.relevantPositionIds.length > 0,
        `${dataset.cityName} 覆盖记录 ${record.schoolId} 标记为发现27届岗位但没有关联岗位`,
      );
      const has27 = record.relevantPositionIds.some((id) => positionById.get(id)?.legacy?.status === "27届开放");
      assert.ok(has27, `${dataset.cityName} 覆盖记录 ${record.schoolId} 无 27届开放 岗位却被标记为发现27届岗位`);
    }
  }
  // V1 数据中仅 2 条 27届开放 岗位（新东方/卓越教育，均非覆盖池学校），覆盖记录不得出现该状态。
  assert.equal(upgraded, 0, "覆盖记录出现无证据的 27 届状态");
});

test("maps legacy coverage outcomes conservatively", () => {
  for (const dataset of cityDatasets) {
    const positionById = new Map(dataset.positions.map((position) => [position.id, position]));
    for (const record of dataset.coverage) {
      const statuses = record.relevantPositionIds
        .map((id) => positionById.get(id)?.legacy?.status)
        .filter((status) => typeof status === "string");
      if (record.legacyOutcomeLabel === "本轮未发现相关岗位" && statuses.length === 0) {
        assert.equal(record.currentOutcome, "待检索");
      }
      if (record.legacyOutcomeLabel === "发现教师入口" && statuses.length === 0) {
        assert.equal(record.currentOutcome, "旧线索待复核");
      }
      if (record.legacyOutcomeLabel === "发现相关岗位" && statuses.length === 0) {
        assert.equal(record.currentOutcome, "旧线索待复核", "没有可追溯招聘来源的旧线索不得显示为已发现");
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 修正四：食宿语义。
// ---------------------------------------------------------------------------
test("free meals never imply free housing", () => {
  const cases = legacyPositions.filter((position) => {
    const text = position.legacy.benefits.join(" ");
    return /免费餐食|免费餐/.test(text) && !/免费食宿|免费住宿|免费教师公寓/.test(text);
  });
  assert.ok(cases.length > 0, "测试数据中缺少“免费餐食”样本");
  for (const position of cases) {
    assert.ok(
      !FREE_HOUSING_PROVISIONS.has(position.housing.provision),
      `${position.id} 由免费餐食误推出免费住宿：${position.housing.provision}`,
    );
    assert.ok(FREE_MEAL_PROVISIONS.has(position.meals.provision), `${position.id} 免费餐食未映射为免费餐食`);
    assert.ok(position.meals.evidenceId, `${position.id} 免费餐食结论缺少 evidenceId`);
  }
});

test("provided-but-unpaid housing keeps an independent state", () => {
  const cases = legacyPositions.filter((position) => {
    const text = position.legacy.benefits.join(" ");
    return /提供食宿|提供住宿|校方住宿|包住宿/.test(text) && !/免费/.test(text);
  });
  assert.ok(cases.length > 0, "测试数据中缺少“提供食宿/提供住宿”样本");
  for (const position of cases) {
    const text = position.legacy.benefits.join(" ");
    if (/住房补贴|住房津贴/.test(text)) {
      // 同时写明住房补贴/津贴：保留更具体的补贴结论，原文完整保留在 note。
      assert.equal(position.housing.provision, "住房补贴", `${position.id} 应保留住房补贴结论`);
    } else {
      assert.equal(
        position.housing.provision,
        "提供（费用未公开）",
        `${position.id} 提供住宿但费用未知应保留独立状态，实际为 ${position.housing.provision}`,
      );
    }
  }
});

test("housing subsidy stays a subsidy even alongside free meals", () => {
  const cases = legacyPositions.filter((position) => {
    const text = position.legacy.benefits.join(" ");
    return /住房补贴|住房津贴/.test(text) && !/人才公寓\s*(?:或|\/|、)\s*住房(?:补贴|津贴)/.test(text);
  });
  assert.ok(cases.length > 0, "测试数据中缺少“住房补贴”样本");
  for (const position of cases) {
    assert.equal(position.housing.provision, "住房补贴", `${position.id} 住房补贴应保留为住房补贴`);
    assert.ok(position.housing.evidenceId, `${position.id} 住房补贴结论缺少 evidenceId`);
  }
});

test("免费食宿 yields both free housing and free meals with unknown details", () => {
  const cases = legacyPositions.filter((position) => /免费食宿/.test(position.legacy.benefits.join(" ")));
  assert.ok(cases.length > 0, "测试数据中缺少“免费食宿”样本");
  for (const position of cases) {
    assert.equal(position.housing.provision, "免费（房型未公开）");
    assert.equal(position.meals.provision, "免费（餐次未公开）");
    assert.ok(position.housing.evidenceId, `${position.id} 免费住宿结论缺少 evidenceId`);
    assert.ok(position.meals.evidenceId, `${position.id} 免费餐食结论缺少 evidenceId`);
  }
});

test("alternative talent-apartment and subsidy wording stays alternative", () => {
  for (const position of legacyPositions) {
    if (/人才公寓\s*(?:或|\/|、)\s*住房(?:补贴|津贴)/.test(position.legacy.benefits.join(" "))) {
      assert.equal(position.housing.provision, "人才公寓或住房补贴", `${position.id} 不得擅自确定住宿方案`);
      assert.ok(position.housing.evidenceId, `${position.id} 备选住宿结论缺少 evidenceId`);
    }
  }
});

test("provided-but-unpaid meals keep an independent state", () => {
  const cases = legacyPositions.filter((position) => {
    const text = position.legacy.benefits.join(" ");
    return (/提供食宿|工作餐|工作日餐食|提供餐食|包餐|提供伙食/.test(text)) && !/免费/.test(text);
  });
  assert.ok(cases.length > 0, "测试数据中缺少“工作餐/工作日餐食”样本");
  for (const position of cases) {
    assert.equal(
      position.meals.provision,
      "提供餐食（费用未公开）",
      `${position.id} 提供餐食但费用未知应保留独立状态，实际为 ${position.meals.provision}`,
    );
    assert.ok(!FREE_MEAL_PROVISIONS.has(position.meals.provision));
  }
});

test("free-housing and subsidy conclusions always resolve to real evidence", () => {
  const HOUSING_CONCLUSIONS = new Set(["免费单间", "免费合住", "免费（房型未公开）", "住房补贴", "人才公寓", "人才公寓或住房补贴"]);
  for (const dataset of ALL_DATASETS) {
    const evidenceIds = new Set(dataset.evidence.map((item) => item.id));
    for (const position of dataset.positions) {
      if (HOUSING_CONCLUSIONS.has(position.housing.provision)) {
        assert.ok(position.housing.evidenceId, `${position.id} ${position.housing.provision} 缺少 evidenceId`);
        assert.ok(evidenceIds.has(position.housing.evidenceId), `${position.id} 住宿 evidenceId 未落在数据集证据内`);
      }
      if (FREE_MEAL_PROVISIONS.has(position.meals.provision)) {
        assert.ok(position.meals.evidenceId, `${position.id} ${position.meals.provision} 缺少 evidenceId`);
        assert.ok(evidenceIds.has(position.meals.evidenceId), `${position.id} 餐食 evidenceId 未落在数据集证据内`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 修正五：硬性条件硬度。
// ---------------------------------------------------------------------------
test("unknown requirement texts are never marked hard", () => {
  const forbidden = /未公开|待确认|按岗位审核|未写死|可能接受|平台标注.*描述要求/;
  for (const position of allPositions) {
    for (const rule of position.requirements) {
      if (forbidden.test(rule.text)) {
        assert.notEqual(
          rule.hardness,
          "hard",
          `${position.id} 字段 ${rule.field} 文本“${rule.text}”含未确认表述却被标为 hard`,
        );
      }
    }
  }
});

test("hardness mapping covers degree, major, certificate and experience", () => {
  const byId = new Map(allPositions.map((position) => [position.id, position]));
  const find = (id, field) => byId.get(id)?.requirements.find((rule) => rule.field === field);

  // 按岗位审核 -> unknown（gz-huamei-reserve 的三个字段均为“按岗位审核”）
  const reserve = byId.get("gz-huamei-reserve");
  assert.ok(reserve, "缺少 gz-huamei-reserve 样本");
  assert.equal(find("gz-huamei-reserve", "degree")?.hardness, "unknown");
  assert.equal(find("gz-huamei-reserve", "major")?.hardness, "unknown");
  assert.equal(find("gz-huamei-reserve", "teacher_certificate")?.hardness, "unknown");

  // 未公开 -> unknown（fs-dongyiwan-politics 的学历/专业）
  assert.equal(find("fs-dongyiwan-politics", "degree")?.hardness, "unknown");
  assert.equal(find("fs-dongyiwan-politics", "major")?.hardness, "unknown");

  // 优先 -> preferred（fs-meichen-politics 学历“本科及以上，硕士优先”、专业“偏好重点师范院校相关专业”）
  assert.equal(find("fs-meichen-politics", "degree")?.hardness, "preferred");
  assert.equal(find("fs-meichen-politics", "major")?.hardness, "preferred");

  // 明确要求 -> hard（gz-tianxing-politics 学历“本科及以上”）
  assert.equal(find("gz-tianxing-politics", "degree")?.hardness, "hard");

  // experience：仅说明旧公告接受应届生时不生成经验门槛；“约2年相关经验” -> hard
  assert.equal(find("gz-experimental-fl-politics", "experience"), undefined);
  assert.equal(find("gz-hfi-business", "experience")?.hardness, "hard");
  assert.equal(find("sz-sendelta-econ", "experience")?.hardness, "unknown", "经验年限未写死不得成为硬门槛");
  assert.equal(find("zh-xinhui-daofa", "experience")?.hardness, "unknown", "来源相互矛盾不得成为硬门槛");
  assert.equal(find("hz-guangzheng-politics", "experience"), undefined, "可能接受应届生不应生成经验门槛");
  assert.equal(find("fs-bgy-economics", "experience"), undefined, "接受优秀应届生不应生成经验门槛");
  assert.equal(find("dg-hanlin-politics", "experience"), undefined, "应届届次说明不应生成经验门槛");
  assert.equal(find("sz-jianwen-politics", "experience"), undefined, "到岗日期和年龄要求不应误写为经验门槛");
});

test("workload mapping gives negatives and unknown wording precedence", () => {
  const byId = new Map(allPositions.map((position) => [position.id, position]));
  for (const id of ["gz-ligong-politics", "gz-tianxing-politics", "gz-huamei-reserve", "gz-chaohui-politics", "fs-bgy-economics"]) {
    const workload = byId.get(id)?.workload;
    assert.ok(workload, `缺少 ${id}`);
    assert.equal(workload.eveningStudy, "unknown", `${id} 的晚修未公开不得映射为 yes`);
    assert.equal(workload.homeroomTeacher, "未公开", `${id} 的班主任未公开不得映射为优先`);
  }
  assert.equal(byId.get("sz-scie-social-science")?.workload.residentialDuty, "no", "无宿舍夜间值班应映射为 no");
  assert.equal(byId.get("gz-gis-economics")?.workload.homeroomTeacher, "未公开", "班主任经验偏好不是工作职责");
});

test("provided food and housing produce two independent unknown-fee benefits", () => {
  const position = allPositions.find((item) => item.id === "gz-tianxing-politics");
  assert.ok(position);
  assert.equal(position.housing.provision, "提供（费用未公开）");
  assert.equal(position.meals.provision, "提供餐食（费用未公开）");
});

test("QR-only application is represented on the recruitment batch", () => {
  const batch = multiCityDataset.batches.find((item) => item.id === "batch-edu-skled-27");
  assert.ok(batch);
  assert.equal(batch.applicationMethod, "qr");
  const evidence = multiCityDataset.evidence.find((item) => item.url === batch.applicationUrl);
  assert.equal(evidence?.accessState, "qr_only");
});

// ---------------------------------------------------------------------------
// 修正六：学校别名归并与外键完整性。
// ---------------------------------------------------------------------------
test("merges alias school names into canonical coverage schools", () => {
  const shenzhen = cityDatasets.find((dataset) => dataset.cityName === "深圳");
  assert.ok(shenzhen);
  const names = shenzhen.schools.map((school) => school.officialName);
  assert.ok(names.includes("深圳市万科梅沙书院"), "缺少万科梅沙书院覆盖学校");
  assert.ok(!names.includes("万科梅沙书院"), "万科梅沙书院生成了重复学校记录");
  const school = shenzhen.schools.find((item) => item.officialName === "深圳市万科梅沙书院");
  assert.ok(school?.aliasNames.includes("万科梅沙书院"), "别名未记录在 aliasNames");
  const position = shenzhen.positions.find((item) => item.schoolId === school.id);
  assert.ok(position, "缺少万科梅沙书院岗位");
  assert.equal(position.schoolId, school.id, "万科梅沙书院岗位未关联到覆盖学校");
  const coverage = shenzhen.coverage.find((record) => record.schoolId === school.id);
  assert.ok(coverage?.relevantPositionIds.includes(position.id), "覆盖记录未回填万科梅沙书院岗位");

  // 汉开数理高中（国际部）归并到深圳市汉开数理高中。
  const hankai = shenzhen.schools.find((item) => item.officialName === "深圳市汉开数理高中");
  assert.ok(hankai, "缺少深圳市汉开数理高中");
  const hankaiPosition = shenzhen.positions.find((item) => item.schoolId === hankai.id);
  assert.ok(hankaiPosition, "汉开岗位未归并到本校记录");

  // 顺德：广东实验中学顺德学校（东逸湾实验学校）归并到佛山市顺德区东逸湾实验学校。
  const foshan = cityDatasets.find((dataset) => dataset.cityName === "佛山");
  const dongyiwan = foshan?.schools.find((item) => item.officialName === "佛山市顺德区东逸湾实验学校");
  assert.ok(dongyiwan, "缺少东逸湾实验学校");
  const dongyiwanPosition = foshan?.positions.find((item) => item.id === "fs-dongyiwan-politics");
  assert.equal(dongyiwanPosition?.schoolId, dongyiwan?.id, "东逸湾岗位未关联到覆盖学校");
});

test("every school has an officialPoolEvidenceIds array", () => {
  for (const dataset of ALL_DATASETS) {
    for (const school of dataset.schools) {
      assert.ok(
        Array.isArray(school.officialPoolEvidenceIds),
        `${dataset.cityName} 学校 ${school.officialName} 缺少 officialPoolEvidenceIds 字段`,
      );
    }
  }
});

test("tutoring institutions are not marked as 民办中学 ownership or institutionType", () => {
  for (const school of multiCityDataset.schools) {
    assert.equal(school.institutionType, "教育集团/教培");
    assert.notEqual(school.ownership, "民办", "教育集团/教培机构不应记为民办办学性质");
  }
});

test("keeps foreign keys and id uniqueness intact", () => {
  for (const dataset of ALL_DATASETS) {
    const schoolIds = new Set(dataset.schools.map((school) => school.id));
    const batchIds = new Set(dataset.batches.map((batch) => batch.id));
    const positionIds = new Set(dataset.positions.map((position) => position.id));
    const evidenceIds = new Set(dataset.evidence.map((item) => item.id));

    // 各类 ID 唯一
    assert.equal(dataset.schools.length, schoolIds.size, `${dataset.cityName} 学校 ID 不唯一`);
    assert.equal(dataset.batches.length, batchIds.size, `${dataset.cityName} 批次 ID 不唯一`);
    assert.equal(dataset.positions.length, positionIds.size, `${dataset.cityName} 岗位 ID 不唯一`);
    assert.equal(dataset.evidence.length, evidenceIds.size, `${dataset.cityName} 证据 ID 不唯一`);

    for (const position of dataset.positions) {
      assert.ok(batchIds.has(position.batchId), `${dataset.cityName} 岗位 ${position.id} 的 batchId 失效`);
      assert.ok(position.schoolId && schoolIds.has(position.schoolId), `${dataset.cityName} 岗位 ${position.id} 的 schoolId 失效`);
      assert.ok(!position.salaryEvidenceId || evidenceIds.has(position.salaryEvidenceId), `${position.id} 的 salaryEvidenceId 失效`);
      for (const rule of position.requirements) {
        assert.ok(!rule.evidenceId || evidenceIds.has(rule.evidenceId), `${position.id} 字段 ${rule.field} 的 evidenceId 失效`);
      }
    }
    for (const batch of dataset.batches) {
      for (const id of batch.schoolIds) {
        assert.ok(schoolIds.has(id), `${dataset.cityName} 批次 ${batch.id} 的 schoolIds 失效`);
      }
      for (const id of batch.evidenceIds) {
        assert.ok(evidenceIds.has(id), `${dataset.cityName} 批次 ${batch.id} 的 evidenceIds 失效`);
      }
    }
    for (const record of dataset.coverage) {
      assert.ok(schoolIds.has(record.schoolId), `${dataset.cityName} 覆盖记录 ${record.schoolId} 的 schoolId 失效`);
      for (const id of record.searchEvidenceIds) {
        assert.ok(evidenceIds.has(id), `${dataset.cityName} 覆盖记录 ${record.schoolId} 的 searchEvidenceIds 失效`);
      }
      for (const id of record.relevantPositionIds) {
        assert.ok(positionIds.has(id), `${dataset.cityName} 覆盖记录 ${record.schoolId} 的 relevantPositionIds 失效`);
      }
    }
  }
});

test("multi-city dataset is complete, not position-only", () => {
  assert.ok(multiCityPositions.length > 0, "缺少教培多城市岗位");
  for (const position of multiCityPositions) {
    assert.equal(position.city, null, "教培多城市岗位 city 应为 null");
  }
  assert.equal(multiCityDataset.schools.length, multiCityDataset.positions.length, "多城市机构记录不完整");
  assert.equal(multiCityDataset.batches.length, multiCityDataset.positions.length, "多城市批次记录不完整");
  assert.ok(multiCityDataset.evidence.length >= multiCityDataset.positions.length, "多城市证据记录不完整");
});

test("prepares interfaces for public staffing and hiring outcomes", () => {
  for (const dataset of cityDatasets) {
    assert.ok(Array.isArray(dataset.outcomes), `${dataset.cityName} 缺少 outcomes 接口`);
    assert.ok(Array.isArray(dataset.evidence) && dataset.evidence.length > 0, `${dataset.cityName} 缺少证据`);
    for (const batch of dataset.batches) {
      assert.ok(batch.employmentType, `${dataset.cityName} ${batch.id} 缺少用工性质`);
    }
  }
});

test("fitScore compat layer returns legacy score for migrated positions without a profile", () => {
  for (const position of legacyPositions) {
    assert.equal(computeFitScore(position), position.legacyFitScore, "无 profile 时应回退到静态分");
  }
});

test("native V2 positions never manufacture migration-only fields", () => {
  const nativePositions = allPositions.filter((position) => !position.legacy);
  assert.ok(nativePositions.length > 0);
  for (const position of nativePositions) {
    assert.equal(position.legacy, undefined);
    assert.equal(position.legacyFitScore, undefined);
  }
});

test("every formal private school has A1 pool evidence and a coverage record", () => {
  for (const dataset of cityDatasets) {
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    const covered = new Set(dataset.coverage.map((record) => record.schoolId));
    for (const school of dataset.schools.filter((item) => item.ownership === "民办" && item.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government"))) {
      assert.ok(covered.has(school.id), `${dataset.cityName} ${school.officialName} 缺少检索覆盖记录`);
      assert.ok(school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government"), `${dataset.cityName} ${school.officialName} 缺少 A1 入池依据`);
    }
  }
});

test("every formal school has a coverage record and discovery states have recruitment evidence", () => {
  const discoveryStates = new Set(["发现27届岗位", "发现常年入口", "发现往届参考", "发现相关岗位", "发现招聘入口"]);
  for (const dataset of cityDatasets) {
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    const positionById = new Map(dataset.positions.map((item) => [item.id, item]));
    const coverageBySchoolId = new Map(dataset.coverage.map((item) => [item.schoolId, item]));
    for (const school of dataset.schools.filter((item) => item.institutionType !== "教育集团/教培")) {
      assert.ok(coverageBySchoolId.has(school.id), `${dataset.cityName} ${school.officialName} 缺少覆盖记录`);
    }
    for (const record of dataset.coverage) {
      if (!discoveryStates.has(record.currentOutcome)) continue;
      const hasPosition = record.relevantPositionIds.some((id) => positionById.has(id));
      const hasRecruitmentEvidence = record.searchEvidenceIds.some((id) => {
        const sourceType = evidenceById.get(id)?.sourceType;
        return ["招聘公告", "岗位表", "资格审查", "考试通知", "学校招聘页", "招聘系统", "官方公众号", "第三方岗位"].includes(sourceType);
      });
      assert.ok(hasPosition || hasRecruitmentEvidence, `${dataset.cityName} ${record.schoolId} 的发现状态没有岗位或招聘证据`);
    }
  }
});

test("school directories and admission plans never masquerade as websites or recruitment evidence", () => {
  for (const dataset of cityDatasets) {
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    for (const school of dataset.schools) {
      if (school.officialWebsite) {
        const evidence = evidenceById.get(school.officialWebsiteEvidenceId);
        assert.equal(evidence?.sourceLevel, "A2_school_official", `${school.officialName} 官网不是 A2 学校官方来源`);
        assert.equal(evidence?.sourceType, "学校主页", `${school.officialName} 官网证据不是学校主页`);
        assert.equal(evidence?.url, school.officialWebsite, `${school.officialName} 官网与证据网址不一致`);
      }
      for (const id of school.recruitmentChannelEvidenceIds) {
        const sourceType = evidenceById.get(id)?.sourceType;
        assert.ok(!["学校名单", "教育部门说明", "公办目标依据", "学校主页"].includes(sourceType), `${school.officialName} 招聘入口引用了学校池或普通官网来源`);
      }
    }
    for (const record of dataset.coverage) {
      for (const id of record.searchEvidenceIds) {
        const sourceType = evidenceById.get(id)?.sourceType;
        assert.ok(!["学校名单", "教育部门说明", "公办目标依据", "学校主页"].includes(sourceType), `${record.schoolId} 的招聘检索证据混入学校名单或普通官网`);
      }
    }
  }
});

test("ordinary school contact pages stay separate from official homepages and recruitment channels", () => {
  const contactEvidence = ALL_DATASETS.flatMap((dataset) => dataset.evidence).filter((item) => item.sourceType === "联系方式页");
  assert.ok(contactEvidence.length > 0, "测试数据应包含普通学校联系页");
  const contactIds = new Set(contactEvidence.map((item) => item.id));
  for (const dataset of ALL_DATASETS) {
    for (const school of dataset.schools) {
      assert.ok(!contactIds.has(school.officialWebsiteEvidenceId), `${school.officialName} 把联系页显示为学校官网`);
      assert.ok(!school.recruitmentChannelEvidenceIds.some((id) => contactIds.has(id)), `${school.officialName} 把普通联系页显示为招聘入口`);
    }
  }
});

test("recruitment contacts are evidence-linked and never promote past details as current", () => {
  for (const dataset of cityDatasets) {
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    for (const school of dataset.schools) {
      for (const contact of school.recruitmentContacts) {
        const evidence = evidenceById.get(contact.evidenceId);
        assert.ok(evidence, `${contact.id} 缺少来源外键`);
        assert.ok(contact.recruitmentCycle.length > 0, `${contact.id} 缺少招聘届次`);
        assert.ok(["当前届次", "常年", "往届", "时效待确认"].includes(contact.validity), `${contact.id} 时效状态异常`);
        if (contact.validity === "当前届次") {
          assert.ok(/2027|常年/.test(`${contact.recruitmentCycle} ${evidence?.recruitmentCycle ?? ""}`), `${contact.id} 没有当前届次依据`);
          assert.ok(!(/202[4-6]/.test(evidence?.recruitmentCycle ?? "") && !/2027|常年/.test(evidence?.recruitmentCycle ?? "")), `${contact.id} 把往届来源显示为当前有效`);
        }
      }
    }
  }
});

test("normal operation state requires current field-level evidence", () => {
  for (const dataset of cityDatasets) {
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    for (const school of dataset.schools.filter((item) => item.activeState === "正常办学")) {
      const refs = school.fieldEvidence?.activeState ?? [];
      assert.ok(refs.length > 0, `${dataset.cityName} ${school.officialName} 正常办学缺少字段级证据`);
      assert.ok(refs.some((id) => {
        const evidence = evidenceById.get(id);
        return evidence?.accessState === "ok" && (evidence.publishedAt?.startsWith("2026-") || (evidence.sourceLevel === "A2_school_official" && evidence.sourceType === "学校主页" && evidence.accessedAt.startsWith("2026-")));
      }), `${dataset.cityName} ${school.officialName} 正常办学没有当前有效依据`);
    }
  }
});

test("pending and old-lead coverage records do not invent search dates", () => {
  for (const dataset of cityDatasets) {
    for (const record of dataset.coverage.filter((item) => ["待检索", "旧线索待复核"].includes(item.currentOutcome))) {
      assert.equal(record.lastSearchedAt, undefined, `${dataset.cityName} ${record.schoolId} 未实际检索却填写了检索日期`);
    }
  }
});

test("keeps the recovered Suzhou private high school narrow and evidence-backed", () => {
  const dataset = cityDatasets.find((item) => item.cityName === "苏州");
  assert.ok(dataset);
  const school = dataset.schools.find((item) => item.id === "private-sz-deyuan-xinrong");
  assert.ok(school, "苏州政府已确认的德元新融学校未进入正式池");
  assert.deepEqual(school.schoolStages, ["高中"]);
  assert.equal(school.ownership, "民办");
  const evidence = dataset.evidence.find((item) => item.id === school.officialPoolEvidenceIds[0]);
  assert.equal(evidence?.sourceLevel, "A1_government");
  assert.equal(evidence?.publisher, "苏州市人民政府");
  assert.ok(dataset.coverageGaps?.some((gap) => gap.scope === "private_school_pool" && /完整名单仍未恢复/.test(gap.description)), "不得把单校证据冒充苏州完整民办学校池");
});

test("public staffing assertions always carry A1 evidence", () => {
  for (const dataset of cityDatasets) {
    const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
    for (const batch of dataset.batches.filter((item) => item.employmentType === "事业编制")) {
      const evidence = evidenceById.get(batch.employmentEvidenceId);
      assert.equal(evidence?.sourceLevel, "A1_government", `${batch.id} 的事业编制结论缺少 A1 证据`);
    }
  }
});

test("hiring outcomes are privacy-clean and evidence-linked", () => {
  const forbiddenKeys = new Set(["name", "candidateName", "gender", "phone", "email", "idCard", "ticketNumber", "score", "rank", "photo"]);
  let outcomeCount = 0;
  for (const dataset of cityDatasets) {
    const evidenceIds = new Set(dataset.evidence.map((item) => item.id));
    for (const outcome of dataset.outcomes) {
      outcomeCount += 1;
      assert.ok(evidenceIds.has(outcome.evidenceId), `${outcome.id} 的证据外键失效`);
      for (const key of Object.keys(outcome)) assert.ok(!forbiddenKeys.has(key), `${outcome.id} 含禁止的个人字段 ${key}`);
    }
  }
  assert.ok(outcomeCount >= 5, "应至少包含一批经过隐私清洗的录用结果");
});

test("private fit uses language, experience and housing profile fields", () => {
  const position = allPositions.find((item) => item.id === "sz-scie-social-science");
  assert.ok(position);
  const baseProfile = {
    graduationYear: 2027,
    teacherCertificateStage: "高中",
    teacherCertificateSubject: "政治",
    minimumSalaryAnnual: 15,
    housingPreference: "优先提供住宿",
  };
  const withoutEnglish = computePrivateFit(position, baseProfile);
  const withEnglish = computePrivateFit(position, { ...baseProfile, ielts: 7, internationalCurriculumExperience: true });
  assert.ok(withEnglish > withoutEnglish, "全英文岗位应响应语言成绩和国际课程经验");
});

test("public eligibility separates unknown certificate stage from a confirmed mismatch", () => {
  const position = allPositions.find((item) => item.id === "pos-sz-xiangcheng-2026-politics-huangdai");
  assert.ok(position);
  const uncertain = evaluatePublicEligibility(position, {
    graduationYear: 2026,
    masterMajor: "马克思主义理论",
    teacherCertificateStage: "中学未确认",
    teacherCertificateSubject: "政治",
  });
  assert.equal(uncertain.state, "可能满足，需要确认");
  assert.ok(uncertain.unresolved.some((item) => item.includes("教师资格学段")));

  const failed = evaluatePublicEligibility(position, {
    graduationYear: 2026,
    masterMajor: "马克思主义理论",
    teacherCertificateStage: "初中",
    teacherCertificateSubject: "政治",
  });
  assert.equal(failed.state, "明确不满足");
});
