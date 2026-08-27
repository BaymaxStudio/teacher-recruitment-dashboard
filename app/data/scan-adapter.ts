// 将 DSH 招聘扫描暂存资料（research/staging/dsh/）机械映射为正式 V2 增量。
// 只写入由扫描证据支撑的字段；薪资只解析原文显式“X万/年”，免费食宿须原文证据，
// 未公开字段一律不推测；编制性质仅当 A1 来源且公告明确“事业编制”时标记。
import type {
  CityDataset,
  CoverageRecordV2,
  EmploymentType,
  EvidenceRef,
  HousingBenefit,
  MealBenefit,
  PositionRecord,
  RecruitmentBatch,
  RecruitmentContact,
  RequirementRule,
  SchoolRecord,
  SelectionStageV2,
  SubjectTag,
} from "../../lib/recruitment-types.ts";
import { inferWorkloadFromText } from "../../lib/recruitment-normalizers.ts";
import ningboScan from "../../research/staging/dsh/ningbo-recruitment-scan-2026-08-21.json" with { type: "json" };
import wenzhouScan from "../../research/staging/dsh/wenzhou-recruitment-scan-2026-08-21.json" with { type: "json" };
import jiaxingScan from "../../research/staging/dsh/jiaxing-recruitment-scan-2026-08-21.json" with { type: "json" };
import shaoxingScan from "../../research/staging/dsh/shaoxing-recruitment-scan-2026-08-21.json" with { type: "json" };
import suzhouScan from "../../research/staging/dsh/suzhou-recruitment-scan-2026-08-21.json" with { type: "json" };
import hangzhouScan from "../../research/staging/dsh/hangzhou-recruitment-scan-2026-08-21.json" with { type: "json" };
import wuxiScan from "../../research/staging/dsh/wuxi-recruitment-scan-2026-08-21.json" with { type: "json" };
import nanjingScan from "../../research/staging/dsh/nanjing-recruitment-scan-2026-08-21.json" with { type: "json" };

type ScanSource = {
  id: string; title: string; url: string; publisher: string; sourceLevel: EvidenceRef["sourceLevel"];
  sourceType: EvidenceRef["sourceType"]; publishedAt: string | null; accessedAt: string;
  accessState: EvidenceRef["accessState"]; recruitmentCycle: string; note: string;
};
type ScanContact = {
  id: string; channel: RecruitmentContact["channel"]; value: string; purpose: RecruitmentContact["purpose"];
  contactIdentity: RecruitmentContact["contactIdentity"]; recruitmentCycle: string;
  validity: RecruitmentContact["validity"]; evidenceId: string; lastVerified: string;
};
type ScanLead = {
  id: string; title: string; subjectTags: SubjectTag[]; recruitmentCycle: string;
  status: "2027当前" | "常年入口" | "往届参考" | "状态待确认";
  publishedAt: string | null; deadline: string | null; expectedStart: string;
  salaryRaw: string; housingRaw: string; mealsRaw: string; workloadRaw: string[];
  requirementsRaw: string[]; selectionProcessRaw: string[]; applicationMethod: RecruitmentBatch["applicationMethod"];
  applicationUrl: string | null; sourceEvidenceIds: string[]; note: string;
};
type ScanSchool = {
  schoolId: string; officialName: string;
  website: { outcome: "found" | "not_found" | "blocked" | "pending"; url: string | null; evidenceId: string | null; note: string };
  recruitmentOutcome: "current_2027_found" | "evergreen_found" | "historical_found" | "not_found" | "blocked" | "qr_only" | "pending";
  recruitmentChannelEvidenceIds: string[]; contacts: ScanContact[]; jobLeads: ScanLead[];
  checkedEvidenceIds: string[]; searchQueries: string[]; unresolved: string[];
};
type ScanLike = {
  schemaVersion: number; isTemplate: boolean; batchId: string; province: "广东" | "浙江" | "江苏";
  city: string; researchedAt: string; researcher: string;
  sources: ScanSource[]; schoolScans: ScanSchool[]; coverageGaps: Array<{ schoolId: string | null; description: string; evidenceIds: string[]; nextAction: string }>; notes: string[];
};

