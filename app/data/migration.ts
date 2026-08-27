// 阶段 A 迁移层：将 V1 扁平数据（jobs / 六城覆盖 / 官方名单来源）转换为 V2 结构化
// CityDataset[]，按城市与数据类别组织。所有 V1 原文保留在 PositionRecord.legacy 中，
// 不静默丢失任何字段。结构化字段（住宿、餐食、工作量、选拔环节、硬性条件）为基于 V1 文本的
// 最佳努力映射，原文均由 legacy 保留，供阶段 B/C 复核。
import type {
  CityDataset,
  SchoolRecord,
  RecruitmentBatch,
  PositionRecord,
  EvidenceRef,
  CoverageRecordV2,
  EmploymentType,
  InstitutionType,
  SubjectTag,
  UnknownState,
  RequirementRule,
  HousingBenefit,
  MealBenefit,
  EvidenceScope,
} from "../../lib/recruitment-types.ts";
import { inferWorkloadFromText } from "../../lib/recruitment-normalizers.ts";
import type { JobRecord, CoverageRecord } from "./legacy.ts";
import {
  jobs,
  shenzhenCoverage,
  guangzhouCoverage,
  dongguanCoverage,
  foshanCoverage,
  huizhouCoverage,
  zhuhaiCoverage,
  officialShenzhenPoolSource,
  officialGuangzhouPoolSource,
  officialDongguanPoolSource,
  officialFoshanPoolSource,
  officialHuizhouPoolSource,
  officialZhuhaiPoolSource,
} from "./legacy.ts";

const LAST_VERIFIED = "2026-08-14";

// ---------------------------------------------------------------------------
// 学校别名：V1 岗位校名 -> 覆盖池官方名的显式映射。
// 只收录确认同校的写法差异（前缀、国际部、旧名）；不做全局字符串删除，
// 未列出的相近名称一律视为不同学校，宁多勿错。
// ---------------------------------------------------------------------------
const SCHOOL_ALIASES: Record<string, string> = {
  // 深圳：行政前缀差异
  "万科梅沙书院": "深圳市万科梅沙书院",
  "桃源居中澳实验学校": "深圳市桃源居中澳实验学校",
  "松岗中英文实验学校": "深圳市松岗中英文实验学校",
  // 深圳：国际部并入本校
  "深圳市汉开数理高中（国际部）": "深圳市汉开数理高中",
  // 广州：行政前缀差异
  "广州华美英语实验学校": "广州市华美英语实验学校",
  // 佛山：旧名（广东实验中学顺德学校已更名东逸湾实验学校）
  "广东实验中学顺德学校（东逸湾实验学校）": "佛山市顺德区东逸湾实验学校",
  // 东莞：高中部与凤岗天安校区为同一办学主体
  "南城御花苑外国语学校高中部": "东莞市南城御花苑外国语学校（凤岗天安校区）",
};

function canonicalSchoolName(name: string): string {
  return SCHOOL_ALIASES[name] ?? name;
}

const CITY_CONFIG: Array<{
  cityId: string;
  cityName: string;
  coverage: CoverageRecord[];
  poolSourceUrl: string;
}> = [
  { cityId: "shenzhen", cityName: "深圳", coverage: shenzhenCoverage, poolSourceUrl: officialShenzhenPoolSource },
  { cityId: "guangzhou", cityName: "广州", coverage: guangzhouCoverage, poolSourceUrl: officialGuangzhouPoolSource },
  { cityId: "dongguan", cityName: "东莞", coverage: dongguanCoverage, poolSourceUrl: officialDongguanPoolSource },
  { cityId: "foshan", cityName: "佛山", coverage: foshanCoverage, poolSourceUrl: officialFoshanPoolSource },
  { cityId: "huizhou", cityName: "惠州", coverage: huizhouCoverage, poolSourceUrl: officialHuizhouPoolSource },
  { cityId: "zhuhai", cityName: "珠海", coverage: zhuhaiCoverage, poolSourceUrl: officialZhuhaiPoolSource },
];

