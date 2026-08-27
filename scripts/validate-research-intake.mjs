// 校验 CodeBuddy 城市资料包；不访问网络，也不把待审核资料导入正式数据。
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CITY_PROVINCE = {
  广州: "广东", 深圳: "广东", 佛山: "广东", 珠海: "广东", 惠州: "广东", 东莞: "广东",
  杭州: "浙江", 宁波: "浙江", 温州: "浙江", 嘉兴: "浙江", 绍兴: "浙江",
  南京: "江苏", 苏州: "江苏", 无锡: "江苏",
};
const ACCESS_STATES = new Set(["ok", "qr_only", "login_required", "blocked", "dead"]);
const SOURCE_LEVELS = new Set(["A1_government", "A2_school_official"]);
const SOURCE_TYPES = new Set(["学校名单", "教育部门说明", "学校主页", "公办目标依据"]);
const PRIVATE_STATES = new Set(["正常办学", "更名", "停办", "待确认"]);
const GAP_SCOPES = new Set(["private_school_pool", "public_target_pool", "district", "source_access"]);
const FORBIDDEN_PERSONAL_KEYS = new Set([
  "candidateName", "candidateNames", "candidates", "personName", "personalInfo", "gender", "birthDate", "idCard", "phone", "email", "photo", "examNumber", "admissionNumber",
  "姓名", "人员姓名", "性别", "出生日期", "身份证号", "手机号", "电话", "邮箱", "照片", "准考证号", "录取编号",
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HTTP_PATTERN = /^https?:\/\//;
const BATCH_ID_PATTERN = /^[a-z0-9-]+$/;
const SOURCE_ID_PATTERN = /^src-[a-z0-9-]+$/;
const PRIVATE_SCHOOL_ID_PATTERN = /^school-[a-z0-9-]+$/;
const PUBLIC_SCHOOL_ID_PATTERN = /^public-[a-z0-9-]+$/;
const PERSONAL_VALUE_PATTERNS = [
  { pattern: /\b1[3-9]\d{9}\b/, label: "手机号码" },
  { pattern: /\b\d{17}[\dXx]\b/, label: "身份证号码" },
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, label: "邮箱地址" },
];
const FORBIDDEN_OFFICIAL_HOSTS = new Set([
  "sohu.com", "www.sohu.com", "xiaozhang.com.cn", "www.xiaozhang.com.cn",
  "mingxiao.zxxk.com", "baike.baidu.com",
]);

function objectLike(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, pathName, errors) {
  if (!objectLike(value)) {
    errors.push(`${pathName} 必须是对象`);
    return false;
  }
  return true;
}

function requireString(value, pathName, errors, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    errors.push(`${pathName} 必须是${allowEmpty ? "字符串" : "非空字符串"}`);
    return false;
  }
  return true;
}

function requireArray(value, pathName, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${pathName} 必须是数组`);
    return false;
  }
  return true;
}

function assertAllowedKeys(record, allowed, pathName, errors) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) errors.push(`${pathName}.${key} 不是允许字段`);
  }
}

function assertUnique(values, pathName, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${pathName} 存在重复值：${value}`);
    seen.add(value);
  }
}