const verifiedAt = "2026-08-21";
// 覆盖记录的检索证据不得混入学校池或普通官网来源（tests/v2-data 约束）。
const FORBIDDEN_COVERAGE_TYPES = new Set(["学校名单", "教育部门说明", "公办目标依据", "学校主页"]);

const OUTCOME_MAP: Record<ScanSchool["recruitmentOutcome"], CoverageRecordV2["currentOutcome"]> = {
  current_2027_found: "发现招聘入口",
  evergreen_found: "发现常年入口",
  historical_found: "发现往届参考",
  not_found: "本轮未发现",
  blocked: "页面受阻",
  qr_only: "仅二维码",
  pending: "待检索",
};

function parseAnnualSalary(raw: string): { min?: number; max?: number } | null {
  if (!raw) return null;
  const patterns: Array<{ re: RegExp; kind: "range" | "single" | "rangeK" | "singleK" }> = [
    { re: /(\d+(?:\.\d+)?)\s*(?:-|—|–|~|～|至)\s*(\d+(?:\.\d+)?)\s*万\s*\/?\s*年/, kind: "range" },
    { re: /(\d+(?:\.\d+)?)\s*(?:-|—|–|~|～|至)\s*(\d+(?:\.\d+)?)\s*万元/, kind: "range" },
    { re: /(\d+(?:\.\d+)?)\s*(?:-|—|–|~|～|至)\s*(\d+(?:\.\d+)?)\s*W\/年/, kind: "range" },
    { re: /(\d+(?:\.\d+)?)\s*万\s*\/?\s*年薪?/, kind: "single" },
    { re: /(\d+(?:\.\d+)?)\s*万元/, kind: "single" },
    { re: /(\d+(?:\.\d+)?)\s*万\s*起/, kind: "single" },
    { re: /(\d+(?:\.\d+)?)\s*万\s*\+/, kind: "single" },
    { re: /(\d+(?:\.\d+)?)\s*K\s*(?:-|—|–|~|～)\s*(\d+(?:\.\d+)?)\s*K\/月/, kind: "rangeK" },
    { re: /(\d+(?:\.\d+)?)\s*(?:-|—|–|~|～)\s*(\d+(?:\.\d+)?)\s*K\/月/, kind: "rangeK" },
    { re: /(\d+(?:\.\d+)?)\s*K\/月/, kind: "singleK" },
  ];
  for (const { re, kind } of patterns) {
    const m = raw.match(re);
    if (m) {
      if (kind === "rangeK") return { min: Number(m[1]) * 12 / 10, max: Number(m[2]) * 12 / 10 };
      if (kind === "singleK") return { min: Number(m[1]) * 12 / 10 };
      return kind === "range" ? { min: Number(m[1]), max: Number(m[2]) } : { min: Number(m[1]) };
    }
  }
  return null;
}

function fieldOf(text: string): RequirementRule["field"] {
  if (/教资|教师资格/.test(text)) return "teacher_certificate";
  if (/普通话/.test(text)) return "mandarin";
  if (/英语|CET|雅思|托福|口语/.test(text)) return "english";
  if (/年龄|周岁/.test(text)) return "age";
  if (/户籍|生源/.test(text)) return "hukou";
  if (/经验|任教|教学经历/.test(text)) return "experience";
  if (/应届|毕业|届/.test(text)) return "graduate_year";
  if (/学历|学位|本科|硕士|研究生|博士/.test(text)) return "degree";
  if (/专业/.test(text)) return "major";
  if (/党员|政治面貌/.test(text)) return "party_membership";
  if (/海外|国（境）外|留学|认证/.test(text)) return "overseas_degree_authentication";
  return "other";
}

function hardnessOf(text: string): RequirementRule["hardness"] {
  if (/可能|大概|视情况|面议|待定/.test(text)) return "unknown";
  if (/必须|不得|及以上|以下|须|需/.test(text)) return "hard";
  if (/优先|可放宽|可适当/.test(text)) return "preferred";
  return "unknown";
}