const SUBJECT_TAGS: SubjectTag[] = ["政治/道法", "经济/商科", "全球视野/社科", "历史/人文", "其他"];
function toSubjectTag(tag: string): SubjectTag {
  return (SUBJECT_TAGS as string[]).includes(tag) ? (tag as SubjectTag) : "其他";
}

function inferStage(roles: string[]): "初中" | "高中" | "初高中" | "未公开" {
  const joined = roles.join(" ");
  const junior = /初中/.test(joined);
  const senior = /高中/.test(joined);
  if (junior && senior) return "初高中";
  if (junior) return "初中";
  if (senior) return "高中";
  return "未公开";
}

function schoolStagesFromRoles(roles: string[]): Array<"初中" | "高中"> {
  const joined = roles.join(" ");
  const stages: Array<"初中" | "高中"> = [];
  if (/初中/.test(joined)) stages.push("初中");
  if (/高中/.test(joined)) stages.push("高中");
  return stages;
}

function institutionTypeOf(job: JobRecord): InstitutionType {
  if (job.orgType === "教育集团/教培") return "教育集团/教培";
  if (/国际/.test(job.schoolType)) return "国际课程学校";
  return "民办中学";
}

function sourceLevelOf(level: string): EvidenceRef["sourceLevel"] {
  if (level === "A") return "A2_school_official";
  if (level === "B") return "B_university_career";
  if (level === "C") return "C_recruitment_platform";
  return "D_aggregator";
}

function sourceTypeOf(level: string, title: string, url: string): EvidenceRef["sourceType"] {
  if (level === "A") {
    if (/联系/.test(title) || /\/(?:contact|contact-us)(?:\/|\.|\?|$)/i.test(url)) return "联系方式页";
    return /招聘|岗位|职位|公告|校招|人才|教师/.test(title)
      || /\/(?:job|jobs|recruit|recruitment|career|join)(?:\/|\.|\?|$)/i.test(url)
      ? "学校招聘页"
      : "学校主页";
  }
  if (level === "B") return "招聘公告";
  return "第三方岗位";
}

function publisherFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "未注明";
  }
}

// ---------------------------------------------------------------------------
// 食宿语义（修正四）：住宿与餐食分别解析。
// 规则：
// - “免费”结论只认原文明确写“免费”且涉及该字段（免费食宿/免费住宿/免费教师公寓 -> 免费住宿；
//   免费三餐/免费工作餐/免费餐食 -> 免费餐食）。
// - 免费餐食不得推断免费住宿；住房补贴优先保留为住房补贴。
// - “提供住宿/提供食宿/校方住宿”费用未知 -> 独立状态“提供（费用未公开）”。
// - “提供餐食/工作餐/工作日餐食”费用未知 -> 独立状态“提供餐食（费用未公开）”。
// - “免费食宿”同时生成免费住宿与免费餐食，房型、餐次仍标未公开。
// - V1 迁移只把来源标为岗位一般证据，不冒充字段直接证据；阶段 B/C 再逐字段核验。
// ---------------------------------------------------------------------------

function primaryPositionEvidenceId(evidence: EvidenceRef[]): string | undefined {
  // 优先选择标题明确指向招聘、岗位或公告的来源，再比较来源等级；普通官网只作后备。
  const order: Record<EvidenceRef["sourceLevel"], number> = {
    A1_government: 0,
    A2_school_official: 1,
    B_university_career: 2,
    C_recruitment_platform: 3,
    D_aggregator: 4,
  };
  const specific = evidence.filter((item) => /招聘|岗位|职位|公告|校招|人才|教师/.test(item.title));
  const candidates = specific.length > 0 ? specific : evidence;
  let best: EvidenceRef | undefined;
  for (const item of candidates) {
    if (!best || order[item.sourceLevel] < order[best.sourceLevel]) best = item;
  }
  return best?.id;
}