function scanPersonalFields(value, pathName, errors) {
  if (typeof value === "string") {
    for (const { pattern, label } of PERSONAL_VALUE_PATTERNS) {
      if (pattern.test(value)) errors.push(`${pathName} 疑似包含本阶段禁止采集的${label}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPersonalFields(item, `${pathName}[${index}]`, errors));
    return;
  }
  if (!objectLike(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_PERSONAL_KEYS.has(key)) errors.push(`${pathName}.${key} 属于本阶段禁止采集的个人信息字段`);
    scanPersonalFields(entry, `${pathName}.${key}`, errors);
  }
}

export function validateCityIntake(data) {
  const errors = [];
  if (!requireObject(data, "$", errors)) return errors;
  assertAllowedKeys(data, new Set([
    "schemaVersion", "isTemplate", "batchId", "province", "city", "researchedAt", "researcher",
    "sources", "privateSchools", "publicTargets", "coverageGaps", "unresolvedAliases", "notes",
  ]), "$", errors);
  if (data.schemaVersion !== 1) errors.push("$.schemaVersion 必须为 1");
  if (typeof data.isTemplate !== "boolean") errors.push("$.isTemplate 必须是布尔值");
  if (requireString(data.batchId, "$.batchId", errors) && !BATCH_ID_PATTERN.test(data.batchId)) {
    errors.push("$.batchId 只能使用小写英文、数字和连字符");
  }
  requireString(data.province, "$.province", errors);
  requireString(data.city, "$.city", errors);
  if (!(data.city in CITY_PROVINCE)) errors.push(`$.city 不在十四城范围：${String(data.city)}`);
  if (data.city in CITY_PROVINCE && CITY_PROVINCE[data.city] !== data.province) {
    errors.push(`$.province 与城市 ${data.city} 不匹配`);
  }
  if (!requireString(data.researchedAt, "$.researchedAt", errors) || !DATE_PATTERN.test(data.researchedAt)) {
    errors.push("$.researchedAt 必须使用 YYYY-MM-DD");
  }
  requireString(data.researcher, "$.researcher", errors);

  const sources = requireArray(data.sources, "$.sources", errors) ? data.sources : [];
  const privateSchools = requireArray(data.privateSchools, "$.privateSchools", errors) ? data.privateSchools : [];
  const publicTargets = requireArray(data.publicTargets, "$.publicTargets", errors) ? data.publicTargets : [];
  const coverageGaps = requireArray(data.coverageGaps, "$.coverageGaps", errors) ? data.coverageGaps : [];
  const unresolvedAliases = requireArray(data.unresolvedAliases, "$.unresolvedAliases", errors) ? data.unresolvedAliases : [];
  const notes = requireArray(data.notes, "$.notes", errors) ? data.notes : [];
  notes.forEach((item, index) => requireString(item, `$.notes[${index}]`, errors, { allowEmpty: true }));

  const sourceIds = [];
  const sourceById = new Map();
  sources.forEach((source, index) => {
    const itemPath = `$.sources[${index}]`;
    if (!requireObject(source, itemPath, errors)) return;
    assertAllowedKeys(source, new Set([
      "id", "title", "url", "publisher", "sourceLevel", "sourceType", "publishedAt", "accessedAt", "accessState", "note",
    ]), itemPath, errors);
    if (requireString(source.id, `${itemPath}.id`, errors) && !SOURCE_ID_PATTERN.test(source.id)) {
      errors.push(`${itemPath}.id 必须使用 src- 前缀及小写英文、数字、连字符`);
    }
    requireString(source.title, `${itemPath}.title`, errors);
    if (!requireString(source.url, `${itemPath}.url`, errors) || !HTTP_PATTERN.test(source.url)) errors.push(`${itemPath}.url 必须是 HTTP(S) 地址`);
    if (typeof source.url === "string" && HTTP_PATTERN.test(source.url)) {
      const host = new URL(source.url).hostname.toLowerCase();
      if (FORBIDDEN_OFFICIAL_HOSTS.has(host) && ["A1_government", "A2_school_official"].includes(source.sourceLevel)) {
        errors.push(`${itemPath}.url 的第三方域名 ${host} 不得标为官方来源`);
      }
    }
    requireString(source.publisher, `${itemPath}.publisher`, errors);
    if (!SOURCE_LEVELS.has(source.sourceLevel)) errors.push(`${itemPath}.sourceLevel 仅允许 A1_government 或 A2_school_official`);
    if (!SOURCE_TYPES.has(source.sourceType)) errors.push(`${itemPath}.sourceType 不受支持`);
    if (source.publishedAt != null && (typeof source.publishedAt !== "string" || !DATE_PATTERN.test(source.publishedAt))) errors.push(`${itemPath}.publishedAt 必须为空或 YYYY-MM-DD`);
    if (!requireString(source.accessedAt, `${itemPath}.accessedAt`, errors) || !DATE_PATTERN.test(source.accessedAt)) errors.push(`${itemPath}.accessedAt 必须使用 YYYY-MM-DD`);
    if (!ACCESS_STATES.has(source.accessState)) errors.push(`${itemPath}.accessState 不受支持`);
    requireString(source.note, `${itemPath}.note`, errors, { allowEmpty: true });
    if (source.accessState === "ok" && /504|搜索引擎索引.*确认|未实际打开|仅搜索摘要/.test(source.note ?? "")) {
      errors.push(`${itemPath}.accessState 不能在正文未实际打开时标为 ok`);
    }
    sourceIds.push(source.id);
    sourceById.set(source.id, source);
  });
  assertUnique(sourceIds, "$.sources[].id", errors);

  const allSchoolIds = [];
  const allSchoolNames = [];
  privateSchools.forEach((school, index) => {
    const itemPath = `$.privateSchools[${index}]`;
    if (!requireObject(school, itemPath, errors)) return;
    assertAllowedKeys(school, new Set([
      "id", "officialName", "district", "schoolStages", "ownership", "officialPoolEvidenceIds", "aliasNames", "activeState", "note",
    ]), itemPath, errors);
    if (requireString(school.id, `${itemPath}.id`, errors) && !PRIVATE_SCHOOL_ID_PATTERN.test(school.id)) {
      errors.push(`${itemPath}.id 必须使用 school- 前缀及小写英文、数字、连字符`);
    }
    requireString(school.officialName, `${itemPath}.officialName`, errors);
    requireString(school.district, `${itemPath}.district`, errors);
    const stages = requireArray(school.schoolStages, `${itemPath}.schoolStages`, errors) ? school.schoolStages : [];
    if (stages.length === 0 || stages.some((stage) => !["初中", "高中"].includes(stage))) errors.push(`${itemPath}.schoolStages 必须至少包含初中或高中`);
    assertUnique(stages, `${itemPath}.schoolStages`, errors);
    if (school.ownership !== "民办") errors.push(`${itemPath}.ownership 必须为民办`);
    const refs = requireArray(school.officialPoolEvidenceIds, `${itemPath}.officialPoolEvidenceIds`, errors) ? school.officialPoolEvidenceIds : [];
    if (refs.length === 0) errors.push(`${itemPath}.officialPoolEvidenceIds 至少需要一条官方名单证据`);
    for (const ref of refs) {
      const source = sourceById.get(ref);
      if (!source) errors.push(`${itemPath}.officialPoolEvidenceIds 引用了不存在的来源 ${ref}`);
      else if (source.sourceLevel !== "A1_government" || source.sourceType !== "学校名单") errors.push(`${itemPath} 的学校池证据 ${ref} 必须是政府学校名单`);
    }
    const aliases = requireArray(school.aliasNames, `${itemPath}.aliasNames`, errors) ? school.aliasNames : [];
    aliases.forEach((alias, aliasIndex) => requireString(alias, `${itemPath}.aliasNames[${aliasIndex}]`, errors));
    assertUnique(aliases, `${itemPath}.aliasNames`, errors);
    if (!PRIVATE_STATES.has(school.activeState)) errors.push(`${itemPath}.activeState 不受支持`);
    requireString(school.note, `${itemPath}.note`, errors, { allowEmpty: true });
    allSchoolIds.push(school.id);
    allSchoolNames.push(school.officialName);
  });

  publicTargets.forEach((school, index) => {
    const itemPath = `$.publicTargets[${index}]`;
    if (!requireObject(school, itemPath, errors)) return;
    assertAllowedKeys(school, new Set(["id", "officialName", "district", "schoolStages", "targetTier", "targetReason", "evidenceIds", "note"]), itemPath, errors);
    if (requireString(school.id, `${itemPath}.id`, errors) && !PUBLIC_SCHOOL_ID_PATTERN.test(school.id)) {
      errors.push(`${itemPath}.id 必须使用 public- 前缀及小写英文、数字、连字符`);
    }
    requireString(school.officialName, `${itemPath}.officialName`, errors);
    requireString(school.district, `${itemPath}.district`, errors);
    const stages = requireArray(school.schoolStages, `${itemPath}.schoolStages`, errors) ? school.schoolStages : [];
    if (stages.length !== 1 || stages[0] !== "高中") errors.push(`${itemPath}.schoolStages 本阶段必须为 ["高中"]`);
    if (!["核心", "扩展"].includes(school.targetTier)) errors.push(`${itemPath}.targetTier 必须为核心或扩展`);
    requireString(school.targetReason, `${itemPath}.targetReason`, errors);
    const refs = requireArray(school.evidenceIds, `${itemPath}.evidenceIds`, errors) ? school.evidenceIds : [];
    if (refs.length === 0) errors.push(`${itemPath}.evidenceIds 至少需要一条官方依据`);
    refs.forEach((ref) => {
      if (!sourceById.has(ref)) errors.push(`${itemPath}.evidenceIds 引用了不存在的来源 ${ref}`);
    });
    requireString(school.note, `${itemPath}.note`, errors, { allowEmpty: true });
    allSchoolIds.push(school.id);
    allSchoolNames.push(school.officialName);
  });
  assertUnique(allSchoolIds, "学校 ID", errors);
  assertUnique(allSchoolNames, "学校正式名称", errors);

  coverageGaps.forEach((gap, index) => {
    const itemPath = `$.coverageGaps[${index}]`;
    if (!requireObject(gap, itemPath, errors)) return;
    assertAllowedKeys(gap, new Set(["scope", "description", "evidenceIds", "nextAction"]), itemPath, errors);
    if (!GAP_SCOPES.has(gap.scope)) errors.push(`${itemPath}.scope 不受支持`);
    requireString(gap.description, `${itemPath}.description`, errors);
    const refs = requireArray(gap.evidenceIds, `${itemPath}.evidenceIds`, errors) ? gap.evidenceIds : [];
    refs.forEach((ref) => { if (!sourceById.has(ref)) errors.push(`${itemPath}.evidenceIds 引用了不存在的来源 ${ref}`); });
    requireString(gap.nextAction, `${itemPath}.nextAction`, errors);
  });

  unresolvedAliases.forEach((alias, index) => {
    const itemPath = `$.unresolvedAliases[${index}]`;
    if (!requireObject(alias, itemPath, errors)) return;
    assertAllowedKeys(alias, new Set(["nameA", "nameB", "reasonUnresolved", "evidenceIds"]), itemPath, errors);
    requireString(alias.nameA, `${itemPath}.nameA`, errors);
    requireString(alias.nameB, `${itemPath}.nameB`, errors);
    requireString(alias.reasonUnresolved, `${itemPath}.reasonUnresolved`, errors);
    const refs = requireArray(alias.evidenceIds, `${itemPath}.evidenceIds`, errors) ? alias.evidenceIds : [];
    refs.forEach((ref) => { if (!sourceById.has(ref)) errors.push(`${itemPath}.evidenceIds 引用了不存在的来源 ${ref}`); });
  });

  if (data.isTemplate === false) {
    if (sources.length === 0) errors.push("正式资料包至少需要一条官方来源");
    if (privateSchools.length === 0 && !coverageGaps.some((gap) => gap.scope === "private_school_pool")) {
      errors.push("未列出民办学校时，必须记录 private_school_pool 缺口");
    }
    if (publicTargets.length === 0 && !coverageGaps.some((gap) => gap.scope === "public_target_pool")) {
      errors.push("未列出公办目标校时，必须记录 public_target_pool 缺口");
    }
  }
  scanPersonalFields(data, "$", errors);
  return errors;
}

async function collectJsonFiles(target) {
  let info;
  try {
    info = await stat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  if (info.isFile()) return target.endsWith(".json") ? [target] : [];
  if (!info.isDirectory()) return [];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => collectJsonFiles(path.join(target, entry.name))));
  return nested.flat();
}

async function main() {
  const targets = process.argv.slice(2);
  const requested = targets.length > 0 ? targets : ["research/templates/city-intake.template.json", "research/intake"];
  const files = (await Promise.all(requested.map(collectJsonFiles))).flat().sort();
  if (files.length === 0) {
    console.error("未找到可校验的城市资料 JSON");
    process.exitCode = 1;
    return;
  }
  let errorCount = 0;
  for (const file of files) {
    try {
      const data = JSON.parse(await readFile(file, "utf8"));
      const errors = validateCityIntake(data);
      if (errors.length === 0) {
        console.log(`OK   ${file}`);
      } else {
        errorCount += errors.length;
        console.error(`FAIL ${file}`);
        errors.forEach((error) => console.error(`  - ${error}`));
      }
    } catch (error) {
      errorCount += 1;
      console.error(`FAIL ${file}`);
      console.error(`  - JSON 无法读取：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`共校验 ${files.length} 个资料包，发现 ${errorCount} 个问题。`);
  if (errorCount > 0) process.exitCode = 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