function housingOf(raw: string, evidenceId?: string): HousingBenefit {
  if (!raw) {
    return { provision: "未公开", utilitiesIncluded: "unknown", availableDuringVacation: "unknown", familyAllowed: "unknown", evidenceScope: "unverified" };
  }
  let provision: HousingBenefit["provision"] = "提供（费用未公开）";
  if (/免费单间/.test(raw)) provision = "免费单间";
  else if (/免费合住|免费宿舍/.test(raw)) provision = "免费合住";
  else if (/免费/.test(raw) && /公寓|宿舍|住宿|房/.test(raw)) provision = "免费（房型未公开）";
  else if (/人才公寓/.test(raw) && /住房补贴|住房津贴/.test(raw)) provision = "人才公寓或住房补贴";
  else if (/人才公寓/.test(raw)) provision = "人才公寓";
  else if (/住房补贴|住房津贴/.test(raw)) provision = "住房补贴";
  else if (/教师公寓/.test(raw)) provision = "教师公寓";
  else if (/收费/.test(raw) && /宿舍|公寓/.test(raw)) provision = "收费宿舍";
  else if (/无住宿|不提供住宿/.test(raw)) provision = "无住宿";
  return {
    provision, utilitiesIncluded: "unknown", availableDuringVacation: "unknown", familyAllowed: "unknown",
    evidenceId, evidenceScope: "position_general", note: raw,
  };
}

function mealsOf(raw: string, evidenceId?: string): MealBenefit {
  if (!raw) return { provision: "未公开", evidenceScope: "unverified" };
  if (/免费三餐|三餐免费/.test(raw)) return { provision: "免费三餐", coveredMeals: ["早餐", "午餐", "晚餐"], evidenceId, evidenceScope: "position_general", note: raw };
  if (/免费工作餐|免费午餐|自助午餐/.test(raw)) return { provision: "免费工作餐", evidenceId, evidenceScope: "position_general", note: raw };
  if (/免费/.test(raw)) return { provision: "免费（餐次未公开）", evidenceId, evidenceScope: "position_general", note: raw };
  if (/餐补|餐费补贴|午餐补贴/.test(raw)) return { provision: "餐费补贴", evidenceId, evidenceScope: "position_general", note: raw };
  if (/提供餐|包餐|供餐/.test(raw)) return { provision: "提供餐食（费用未公开）", evidenceId, evidenceScope: "position_general", note: raw };
  return { provision: "未公开", evidenceId, evidenceScope: "position_general", note: raw };
}

const STAGE_RULES: Array<[RegExp, string]> = [
  [/简历|投递|报名/, "材料初审"],
  [/笔试/, "笔试"],
  [/试讲|讲课|课堂/, "试讲"],
  [/说课/, "说课"],
  [/面试|面谈/, "面试"],
  [/体检/, "体检"],
  [/考察/, "考察"],
  [/签约|录用|Offer/, "签约"],
];

function stagesOf(raws: string[], cycle: string, evidenceId?: string): SelectionStageV2[] {
  const stages: SelectionStageV2[] = raws.map((line, index) => {
    const hit = STAGE_RULES.find(([re]) => re.test(line));
    return {
      order: index + 1,
      name: hit ? hit[1] : "其他",
      certainty: "partial",
      cycle,
      format: /线上|邮箱|网上/.test(line) ? "线上" : (/现场|来校|线下/.test(line) ? "线下" : "未公开"),
      detail: line,
      ...(evidenceId ? { evidenceId } : {}),
    };
  });
  if (stages.length > 0) return stages;
  return [{
    order: 1, name: "投递或报名", certainty: "unknown", cycle, detail: "选拔流程未公开",
    ...(evidenceId ? { evidenceId } : {}),
  }];
}

function acceptsOf(status: ScanLead["status"]): RecruitmentBatch["accepts2027"] {
  if (status === "2027当前") return "yes";
  if (status === "常年入口") return "possible";
  if (status === "往届参考") return "no";
  return "unknown";
}

function statusBasisOf(status: ScanLead["status"]): RecruitmentBatch["statusBasis"] {
  if (status === "2027当前") return "current_2027";
  if (status === "常年入口") return "evergreen";
  if (status === "往届参考") return "reference_2026";
  return "unknown";
}