function evidenceMeta(evidenceId?: string): { evidenceId?: string; evidenceScope: EvidenceScope } {
  return evidenceId
    ? { evidenceId, evidenceScope: "position_general" }
    : { evidenceScope: "unverified" };
}

function inferHousing(job: JobRecord, evidenceId?: string): HousingBenefit {
  const text = job.benefits.join(" ");
  const note = job.benefits.join("；") || "未公开";
  const base = {
    utilitiesIncluded: "unknown" as UnknownState,
    availableDuringVacation: "unknown" as UnknownState,
    familyAllowed: "unknown" as UnknownState,
    ...evidenceMeta(evidenceId),
  };
  // 免费住宿：原文明确“免费”且涉及住宿。“免费餐食”不属于住宿证据。
  if (/免费食宿|免费住宿|免费教师公寓/.test(text)) {
    return { provision: "免费（房型未公开）", ...base, note: `房型与费用细则未公开；原文：${note}` };
  }
  // 原文给出备选方案时保留备选关系，不擅自确定人才公寓或住房补贴中的一种。
  if (/人才公寓\s*(?:或|\/|、)\s*住房(?:补贴|津贴)|住房(?:补贴|津贴)\s*(?:或|\/|、)\s*人才公寓/.test(text)) {
    return { provision: "人才公寓或住房补贴", ...base, note: `具体方案待校方确认；原文：${note}` };
  }
  // 住房补贴优先保留为住房补贴（即使同时出现“免费餐食”）。
  if (/住房补贴|住房津贴/.test(text)) {
    return { provision: "住房补贴", ...base, note: `原文：${note}` };
  }
  if (/人才公寓/.test(text)) {
    return { provision: "人才公寓", ...base, note: `原文：${note}` };
  }
  if (/教师公寓|员工宿舍/.test(text)) {
    return { provision: "教师公寓", ...base, note: `费用未公开；原文：${note}` };
  }
  // 提供住宿但费用未知：独立状态，不得写成教师公寓或免费。
  if (/提供食宿|提供住宿|包住宿|校方住宿/.test(text)) {
    return { provision: "提供（费用未公开）", ...base, note: `是否免费未确认；原文：${note}` };
  }
  if (job.boarding === true) {
    return { provision: "未公开", ...base, note: "寄宿制学校；员工住宿未公开" };
  }
  return { provision: "未公开", ...base, note };
}

function inferMeals(job: JobRecord, evidenceId?: string): MealBenefit {
  const text = job.benefits.join(" ");
  const note = job.benefits.join("；") || "未公开";
  const evidence = evidenceMeta(evidenceId);
  if (/免费三餐/.test(text)) return { provision: "免费三餐", ...evidence, note: `原文：${note}` };
  if (/免费工作餐/.test(text)) return { provision: "免费工作餐", ...evidence, note: `原文：${note}` };
  // “免费食宿”“免费餐食”能确认免费，但餐次覆盖未公开。
  if (/免费食宿|免费餐食|免费餐|免费伙食|餐食免费|伙食免费/.test(text)) {
    return { provision: "免费（餐次未公开）", ...evidence, note: `免费但餐次未公开；原文：${note}` };
  }
  if (/餐费补贴|餐补|用餐补贴|三餐补贴/.test(text)) return { provision: "餐费补贴", ...evidence, note: `原文：${note}` };
  if (/食堂自费/.test(text)) return { provision: "食堂自费", ...evidence, note: `原文：${note}` };
  // 提供餐食但费用未知：独立状态，不得写成免费工作餐。
  if (/提供食宿|提供餐食|提供膳食|工作日餐食|工作餐|包餐|提供伙食/.test(text)) {
    return { provision: "提供餐食（费用未公开）", ...evidence, note: `是否免费未确认；原文：${note}` };
  }
  return { provision: "未公开", ...evidence, note };
}

