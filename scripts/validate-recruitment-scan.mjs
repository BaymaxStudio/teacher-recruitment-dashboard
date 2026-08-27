// 校验 DSH 招聘扫描暂存资料；不访问网络，也不把暂存线索写入正式数据。
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CITY_PROVINCE = {
  广州: "广东", 深圳: "广东", 佛山: "广东", 珠海: "广东", 惠州: "广东", 东莞: "广东",
  杭州: "浙江", 宁波: "浙江", 温州: "浙江", 嘉兴: "浙江", 绍兴: "浙江",
  南京: "江苏", 苏州: "江苏", 无锡: "江苏",
};
const SOURCE_LEVELS = new Set(["A1_government", "A2_school_official", "B_university_career", "C_recruitment_platform", "D_aggregator"]);
const SOURCE_TYPES = new Set(["学校主页", "学校招聘页", "招聘系统", "联系方式页", "官方公众号", "招聘公告", "岗位表", "第三方岗位"]);
const ACCESS_STATES = new Set(["ok", "qr_only", "login_required", "blocked", "dead"]);
const WEBSITE_OUTCOMES = new Set(["found", "not_found", "blocked", "pending"]);
const RECRUITMENT_OUTCOMES = new Set(["current_2027_found", "evergreen_found", "historical_found", "not_found", "blocked", "qr_only", "pending"]);
const CONTACT_CHANNELS = new Set(["email", "phone", "wechat", "other"]);
const CONTACT_PURPOSES = new Set(["招聘咨询", "简历投递", "学校总机", "招生咨询", "未明确"]);
const CONTACT_IDENTITIES = new Set(["机构", "公告中的招聘联系人", "未明确"]);
const CONTACT_VALIDITIES = new Set(["当前届次", "常年", "往届", "时效待确认"]);
const SUBJECT_TAGS = new Set(["政治/道法", "经济/商科", "全球视野/社科", "历史/人文", "其他"]);
const LEAD_STATUSES = new Set(["2027当前", "常年入口", "往届参考", "状态待确认"]);
const APPLICATION_METHODS = new Set(["web", "email", "platform", "qr", "onsite", "unknown"]);
const RECRUITMENT_SOURCE_TYPES = new Set(["学校招聘页", "招聘系统", "官方公众号", "招聘公告", "岗位表", "第三方岗位"]);
const FORBIDDEN_OFFICIAL_HOSTS = new Set([
  "baidu.com", "www.baidu.com", "so.com", "www.so.com", "bing.com", "www.bing.com",
  "sogou.com", "www.sogou.com", "sohu.com", "www.sohu.com", "baike.baidu.com",
]);
const FORBIDDEN_PERSONAL_KEYS = new Set([
  "candidateName", "candidateNames", "personName", "contactName", "personalInfo", "gender", "birthDate",
  "idCard", "photo", "examNumber", "ticketNumber", "score", "rank", "姓名", "人员姓名", "联系人姓名",
  "性别", "出生日期", "身份证号", "照片", "准考证号", "成绩", "排名",
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HTTP_PATTERN = /^https?:\/\//;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const MOBILE_PATTERN = /(?<!\d)1[3-9]\d{9}(?!\d)/;
const LANDLINE_PATTERN = /(?<!\d)0\d{2,3}[-— ]?\d{7,8}(?!\d)/;
const PHONE_VALUE_PATTERN = /^(?:1[3-9]\d{9}|(?:0\d{2,3}[-— ]?)?\d{7,8})$/;
const TARGET_MANIFEST_SLUGS = {
  杭州: "hangzhou", 嘉兴: "jiaxing", 南京: "nanjing", 宁波: "ningbo",
  绍兴: "shaoxing", 苏州: "suzhou", 温州: "wenzhou", 无锡: "wuxi",
};

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

function validDate(value) {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function sourceHost(source) {
  try {
    return new URL(source.url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isRecruitmentSource(source) {
  return Boolean(source && RECRUITMENT_SOURCE_TYPES.has(source.sourceType));
}

function normalizeDateParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function deadlineDatesInLead(lead) {
  const text = `${lead.recruitmentCycle ?? ""}；${lead.note ?? ""}`;
  const dates = new Set();
  const afterDatePattern = /(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})(?:日)?(?:前(?:投递|报名)?|截止|止)/g;
  const beforeDatePattern = /(?:截止(?:日期)?|报名[^，。；]{0,16}?(?:至|到)|简历(?:投递)?截止(?:至)?)[^，。；]{0,16}?(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})/g;
  for (const pattern of [afterDatePattern, beforeDatePattern]) {
    for (const match of text.matchAll(pattern)) dates.add(normalizeDateParts(match[1], match[2], match[3]));
  }
  return [...dates];
}

function scanPrivacy(value, pathName, errors, contactValuePaths) {
  if (typeof value === "string") {
    if (!contactValuePaths.has(pathName) && (EMAIL_PATTERN.test(value) || MOBILE_PATTERN.test(value) || LANDLINE_PATTERN.test(value))) {
      errors.push(`${pathName} 含电话或邮箱；公开联系方式只能写入 schoolScans[].contacts[].value`);
    }
    if (/联系人(?:姓名)?\s*[：:]/.test(value)) errors.push(`${pathName} 疑似包含联系人姓名标签`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${pathName}[${index}]`, errors, contactValuePaths));
    return;
  }
  if (!objectLike(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_PERSONAL_KEYS.has(key)) errors.push(`${pathName}.${key} 属于禁止采集的个人信息字段`);
    scanPrivacy(entry, `${pathName}.${key}`, errors, contactValuePaths);
  }
}

function validateSource(source, index, errors) {
  const itemPath = `$.sources[${index}]`;
  if (!requireObject(source, itemPath, errors)) return;
  assertAllowedKeys(source, new Set([
    "id", "title", "url", "publisher", "sourceLevel", "sourceType", "publishedAt", "accessedAt", "accessState", "recruitmentCycle", "note",
  ]), itemPath, errors);
  if (!requireString(source.id, `${itemPath}.id`, errors) || !/^src-[a-z0-9-]+$/.test(source.id)) errors.push(`${itemPath}.id 必须使用 src- 前缀及小写英文、数字、连字符`);
  requireString(source.title, `${itemPath}.title`, errors);
  if (!requireString(source.url, `${itemPath}.url`, errors) || !HTTP_PATTERN.test(source.url)) errors.push(`${itemPath}.url 必须是 HTTP(S) 地址`);
  requireString(source.publisher, `${itemPath}.publisher`, errors);
  if (!SOURCE_LEVELS.has(source.sourceLevel)) errors.push(`${itemPath}.sourceLevel 不受支持`);
  if (!SOURCE_TYPES.has(source.sourceType)) errors.push(`${itemPath}.sourceType 不受支持`);
  if (source.publishedAt != null && !validDate(source.publishedAt)) errors.push(`${itemPath}.publishedAt 必须为空或 YYYY-MM-DD`);
  if (!validDate(source.accessedAt)) errors.push(`${itemPath}.accessedAt 必须使用 YYYY-MM-DD`);
  if (!ACCESS_STATES.has(source.accessState)) errors.push(`${itemPath}.accessState 不受支持`);
  requireString(source.recruitmentCycle, `${itemPath}.recruitmentCycle`, errors, { allowEmpty: true });
  requireString(source.note, `${itemPath}.note`, errors, { allowEmpty: true });
  if (["A1_government", "A2_school_official"].includes(source.sourceLevel) && FORBIDDEN_OFFICIAL_HOSTS.has(sourceHost(source))) {
    errors.push(`${itemPath}.url 的搜索或转载域名不得标为官方来源`);
  }
  if (source.accessState === "ok" && /搜索摘要|搜索结果|未实际打开|正文为空|打不开|超时|403|404|504/.test(source.note ?? "")) {
    errors.push(`${itemPath}.accessState 不能在正文未打开或访问异常时标为 ok`);
  }
}

function validateContact(contact, pathName, sourceById, errors, contactValuePaths) {
  if (!requireObject(contact, pathName, errors)) return;
  assertAllowedKeys(contact, new Set(["id", "channel", "value", "purpose", "contactIdentity", "recruitmentCycle", "validity", "evidenceId", "lastVerified"]), pathName, errors);
  if (!requireString(contact.id, `${pathName}.id`, errors) || !/^contact-[a-z0-9-]+$/.test(contact.id)) errors.push(`${pathName}.id 格式错误`);
  if (!CONTACT_CHANNELS.has(contact.channel)) errors.push(`${pathName}.channel 不受支持`);
  requireString(contact.value, `${pathName}.value`, errors);
  contactValuePaths.add(`${pathName}.value`);
  if (contact.channel === "email" && !EMAIL_PATTERN.test(contact.value ?? "")) errors.push(`${pathName}.value 不是有效邮箱格式`);
  if (contact.channel === "phone" && !PHONE_VALUE_PATTERN.test((contact.value ?? "").replaceAll(" ", ""))) errors.push(`${pathName}.value 不是可识别的电话格式`);
  if (!CONTACT_PURPOSES.has(contact.purpose)) errors.push(`${pathName}.purpose 不受支持`);
  if (!CONTACT_IDENTITIES.has(contact.contactIdentity)) errors.push(`${pathName}.contactIdentity 不受支持`);
  requireString(contact.recruitmentCycle, `${pathName}.recruitmentCycle`, errors);
  if (!CONTACT_VALIDITIES.has(contact.validity)) errors.push(`${pathName}.validity 不受支持`);
  if (!validDate(contact.lastVerified)) errors.push(`${pathName}.lastVerified 必须使用 YYYY-MM-DD`);
  const source = sourceById.get(contact.evidenceId);
  if (!source) errors.push(`${pathName}.evidenceId 引用了不存在的来源 ${String(contact.evidenceId)}`);
  if (contact.validity === "当前届次" && !/2027|常年/.test(`${contact.recruitmentCycle} ${source?.recruitmentCycle ?? ""}`)) {
    errors.push(`${pathName} 标为当前届次，但联系方式及来源均未证明 2027 届或常年有效`);
  }
  if (contact.validity === "当前届次" && /202[4-6]/.test(source?.recruitmentCycle ?? "") && !/2027|常年/.test(source?.recruitmentCycle ?? "")) {
    errors.push(`${pathName} 不得把往届来源中的联系方式标为当前有效`);
  }
}

function validateLead(lead, pathName, sourceById, errors) {
  if (!requireObject(lead, pathName, errors)) return;
  assertAllowedKeys(lead, new Set([
    "id", "title", "subjectTags", "recruitmentCycle", "status", "publishedAt", "deadline", "expectedStart", "salaryRaw", "housingRaw", "mealsRaw",
    "workloadRaw", "requirementsRaw", "selectionProcessRaw", "applicationMethod", "applicationUrl", "sourceEvidenceIds", "note",
  ]), pathName, errors);
  if (!requireString(lead.id, `${pathName}.id`, errors) || !/^lead-[a-z0-9-]+$/.test(lead.id)) errors.push(`${pathName}.id 格式错误`);
  requireString(lead.title, `${pathName}.title`, errors);
  const subjectTags = requireArray(lead.subjectTags, `${pathName}.subjectTags`, errors) ? lead.subjectTags : [];
  if (subjectTags.length === 0 || subjectTags.some((item) => !SUBJECT_TAGS.has(item))) errors.push(`${pathName}.subjectTags 至少包含一个支持的方向`);
  assertUnique(subjectTags, `${pathName}.subjectTags`, errors);
  requireString(lead.recruitmentCycle, `${pathName}.recruitmentCycle`, errors);
  if (!LEAD_STATUSES.has(lead.status)) errors.push(`${pathName}.status 不受支持`);
  for (const field of ["publishedAt", "deadline"]) if (lead[field] != null && !validDate(lead[field])) errors.push(`${pathName}.${field} 必须为空或 YYYY-MM-DD`);
  for (const field of ["expectedStart", "salaryRaw", "housingRaw", "mealsRaw", "note"]) requireString(lead[field], `${pathName}.${field}`, errors, { allowEmpty: true });
  for (const field of ["workloadRaw", "requirementsRaw", "selectionProcessRaw"]) {
    const values = requireArray(lead[field], `${pathName}.${field}`, errors) ? lead[field] : [];
    values.forEach((item, index) => requireString(item, `${pathName}.${field}[${index}]`, errors, { allowEmpty: true }));
  }
  if (!APPLICATION_METHODS.has(lead.applicationMethod)) errors.push(`${pathName}.applicationMethod 不受支持`);
  if (lead.applicationUrl != null && (typeof lead.applicationUrl !== "string" || !HTTP_PATTERN.test(lead.applicationUrl))) errors.push(`${pathName}.applicationUrl 必须为空或 HTTP(S) 地址`);
  const refs = requireArray(lead.sourceEvidenceIds, `${pathName}.sourceEvidenceIds`, errors) ? lead.sourceEvidenceIds : [];
  if (refs.length === 0) errors.push(`${pathName}.sourceEvidenceIds 至少需要一条来源`);
  refs.forEach((id) => { if (!sourceById.has(id)) errors.push(`${pathName}.sourceEvidenceIds 引用了不存在的来源 ${id}`); });
  assertUnique(refs, `${pathName}.sourceEvidenceIds`, errors);
  if (lead.status === "2027当前" && !lead.requirementsRaw.some((item) => /2027(?:届|年(?:普通高校)?应届|年毕业)/.test(item))) {
    errors.push(`${pathName} 标为 2027 当前线索，但要求原文没有明确的 2027 届毕业条件`);
  }
  if (lead.status === "状态待确认" && /2026届/.test(lead.recruitmentCycle)) {
    errors.push(`${pathName} 已明确为 2026 届，不得停留在状态待确认`);
  }
  const mentionedDeadlines = deadlineDatesInLead(lead);
  if (mentionedDeadlines.length > 0 && !lead.deadline) {
    errors.push(`${pathName} 原文出现截止日期 ${mentionedDeadlines.join("、")}，必须同步填写 deadline`);
  } else if (lead.deadline && mentionedDeadlines.length > 0 && !mentionedDeadlines.includes(lead.deadline)) {
    errors.push(`${pathName}.deadline 与原文截止日期 ${mentionedDeadlines.join("、")} 不一致`);
  }
}

function validateSchoolScan(scan, index, sourceById, errors, contactValuePaths) {
  const itemPath = `$.schoolScans[${index}]`;
  if (!requireObject(scan, itemPath, errors)) return;
  assertAllowedKeys(scan, new Set([
    "schoolId", "officialName", "website", "recruitmentOutcome", "recruitmentChannelEvidenceIds", "contacts", "jobLeads", "checkedEvidenceIds", "searchQueries", "unresolved",
  ]), itemPath, errors);
  requireString(scan.schoolId, `${itemPath}.schoolId`, errors);
  requireString(scan.officialName, `${itemPath}.officialName`, errors);

  const website = scan.website;
  if (requireObject(website, `${itemPath}.website`, errors)) {
    assertAllowedKeys(website, new Set(["outcome", "url", "evidenceId", "note"]), `${itemPath}.website`, errors);
    if (!WEBSITE_OUTCOMES.has(website.outcome)) errors.push(`${itemPath}.website.outcome 不受支持`);
    if (website.url != null && (typeof website.url !== "string" || !HTTP_PATTERN.test(website.url))) errors.push(`${itemPath}.website.url 必须为空或 HTTP(S) 地址`);
    requireString(website.note, `${itemPath}.website.note`, errors, { allowEmpty: true });
    const source = website.evidenceId ? sourceById.get(website.evidenceId) : undefined;
    if (website.evidenceId && !source) errors.push(`${itemPath}.website.evidenceId 引用了不存在的来源 ${website.evidenceId}`);
    if (website.outcome === "found") {
      if (!website.url || !source) errors.push(`${itemPath}.website 为 found 时必须提供网址和证据`);
      if (source && (source.sourceLevel !== "A2_school_official" || source.sourceType !== "学校主页" || source.accessState !== "ok")) {
        errors.push(`${itemPath}.website 的证据必须是可访问的 A2 学校主页`);
      }
      if (source && website.url) {
        try {
          if (new URL(website.url).hostname !== new URL(source.url).hostname) errors.push(`${itemPath}.website.url 与官网归属证据域名不一致`);
        } catch { /* URL 格式错误已在上方报告 */ }
      }
    } else if (website.url != null || website.evidenceId != null) {
      errors.push(`${itemPath}.website 非 found 状态不得填写已确认官网网址或证据`);
    }
  }

  if (!RECRUITMENT_OUTCOMES.has(scan.recruitmentOutcome)) errors.push(`${itemPath}.recruitmentOutcome 不受支持`);
  const channelRefs = requireArray(scan.recruitmentChannelEvidenceIds, `${itemPath}.recruitmentChannelEvidenceIds`, errors) ? scan.recruitmentChannelEvidenceIds : [];
  channelRefs.forEach((id) => {
    const source = sourceById.get(id);
    if (!source) errors.push(`${itemPath}.recruitmentChannelEvidenceIds 引用了不存在的来源 ${id}`);
    else if (!isRecruitmentSource(source)) errors.push(`${itemPath}.recruitmentChannelEvidenceIds 的 ${id} 不是招聘来源`);
  });
  assertUnique(channelRefs, `${itemPath}.recruitmentChannelEvidenceIds`, errors);

  const contacts = requireArray(scan.contacts, `${itemPath}.contacts`, errors) ? scan.contacts : [];
  contacts.forEach((contact, contactIndex) => validateContact(contact, `${itemPath}.contacts[${contactIndex}]`, sourceById, errors, contactValuePaths));
  assertUnique(contacts.map((item) => item?.id), `${itemPath}.contacts[].id`, errors);
  const leads = requireArray(scan.jobLeads, `${itemPath}.jobLeads`, errors) ? scan.jobLeads : [];
  leads.forEach((lead, leadIndex) => validateLead(lead, `${itemPath}.jobLeads[${leadIndex}]`, sourceById, errors));
  assertUnique(leads.map((item) => item?.id), `${itemPath}.jobLeads[].id`, errors);

  const checkedRefs = requireArray(scan.checkedEvidenceIds, `${itemPath}.checkedEvidenceIds`, errors) ? scan.checkedEvidenceIds : [];
  checkedRefs.forEach((id) => { if (!sourceById.has(id)) errors.push(`${itemPath}.checkedEvidenceIds 引用了不存在的来源 ${id}`); });
  assertUnique(checkedRefs, `${itemPath}.checkedEvidenceIds`, errors);
  const queries = requireArray(scan.searchQueries, `${itemPath}.searchQueries`, errors) ? scan.searchQueries : [];
  queries.forEach((query, queryIndex) => requireString(query, `${itemPath}.searchQueries[${queryIndex}]`, errors));
  const unresolved = requireArray(scan.unresolved, `${itemPath}.unresolved`, errors) ? scan.unresolved : [];
  unresolved.forEach((item, unresolvedIndex) => requireString(item, `${itemPath}.unresolved[${unresolvedIndex}]`, errors, { allowEmpty: true }));

  if (scan.recruitmentOutcome === "not_found" && (checkedRefs.length === 0 || queries.length === 0)) {
    errors.push(`${itemPath} 标为未发现招聘时，必须记录实际检查页面和搜索词`);
  }
  if (["current_2027_found", "evergreen_found", "historical_found"].includes(scan.recruitmentOutcome) && channelRefs.length === 0 && leads.length === 0) {
    errors.push(`${itemPath} 标为发现招聘，但没有招聘入口或岗位线索`);
  }
  if (scan.recruitmentOutcome === "current_2027_found" && !leads.some((lead) => lead.status === "2027当前") && !channelRefs.some((id) => /2027/.test(sourceById.get(id)?.recruitmentCycle ?? ""))) {
    errors.push(`${itemPath} 标为发现 2027 招聘，但没有 2027 岗位或入口证据`);
  }
  if (scan.recruitmentOutcome === "evergreen_found" && !leads.some((lead) => lead.status === "常年入口") && !channelRefs.some((id) => /常年/.test(sourceById.get(id)?.recruitmentCycle ?? ""))) {
    errors.push(`${itemPath} 标为常年入口，但没有常年证据`);
  }
  if (scan.recruitmentOutcome === "blocked" && !checkedRefs.some((id) => ["blocked", "login_required", "dead"].includes(sourceById.get(id)?.accessState))) {
    errors.push(`${itemPath} 标为页面受阻，但已检查来源没有受阻状态`);
  }
  if (scan.recruitmentOutcome === "qr_only" && !checkedRefs.some((id) => sourceById.get(id)?.accessState === "qr_only")) {
    errors.push(`${itemPath} 标为仅二维码，但已检查来源没有 qr_only 状态`);
  }
}

export function validateRecruitmentScan(data, { targetManifest } = {}) {
  const errors = [];
  if (!requireObject(data, "$", errors)) return errors;
  assertAllowedKeys(data, new Set(["schemaVersion", "isTemplate", "batchId", "province", "city", "researchedAt", "researcher", "sources", "schoolScans", "coverageGaps", "notes"]), "$", errors);
  if (data.schemaVersion !== 1) errors.push("$.schemaVersion 必须为 1");
  if (typeof data.isTemplate !== "boolean") errors.push("$.isTemplate 必须是布尔值");
  if (!requireString(data.batchId, "$.batchId", errors) || !/^[a-z0-9-]+$/.test(data.batchId)) errors.push("$.batchId 只能使用小写英文、数字和连字符");
  requireString(data.province, "$.province", errors);
  requireString(data.city, "$.city", errors);
  if (!(data.city in CITY_PROVINCE)) errors.push(`$.city 不在十四城范围：${String(data.city)}`);
  if (data.city in CITY_PROVINCE && CITY_PROVINCE[data.city] !== data.province) errors.push(`$.province 与城市 ${data.city} 不匹配`);
  if (!validDate(data.researchedAt)) errors.push("$.researchedAt 必须使用 YYYY-MM-DD");
  requireString(data.researcher, "$.researcher", errors);

  const sources = requireArray(data.sources, "$.sources", errors) ? data.sources : [];
  sources.forEach((source, index) => validateSource(source, index, errors));
  assertUnique(sources.map((source) => source?.id), "$.sources[].id", errors);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const scans = requireArray(data.schoolScans, "$.schoolScans", errors) ? data.schoolScans : [];
  const contactValuePaths = new Set();
  scans.forEach((scan, index) => validateSchoolScan(scan, index, sourceById, errors, contactValuePaths));
  assertUnique(scans.map((scan) => scan?.schoolId), "$.schoolScans[].schoolId", errors);

  const gaps = requireArray(data.coverageGaps, "$.coverageGaps", errors) ? data.coverageGaps : [];
  gaps.forEach((gap, index) => {
    const itemPath = `$.coverageGaps[${index}]`;
    if (!requireObject(gap, itemPath, errors)) return;
    assertAllowedKeys(gap, new Set(["schoolId", "description", "evidenceIds", "nextAction"]), itemPath, errors);
    if (gap.schoolId != null) requireString(gap.schoolId, `${itemPath}.schoolId`, errors);
    requireString(gap.description, `${itemPath}.description`, errors);
    const refs = requireArray(gap.evidenceIds, `${itemPath}.evidenceIds`, errors) ? gap.evidenceIds : [];
    refs.forEach((id) => { if (!sourceById.has(id)) errors.push(`${itemPath}.evidenceIds 引用了不存在的来源 ${id}`); });
    assertUnique(refs, `${itemPath}.evidenceIds`, errors);
    requireString(gap.nextAction, `${itemPath}.nextAction`, errors);
  });
  const notes = requireArray(data.notes, "$.notes", errors) ? data.notes : [];
  notes.forEach((note, index) => requireString(note, `$.notes[${index}]`, errors, { allowEmpty: true }));

  if (data.isTemplate === false) {
    if (sources.length === 0) errors.push("正式扫描包至少需要一条来源");
    if (scans.length === 0) errors.push("正式扫描包至少需要一所学校的扫描记录");
    if (targetManifest && targetManifest.city === data.city) {
      const targetById = new Map(targetManifest.schools.map((school) => [school.schoolId, school]));
      const scanById = new Map(scans.map((scan) => [scan.schoolId, scan]));
      for (const target of targetManifest.schools) {
        const scan = scanById.get(target.schoolId);
        if (!scan) errors.push(`缺少目标学校扫描记录：${target.schoolId} ${target.officialName}`);
        else if (scan.officialName !== target.officialName) errors.push(`${target.schoolId} 正式名称与目标清单不一致`);
      }
      for (const scan of scans) if (!targetById.has(scan.schoolId)) errors.push(`扫描包包含目标清单之外的学校：${scan.schoolId}`);
    }
  }
  scanPrivacy(data, "$", errors, contactValuePaths);
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
  return (await Promise.all(entries.map((entry) => collectJsonFiles(path.join(target, entry.name))))).flat();
}

async function loadTargetManifest(manifestPath) {
  if (!manifestPath) return undefined;
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

export function targetManifestPathForCity(city) {
  const slug = TARGET_MANIFEST_SLUGS[city];
  return slug ? `research/handoff/${slug}-targets.json` : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  let manifestPath;
  const requested = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--targets") {
      manifestPath = args[index + 1];
      index += 1;
    } else if (args[index].startsWith("--targets=")) {
      manifestPath = args[index].slice("--targets=".length);
    } else {
      requested.push(args[index]);
    }
  }
  const targets = requested.length > 0 ? requested : ["research/templates/recruitment-scan.template.json", "research/staging/dsh"];
  const files = (await Promise.all(targets.map(collectJsonFiles))).flat().sort();
  if (files.length === 0) {
    console.error("未找到可校验的招聘扫描 JSON");
    process.exitCode = 1;
    return;
  }
  let errorCount = 0;
  for (const file of files) {
    try {
      const data = JSON.parse(await readFile(file, "utf8"));
      const automaticManifestPath = data.isTemplate ? undefined : targetManifestPathForCity(data.city);
      const targetManifest = await loadTargetManifest(manifestPath ?? automaticManifestPath);
      const errors = validateRecruitmentScan(data, { targetManifest });
      if (errors.length === 0) console.log(`OK   ${file}`);
      else {
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
  console.log(`共校验 ${files.length} 个招聘扫描包，发现 ${errorCount} 个问题。`);
  if (errorCount > 0) process.exitCode = 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