function employmentOf(school: SchoolRecord, lead: ScanLead, evidenceById: Map<string, EvidenceRef>): { type: EmploymentType; evidenceId?: string } {
  const a1EvidenceId = lead.sourceEvidenceIds.find((id) => evidenceById.get(id)?.sourceLevel === "A1_government");
  const text = [lead.title, lead.note, ...lead.requirementsRaw, ...lead.selectionProcessRaw].join(" ");
  if (school.ownership === "民办") return { type: "民办学校劳动合同" };
  if (a1EvidenceId && /事业编制|事业编/.test(text)) return { type: "事业编制", evidenceId: a1EvidenceId };
  return { type: "未明确" };
}

function languageOf(text: string): PositionRecord["languageMode"] {
  if (/全英文/.test(text)) return "全英文";
  if (/双语/.test(text)) return "双语";
  if (/英文授课|英语授课/.test(text)) return "双语";
  return "未公开";
}

function positionOf(args: {
  lead: ScanLead; school: SchoolRecord; batch: RecruitmentBatch;
  evidenceById: Map<string, EvidenceRef>; seq: number; cityId: string;
}): PositionRecord {
  const { lead, school, batch, evidenceById, seq, cityId } = args;
  const singleEvidenceId = lead.sourceEvidenceIds.length === 1 ? lead.sourceEvidenceIds[0] : undefined;
  const generalEvidenceId = lead.sourceEvidenceIds[0];
  const text = [lead.title, lead.note, ...lead.requirementsRaw, ...lead.selectionProcessRaw, lead.salaryRaw, lead.housingRaw, lead.mealsRaw].join(" ");
  const salary = parseAnnualSalary(lead.salaryRaw);
  const stage: PositionRecord["stage"] = school.schoolStages.includes("初中") && school.schoolStages.includes("高中")
    ? "初高中"
    : school.schoolStages.includes("初中") ? "初中" : "高中";
  const requirements: RequirementRule[] = lead.requirementsRaw.length > 0
    ? lead.requirementsRaw.map((line) => ({
        field: fieldOf(line), text: line, hardness: hardnessOf(line),
        ...(generalEvidenceId ? { evidenceId: generalEvidenceId } : {}), evidenceScope: "position_general" as const,
      }))
    : [{ field: "other" as const, text: "公告未恢复其他硬性条件，以原文为准", hardness: "unknown" as const, evidenceScope: "unverified" as const }];
  const sourceSummary = lead.sourceEvidenceIds
    .map((id) => evidenceById.get(id)?.title)
    .filter((title): title is string => Boolean(title))
    .join("；");
  return {
    id: `pos-${cityId}-dsh-${seq}`,
    batchId: batch.id,
    schoolId: school.id,
    city: school.city,
    district: school.district,
    stage,
    subjects: lead.subjectTags,
    title: lead.title,
    salaryAnnualMin: salary?.min,
    salaryAnnualMax: salary?.max,
    salaryBasis: /K\/月|元\/月|月薪/.test(lead.salaryRaw) && salary && !/万\/年|万元|年薪/.test(lead.salaryRaw) ? "月薪乘12" : ((/万|W/.test(lead.salaryRaw) && /年/.test(lead.salaryRaw)) || /年薪/.test(lead.salaryRaw) ? "税前年薪" : (/工资政策|事业编制/.test(lead.salaryRaw) ? "工资政策" : "未公开")),
    ...(generalEvidenceId ? { salaryEvidenceId: generalEvidenceId } : {}),
    salaryEvidenceScope: "position_general",
    languageMode: languageOf(text),
    requirements,
    housing: housingOf(lead.housingRaw, generalEvidenceId),
    meals: mealsOf(lead.mealsRaw, generalEvidenceId),
    workload: inferWorkloadFromText(lead.workloadRaw, lead.sourceEvidenceIds, "position_general"),
    selectionStages: stagesOf(lead.selectionProcessRaw, lead.recruitmentCycle, singleEvidenceId),
    sourceSummary: sourceSummary || "岗位线索来源见扫描暂存资料",
    lastVerified: verifiedAt,
  };
}