// ---------------------------------------------------------------------------
// 硬性条件推断（修正五）：
// - 公告明确要求 -> hard；“优先/偏好/可放宽” -> preferred；
// - “未公开/待确认/按岗位审核/按学段核验/旧公告” -> unknown，不得用作淘汰条件。
// ---------------------------------------------------------------------------
const REQUIREMENT_UNKNOWN_PATTERN = /未公开|待确认|需确认|按岗位审核|按学段核验|按职位核验|待校方确认|旧要求|旧公告|无政治或经济岗位|未写死|没有写死|未明确|可能接受|可能放宽|也可考虑|可考虑|整体偏成熟|存在矛盾|相互矛盾|平台标注.*描述要求|描述要求.*平台标注/;
const REQUIREMENT_PREFERRED_PATTERN = /优先|偏好|加分|可放宽|可协商/;
const EXPERIENCE_ELIGIBILITY_ONLY_PATTERN = /^(?:欢迎)?(?:优秀)?应届|应届生(?:与在职教师)?(?:均)?可报|面向.*应届|应届或往届均可|优秀毕业生可报|202[5-9](?:届|\/202[5-9]届).*应届毕业生|2026—2027届毕业生|^2027届$|^27届提前批$/;
const EXPERIENCE_CONTENT_PATTERN = /经验|教龄|毕业班|班主任|带班|把关|lead teacher/i;

function requirementHardness(text: string): RequirementRule["hardness"] {
  if (REQUIREMENT_UNKNOWN_PATTERN.test(text)) return "unknown";
  if (REQUIREMENT_PREFERRED_PATTERN.test(text)) return "preferred";
  return "hard";
}

function makeRequirement(field: RequirementRule["field"], text: string, evidenceId?: string): RequirementRule {
  return {
    field,
    text,
    hardness: requirementHardness(text),
    evidenceId,
    evidenceScope: evidenceId ? "position_general" : "unverified",
  };
}

function inferRequirements(job: JobRecord, evidenceId?: string): RequirementRule[] {
  const rules: RequirementRule[] = [
    makeRequirement("degree", job.degree, evidenceId),
    makeRequirement("major", job.major, evidenceId),
    makeRequirement("teacher_certificate", job.certificate, evidenceId),
  ];
  if (
    job.experience
    && EXPERIENCE_CONTENT_PATTERN.test(job.experience)
    && !/不限|经验不限/.test(job.experience)
    && !EXPERIENCE_ELIGIBILITY_ONLY_PATTERN.test(job.experience)
  ) {
    rules.push(makeRequirement("experience", job.experience, evidenceId));
  }
  return rules;
}

function inferSalaryBasis(job: JobRecord): PositionRecord["salaryBasis"] {
  if (job.salaryMin == null && job.salaryMax == null) return "未公开";
  return /月薪/.test(job.salaryNote) ? "月薪乘12" : "税前年薪";
}

function inferEmploymentType(job: JobRecord): EmploymentType {
  return job.orgType === "教育集团/教培" ? "教育集团/教培" : "民办学校劳动合同";
}

function inferAccepts2027(status: string): RecruitmentBatch["accepts2027"] {
  if (status === "27届开放") return "yes";
  if (status === "已截止" || status === "26届参考") return "no";
  return "possible"; // 等待27届 / 常年储备
}

function inferStatusBasis(status: string): RecruitmentBatch["statusBasis"] {
  if (status === "27届开放") return "current_2027";
  if (status === "2027秋季开放") return "autumn_2027";
  if (status === "常年储备") return "evergreen";
  if (status === "26届参考" || status === "已截止") return "reference_2026";
  if (status === "等待27届") return "waiting";
  return "unknown";
}

function inferRecruitmentCycle(status: string): string {
  switch (status) {
    case "27届开放": return "2027届秋招";
    case "等待27届": return "2027届秋招（待开放）";
    case "常年储备": return "常年储备";
    case "26届参考": return "2026届参考";
    case "已截止": return "已截止";
    default: return status;
  }
}

function applicationMethodOf(job: JobRecord): RecruitmentBatch["applicationMethod"] {
  const processText = [job.applicationNote, ...job.stages.flatMap((stage) => [stage.name, stage.detail])].join(" ");
  const qrOnly = /扫码网申|二维码入口|页面要求扫码/.test(processText)
    && !/邮箱投递或扫码|邮箱.*扫码|扫码.*邮箱/.test(processText);
  if (qrOnly) return "qr";
  if (job.email && /邮箱|邮件/.test(processText)) return "email";
  if (job.application) return "web";
  if (job.email) return "email";
  return "unknown";
}

const KNOWN_LINK_ACCESS = new Map<string, { state: EvidenceRef["accessState"]; note: string }>([
  ["http://hz.jrzp.com/main/job/jobDetails.aspx?pid=2255829", { state: "blocked", note: "2026-08-21最终链接检查超时。" }],
  ["https://job.x3cn.com/notice/2848", { state: "blocked", note: "2026-08-21最终链接检查连接失败；同岗位的高校就业网来源仍可访问。" }],
  ["https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_11931122.html", { state: "blocked", note: "2026-08-21链接检查发现TLS/证书异常。" }],
  ["https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_12635476.html", { state: "blocked", note: "2026-08-21链接检查发现TLS/证书异常。" }],
  ["https://www.hankaischool.com/tzgg/", { state: "blocked", note: "2026-08-21链接检查返回HTTP异常。" }],
  ["https://www.szdt821.com/wap/index.php?c=job&a=comapply&id=55185", { state: "login_required", note: "2026-08-21链接检查触发登录或反爬限制。" }],
  ["https://www.szdt821.com/wap/index.php?c=job&a=comapply&id=62735", { state: "login_required", note: "2026-08-21链接检查触发登录或反爬限制。" }],
]);

function migrateSources(job: JobRecord): EvidenceRef[] {
  const applicationMethod = applicationMethodOf(job);
  return job.sources.map((source, index) => {
    const knownAccess = KNOWN_LINK_ACCESS.get(source.url);
    return {
      id: `ev-${job.id}-${index}`,
      title: source.label,
      url: source.url,
      publisher: publisherFromUrl(source.url),
      sourceLevel: sourceLevelOf(source.level),
      sourceType: sourceTypeOf(source.level, source.label, source.url),
      accessedAt: job.lastVerified,
      accessState: applicationMethod === "qr" && source.url === job.application ? "qr_only" : knownAccess?.state ?? "ok",
      note: knownAccess?.note,
    };
  });
}