function evidenceOf(source: ScanSource): EvidenceRef {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    sourceLevel: source.sourceLevel,
    sourceType: source.sourceType,
    publishedAt: source.publishedAt ?? undefined,
    accessedAt: source.accessedAt,
    recruitmentCycle: source.recruitmentCycle || undefined,
    accessState: source.accessState,
    note: source.note || undefined,
  };
}

function applyScan(dataset: CityDataset, scan: ScanLike): CityDataset {
  const schoolById = new Map(dataset.schools.map((school) => [school.id, school]));
  const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
  const addedEvidence: EvidenceRef[] = [];
  for (const source of scan.sources) {
    if (!evidenceById.has(source.id)) {
      const ref = evidenceOf(source);
      evidenceById.set(source.id, ref);
      addedEvidence.push(ref);
    }
  }

  const batchIds = new Set(dataset.batches.map((batch) => batch.id));
  const positionIds = new Set(dataset.positions.map((position) => position.id));
  const coverageBySchoolId = new Map(dataset.coverage.map((record) => [record.schoolId, record]));
  let seq = dataset.positions.length + 1;

  const updatedCoverage: CoverageRecordV2[] = [];
  const addedBatches: RecruitmentBatch[] = [];
  const addedPositions: PositionRecord[] = [];
  const addedContacts: Array<{ schoolId: string; contact: RecruitmentContact }> = [];

  for (const schoolScan of scan.schoolScans) {
    const school = schoolById.get(schoolScan.schoolId);
    if (!school) {
      continue;
    }
    const recruitmentChannelEvidenceIds = schoolScan.recruitmentChannelEvidenceIds.filter((id) => evidenceById.has(id));
    if (schoolScan.website.outcome === "found" && schoolScan.website.url && schoolScan.website.evidenceId && evidenceById.has(schoolScan.website.evidenceId)) {
      school.officialWebsite = schoolScan.website.url;
      school.officialWebsiteEvidenceId = schoolScan.website.evidenceId;
    }
    school.recruitmentChannelEvidenceIds = [...new Set([...school.recruitmentChannelEvidenceIds, ...recruitmentChannelEvidenceIds])];
    const existingContactIds = new Set(school.recruitmentContacts.map((contact) => contact.id));
    for (const contact of schoolScan.contacts) {
      if (!existingContactIds.has(contact.id) && evidenceById.has(contact.evidenceId)) {
        existingContactIds.add(contact.id);
        addedContacts.push({ schoolId: school.id, contact });
      }
    }
    school.lastVerified = verifiedAt;

    const positionIdsForSchool: string[] = [];
    for (const lead of schoolScan.jobLeads) {
      let batchId = `batch-${dataset.cityId}-dsh-${seq}`;
      while (batchIds.has(batchId)) { seq += 1; batchId = `batch-${dataset.cityId}-dsh-${seq}`; }
      batchIds.add(batchId);
      const employment = employmentOf(school, lead, evidenceById);
      const batch: RecruitmentBatch = {
        id: batchId,
        employerName: school.officialName,
        schoolIds: [school.id],
        title: lead.title,
        recruitmentCycle: lead.recruitmentCycle,
        statusBasis: statusBasisOf(lead.status),
        publishedAt: lead.publishedAt ?? undefined,
        deadline: lead.deadline ?? undefined,
        expectedStart: lead.expectedStart || undefined,
        accepts2027: acceptsOf(lead.status),
        employmentType: employment.type,
        ...(employment.evidenceId ? { employmentEvidenceId: employment.evidenceId } : {}),
        applicationMethod: lead.applicationMethod,
        applicationUrl: lead.applicationUrl ?? undefined,
        evidenceIds: lead.sourceEvidenceIds.filter((id) => evidenceById.has(id)),
        lastVerified: verifiedAt,
      };
      addedBatches.push(batch);
      const position = positionOf({ lead, school, batch, evidenceById, seq, cityId: dataset.cityId });
      positionIds.add(position.id);
      positionIdsForSchool.push(position.id);
      addedPositions.push(position);
      seq += 1;
    }

    const outcome = OUTCOME_MAP[schoolScan.recruitmentOutcome] ?? "本轮未发现";
    const searchEvidenceIds = schoolScan.checkedEvidenceIds.filter((id) => {
      const source = evidenceById.get(id);
      return source && !FORBIDDEN_COVERAGE_TYPES.has(source.sourceType);
    });
    const previous = coverageBySchoolId.get(schoolScan.schoolId);
    const updated: CoverageRecordV2 = {
      schoolId: schoolScan.schoolId,
      city: dataset.cityName,
      currentOutcome: outcome,
      relevantPositionIds: [...new Set([...(previous?.relevantPositionIds ?? []), ...positionIdsForSchool])],
      searchEvidenceIds: [...new Set([...(previous?.searchEvidenceIds ?? []), ...searchEvidenceIds])],
      ...(previous?.legacyOutcomeLabel ? { legacyOutcomeLabel: previous.legacyOutcomeLabel } : {}),
      ...(previous?.recordOrigin ? { recordOrigin: previous.recordOrigin } : {}),
    };
    updatedCoverage.push(updated);
  }

  const coverageMap = new Map(dataset.coverage.map((record) => [record.schoolId, record]));
  for (const record of updatedCoverage) coverageMap.set(record.schoolId, record);

  for (const { schoolId, contact } of addedContacts) {
    const school = schoolById.get(schoolId);
    if (school) school.recruitmentContacts.push(contact);
  }

  const addedGaps = scan.coverageGaps.map((gap) => ({
    scope: /官网|访问|验证码|二维码|登录/.test(gap.description) ? "source_access" as const : "recruitment" as const,
    description: gap.description,
    evidenceIds: gap.evidenceIds.filter((id) => evidenceById.has(id)),
    nextAction: gap.nextAction,
  }));

  return {
    ...dataset,
    schools: dataset.schools,
    coverage: [...coverageMap.values()],
    batches: [...dataset.batches, ...addedBatches],
    positions: [...dataset.positions, ...addedPositions],
    evidence: [...dataset.evidence, ...addedEvidence],
    coverageGaps: [...(dataset.coverageGaps ?? []), ...addedGaps],
  };
}