function migrateJob(job: JobRecord, schoolId: string, batchId: string, evidence: EvidenceRef[]): PositionRecord {
  const primaryEvidenceId = primaryPositionEvidenceId(evidence);
  const cityForPosition = job.city === "顺德" ? "佛山" : job.city === "多城市" ? null : job.city;
  const districtForPosition = job.city === "顺德" ? "顺德" : job.district;
  return {
    id: job.id,
    batchId,
    schoolId,
    city: cityForPosition,
    district: districtForPosition,
    stage: inferStage(job.roles),
    subjects: (job.roleTags ?? []).map(toSubjectTag),
    title: job.roles.join("/"),
    salaryAnnualMin: job.salaryMin,
    salaryAnnualMax: job.salaryMax,
    salaryBasis: inferSalaryBasis(job),
    salaryEvidenceId: primaryEvidenceId && (job.salaryMin != null || job.salaryMax != null) ? primaryEvidenceId : undefined,
    salaryEvidenceScope: primaryEvidenceId && (job.salaryMin != null || job.salaryMax != null) ? "position_general" : "unverified",
    languageMode: job.languageMode,
    requirements: inferRequirements(job, primaryEvidenceId),
    housing: inferHousing(job, primaryEvidenceId),
    meals: inferMeals(job, primaryEvidenceId),
    workload: inferWorkloadFromText(
      job.workload,
      primaryEvidenceId ? [primaryEvidenceId] : [],
      primaryEvidenceId ? "position_general" : "unverified",
    ),
    selectionStages: job.stages.map((stage, index) => ({
      order: index + 1,
      name: stage.name,
      certainty: stage.certainty === "已明确" ? "confirmed" : stage.certainty === "部分公开" ? "partial" : "unknown",
      cycle: stage.cycle ?? "",
      detail: stage.detail,
    })),
    sourceSummary: job.summary,
    lastVerified: job.lastVerified,
    legacyFitScore: job.fitScore,
    legacy: {
      city: job.city,
      orgType: job.orgType,
      schoolType: job.schoolType,
      curricula: job.curricula,
      roles: job.roles,
      freshGraduate: job.freshGraduate,
      degree: job.degree,
      major: job.major,
      certificate: job.certificate,
      language: job.language,
      experienceYears: job.experienceYears,
      experience: job.experience,
      salaryNote: job.salaryNote,
      benefits: job.benefits,
      workloadNotes: job.workload,
      boarding: job.boarding,
      writtenTest: job.writtenTest,
      demoLesson: job.demoLesson,
      onlinePossible: job.onlinePossible,
      certificateRisk: job.certificateRisk,
      majorRisk: job.majorRisk,
      languageRisk: job.languageRisk,
      experienceRisk: job.experienceRisk,
      preparationCost: job.preparationCost,
      materials: job.materials,
      application: job.application,
      email: job.email,
      applicationNote: job.applicationNote,
      summary: job.summary,
      reviewHint: job.reviewHint,
      status: job.status,
      published: job.published,
      deadline: job.deadline,
      start: job.start,
    },
  };
}

function makeSchool(record: {
  id: string;
  city: string;
  district: string;
  officialName: string;
  institutionType: InstitutionType;
  ownership: SchoolRecord["ownership"];
  schoolStages: Array<"初中" | "高中">;
  curricula: string[];
  boarding: boolean | null;
  lastVerified: string;
}): SchoolRecord {
  return {
    id: record.id,
    province: "广东",
    city: record.city,
    district: record.district,
    officialName: record.officialName,
    aliasNames: [],
    institutionType: record.institutionType,
    ownership: record.ownership,
    schoolStages: record.schoolStages,
    curricula: record.curricula,
    boardingSchool: record.boarding === true ? "yes" : record.boarding === false ? "no" : "unknown",
    recruitmentChannelEvidenceIds: [],
    recruitmentContacts: [],
    // 覆盖池学校由调用方回填官方名单证据；仅岗位来源的学校保持空数组（字段必须有）。
    officialPoolEvidenceIds: [],
    activeState: "待确认",
    lastVerified: record.lastVerified,
  };
}

// ---------------------------------------------------------------------------
// 覆盖状态映射（修正二）：只有关联岗位明确为“27届开放”时才能写“发现27届岗位”。
// 常年储备 -> 发现常年入口；等待27届/26届参考/已截止 -> 发现往届参考；
// 无关联岗位且旧线索不足以定届次 -> 保留“旧线索待复核”，不作为当前招聘结论。
// ---------------------------------------------------------------------------
function coverageOutcomeOf(legacyOutcome: string, positionStatuses: string[]): CoverageRecordV2["currentOutcome"] {
  const hasPositions = positionStatuses.length > 0;
  if (positionStatuses.includes("27届开放")) return "发现27届岗位";
  if (hasPositions && positionStatuses.includes("常年储备")) return "发现常年入口";
  if (hasPositions) return "发现往届参考";
  if (legacyOutcome === "发现教师入口" || legacyOutcome === "发现相关岗位") return "旧线索待复核";
  return "待检索";
}

function buildCityDataset(config: (typeof CITY_CONFIG)[number]): CityDataset {
  const { cityId, cityName, coverage, poolSourceUrl } = config;

  // 1) 覆盖池学校 -> SchoolRecord（含未检索到岗位的学校，保证覆盖视图完整）
  const schoolByName = new Map<string, SchoolRecord>();
  const schoolById = new Map<string, SchoolRecord>();
  const coverageV2: CoverageRecordV2[] = [];
  coverage.forEach((cov, index) => {
    const id = `sch-${cityId}-${index}`;
    const school = makeSchool({
      id,
      city: cityName,
      district: cov.district ?? "",
      officialName: cov.name,
      institutionType: "民办中学",
      ownership: "民办",
      schoolStages: ["高中"],
      curricula: [],
      boarding: cov.boarding === "全住宿" ? true : cov.boarding === "走读" ? false : null,
      lastVerified: LAST_VERIFIED,
    });
    school.officialPoolEvidenceIds = [`ev-pool-${cityId}`];
    school.fieldEvidence = {
      officialName: [`ev-pool-${cityId}`],
      ownership: [`ev-pool-${cityId}`],
      schoolStages: [`ev-pool-${cityId}`],
      district: [`ev-pool-${cityId}`],
      activeState: [],
    };
    schoolByName.set(cov.name, school);
    schoolById.set(id, school);
    coverageV2.push({
      schoolId: id,
      city: cityName,
      currentOutcome: "待检索", // 步骤 4 按关联岗位状态回填
      relevantPositionIds: [],
      searchEvidenceIds: [],
      recordOrigin: "v1_migration",
      legacyOutcomeLabel: cov.outcome,
    });
  });

  // 2) 官方名单来源 -> EvidenceRef（A1 政府官方）
  const poolEvidence: EvidenceRef = {
    id: `ev-pool-${cityId}`,
    title: `${cityName}官方民办普高名单`,
    url: poolSourceUrl,
    publisher: publisherFromUrl(poolSourceUrl),
    sourceLevel: "A1_government",
    sourceType: "学校名单",
    accessedAt: LAST_VERIFIED,
    accessState: "ok",
  };

  // 3) 岗位（顺德归入佛山；校名经别名映射归并到覆盖池学校）
  const positions: PositionRecord[] = [];
  const batches: RecruitmentBatch[] = [];
  const evidence: EvidenceRef[] = [poolEvidence];
  const positionIdsBySchoolId = new Map<string, string[]>();
  const jobsForCity = jobs.filter((job) => job.city === cityName || (cityName === "佛山" && job.city === "顺德"));
  for (const job of jobsForCity) {
    const canonicalName = canonicalSchoolName(job.school);
    let school = schoolByName.get(canonicalName);
    if (!school) {
      const id = `sch-pos-${job.id}`;
      school = makeSchool({
        id,
        city: cityName,
        district: job.city === "顺德" ? "顺德" : job.district,
        officialName: job.school,
        institutionType: institutionTypeOf(job),
        ownership: job.orgType === "教育集团/教培" ? "混合或待确认" : "民办",
        schoolStages: schoolStagesFromRoles(job.roles),
        curricula: job.curricula,
        boarding: job.boarding,
        lastVerified: job.lastVerified,
      });
      if (canonicalName !== job.school) school.aliasNames.push(job.school);
      schoolByName.set(canonicalName, school);
      schoolById.set(id, school);
    } else {
      if (canonicalName !== job.school && !school.aliasNames.includes(job.school)) school.aliasNames.push(job.school);
      school.schoolStages = [...new Set([...school.schoolStages, ...schoolStagesFromRoles(job.roles)])];
      if (school.curricula.length === 0) school.curricula = job.curricula;
    }

    const jobEvidence = migrateSources(job);
    evidence.push(...jobEvidence);
    const batchId = `batch-${job.id}`;
    const batch: RecruitmentBatch = {
      id: batchId,
      employerName: job.school,
      schoolIds: [school.id],
      title: `${job.roles.join("/")} 招聘`,
      recruitmentCycle: inferRecruitmentCycle(job.status),
      statusBasis: inferStatusBasis(job.status),
      accepts2027: inferAccepts2027(job.status),
      employmentType: inferEmploymentType(job),
      applicationMethod: applicationMethodOf(job),
      applicationUrl: job.application || undefined,
      applicationEmail: job.email || undefined,
      evidenceIds: jobEvidence[0] ? [jobEvidence[0].id] : [],
      lastVerified: job.lastVerified,
    };
    batches.push(batch);
    const position = migrateJob(job, school.id, batchId, jobEvidence);
    positions.push(position);

    const ids = positionIdsBySchoolId.get(school.id) ?? [];
    ids.push(position.id);
    positionIdsBySchoolId.set(school.id, ids);
  }

  // 4) 按关联岗位状态回填覆盖记录的 currentOutcome 与 relevantPositionIds
  for (const cov of coverageV2) {
    const school = schoolById.get(cov.schoolId);
    if (!school) continue;
    const relevantIds = positionIdsBySchoolId.get(school.id) ?? [];
    cov.relevantPositionIds = relevantIds;
    const statuses = relevantIds
      .map((positionId) => positions.find((position) => position.id === positionId)?.legacy?.status)
      .filter((status): status is string => typeof status === "string");
    cov.currentOutcome = coverageOutcomeOf(cov.legacyOutcomeLabel ?? "本轮未发现相关岗位", statuses);
  }

  return {
    cityId,
    cityName,
    province: "广东",
    schools: [...schoolByName.values()],
    coverage: coverageV2,
    batches,
    positions,
    evidence,
    outcomes: [], // 阶段 B/C 接入官方录用公示后填充；本阶段仅准备接口
    poolSourceUrl,
  };
}