const scans: Array<{ city: string; scan: ScanLike }> = [
  { city: "宁波", scan: ningboScan as unknown as ScanLike },
  { city: "温州", scan: wenzhouScan as unknown as ScanLike },
  { city: "嘉兴", scan: jiaxingScan as unknown as ScanLike },
  { city: "绍兴", scan: shaoxingScan as unknown as ScanLike },
  { city: "苏州", scan: suzhouScan as unknown as ScanLike },
  { city: "杭州", scan: hangzhouScan as unknown as ScanLike },
  { city: "无锡", scan: wuxiScan as unknown as ScanLike },
  { city: "南京", scan: nanjingScan as unknown as ScanLike },
];

export const APPROVED_DSH_SCAN_BATCH_IDS = new Set([
  "hangzhou-dsh-b1",
  "jiaxing-dsh-b1",
  "nanjing-dsh-b1",
  "ningbo-dsh-b1",
  "shaoxing-dsh-b1",
  "suzhou-dsh-b1",
  "wenzhou-dsh-b1",
  "wuxi-dsh-b1",
]);

export function isApprovedDshScanBatchId(batchId: string): boolean {
  return APPROVED_DSH_SCAN_BATCH_IDS.has(batchId);
}

export function applyDshScanIncrements(
  datasets: CityDataset[],
  candidates: Array<{ city: string; scan: ScanLike }> = scans,
): CityDataset[] {
  const byCity = new Map(datasets.map((dataset) => [dataset.cityName, dataset]));
  let result = datasets;
  for (const { city, scan } of candidates.filter(({ scan }) => isApprovedDshScanBatchId(scan.batchId))) {
    const dataset = byCity.get(city);
    if (!dataset) throw new Error(`缺少城市数据集：${city}`);
    result = result.map((item) => (item.cityName === city ? applyScan(item, scan) : item));
  }
  return result;
}