export function buildCityDatasets(): CityDataset[] {
  return CITY_CONFIG.map(buildCityDataset);
}

// 教培“多城市”岗位：city 为 null，不归入任何单城 CityDataset。
// 修正一：除 position 外同步生成完整的机构（school）、批次（batch）与证据（evidence）记录。
export function buildMultiCityDataset(): CityDataset {
  const schools: SchoolRecord[] = [];
  const batches: RecruitmentBatch[] = [];
  const positions: PositionRecord[] = [];
  const evidence: EvidenceRef[] = [];
  for (const job of jobs.filter((item) => item.city === "多城市")) {
    const schoolId = `sch-pos-${job.id}`;
    const school = makeSchool({
      id: schoolId,
      city: "多城市",
      district: "",
      officialName: job.school,
      institutionType: institutionTypeOf(job),
      // 教育集团/教培机构不是民办中学，办学性质按“混合或待确认”处理。
      ownership: job.orgType === "教育集团/教培" ? "混合或待确认" : "民办",
      schoolStages: schoolStagesFromRoles(job.roles),
      curricula: job.curricula,
      boarding: job.boarding,
      lastVerified: job.lastVerified,
    });
    schools.push(school);

    const jobEvidence = migrateSources(job);
    evidence.push(...jobEvidence);
    const batchId = `batch-${job.id}`;
    batches.push({
      id: batchId,
      employerName: job.school,
      schoolIds: [schoolId],
      title: `${job.roles.join("/")} 招聘`,
      recruitmentCycle: inferRecruitmentCycle(job.status),
      statusBasis: inferStatusBasis(job.status),
      accepts2027: inferAccepts2027(job.status),
      employmentType: inferEmploymentType(job),
      applicationMethod: applicationMethodOf(job),
      applicationUrl: job.application || undefined,
      applicationEmail: job.email || undefined,
      evidenceIds: jobEvidence[0] ? [jobEvidence[0].id] : [],
      lastVerified: job.lastVerified,
    });
    positions.push(migrateJob(job, schoolId, batchId, jobEvidence));
  }
  return {
    cityId: "multi-city",
    cityName: "多城市（教育集团/教培）",
    province: "广东",
    schools,
    coverage: [],
    batches,
    positions,
    evidence,
    outcomes: [],
  };
}
