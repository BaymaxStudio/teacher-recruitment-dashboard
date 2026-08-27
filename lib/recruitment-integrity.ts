// 统一收紧学校官网、招聘渠道、联系方式、办学状态和覆盖记录的证据语义。
import type {
  CityDataset,
  CoverageRecordV2,
  EvidenceRef,
  PositionRecord,
  RecruitmentBatch,
  RecruitmentContact,
  SchoolRecord,
} from "./recruitment-types.ts";
import { derivePositionStatus, deriveRecruitmentStatus, todayInUtc8 } from "./recruitment-status.ts";

const RECRUITMENT_SOURCE_TYPES = new Set<EvidenceRef["sourceType"]>([
  "招聘公告",
  "岗位表",
  "资格审查",
  "考试通知",
  "学校招聘页",
  "招聘系统",
  "官方公众号",
  "第三方岗位",
]);

function unique(values: string[]) {
  return [...new Set(values)];
}

function latest(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1);
}

export function isRecruitmentEvidence(evidence: EvidenceRef | undefined) {
  return Boolean(evidence && RECRUITMENT_SOURCE_TYPES.has(evidence.sourceType));
}

function isCurrentActiveEvidence(evidence: EvidenceRef | undefined, asOf: string) {
  if (!evidence || evidence.accessState !== "ok") return false;
  const year = asOf.slice(0, 4);
  if (evidence.publishedAt?.startsWith(`${year}-`)) return true;
  return evidence.sourceLevel === "A2_school_official"
    && evidence.sourceType === "学校主页"
    && evidence.accessedAt.startsWith(`${year}-`);
}

function contactValidity(batch: RecruitmentBatch): RecruitmentContact["validity"] {
  if (batch.statusBasis === "current_2027" || batch.statusBasis === "autumn_2027") return "当前届次";
  if (batch.statusBasis === "evergreen") return "常年";
  if (batch.statusBasis === "reference_2026") return "往届";
  return "时效待确认";
}

function outcomeForPositions(positions: PositionRecord[], batches: Map<string, RecruitmentBatch>, asOf: string) {
  const statuses = positions.map((position) => derivePositionStatus(position, batches.get(position.batchId), asOf));
  if (statuses.includes("27届开放")) return "发现27届岗位" as const;
  if (statuses.includes("常年储备")) return "发现常年入口" as const;
  return "发现往届参考" as const;
}

function outcomeForBatches(batches: RecruitmentBatch[], asOf: string) {
  const statuses = batches.map((batch) => deriveRecruitmentStatus(batch, asOf));
  if (statuses.some((status) => ["27届开放", "2027秋季开放"].includes(status))) return "发现招聘入口" as const;
  if (statuses.includes("常年储备")) return "发现常年入口" as const;
  if (statuses.includes("26届参考")) {
    return "发现往届参考" as const;
  }
  return "发现招聘入口" as const;
}

function normalizeSchool(
  school: SchoolRecord,
  evidenceById: Map<string, EvidenceRef>,
  schoolBatches: RecruitmentBatch[],
  asOf: string,
): SchoolRecord {
  const batchEvidenceIds = unique(schoolBatches.flatMap((batch) => batch.evidenceIds));
  const officialWebsiteEvidence = [school.officialWebsiteEvidenceId, ...batchEvidenceIds]
    .map((id) => id ? evidenceById.get(id) : undefined)
    .find((item) => item?.sourceLevel === "A2_school_official" && item.sourceType === "学校主页");
  const recruitmentChannelEvidenceIds = unique([
    ...(school.recruitmentChannelEvidenceIds ?? []),
    ...batchEvidenceIds.filter((id) => isRecruitmentEvidence(evidenceById.get(id))),
  ]).filter((id) => evidenceById.has(id));
  const derivedContacts: RecruitmentContact[] = schoolBatches.flatMap((batch) => {
    if (!batch.applicationEmail) return [];
    const evidenceId = batch.evidenceIds.find((id) => evidenceById.has(id));
    if (!evidenceId) return [];
    return [{
      id: `contact-${batch.id}-email`,
      channel: "email",
      value: batch.applicationEmail,
      purpose: "简历投递",
      contactIdentity: "未明确",
      recruitmentCycle: batch.recruitmentCycle,
      validity: contactValidity(batch),
      evidenceId,
      lastVerified: batch.lastVerified,
    } satisfies RecruitmentContact];
  });
  const contacts = [...(school.recruitmentContacts ?? []), ...derivedContacts];
  const uniqueContacts = [...new Map(contacts.map((contact) => [contact.id, contact])).values()]
    .filter((contact) => evidenceById.has(contact.evidenceId));
  const activeCandidates = unique([
    ...(school.fieldEvidence?.activeState ?? []),
    ...school.officialPoolEvidenceIds,
    ...(officialWebsiteEvidence ? [officialWebsiteEvidence.id] : []),
  ]);
  const activeEvidenceIds = activeCandidates.filter((id) => isCurrentActiveEvidence(evidenceById.get(id), asOf));
  const activeState = school.activeState === "正常办学" && activeEvidenceIds.length === 0
    ? "待确认"
    : school.activeState;

  return {
    ...school,
    officialWebsite: officialWebsiteEvidence?.url,
    officialWebsiteEvidenceId: officialWebsiteEvidence?.id,
    recruitmentChannelEvidenceIds,
    recruitmentContacts: uniqueContacts,
    activeState,
    fieldEvidence: {
      ...(school.fieldEvidence ?? {}),
      activeState: school.activeState === "正常办学" ? activeEvidenceIds : school.fieldEvidence?.activeState ?? [],
    },
  };
}

function normalizeCoverage(
  school: SchoolRecord,
  existing: CoverageRecordV2 | undefined,
  positions: PositionRecord[],
  schoolBatches: RecruitmentBatch[],
  evidenceById: Map<string, EvidenceRef>,
  asOf: string,
): CoverageRecordV2 {
  const relevantPositionIds = unique([
    ...(existing?.relevantPositionIds ?? []),
    ...positions.map((position) => position.id),
  ]);
  const recruitmentEvidenceIds = unique([
    ...(existing?.searchEvidenceIds ?? []),
    ...school.recruitmentChannelEvidenceIds,
    ...schoolBatches.flatMap((batch) => batch.evidenceIds),
  ]).filter((id) => isRecruitmentEvidence(evidenceById.get(id)));

  let currentOutcome: CoverageRecordV2["currentOutcome"];
  let lastSearchedAt: string | undefined;
  if (positions.length > 0) {
    currentOutcome = outcomeForPositions(positions, new Map(schoolBatches.map((batch) => [batch.id, batch])), asOf);
    lastSearchedAt = latest([
      ...positions.map((position) => position.lastVerified),
      ...recruitmentEvidenceIds.map((id) => evidenceById.get(id)?.accessedAt),
    ]);
  } else if (recruitmentEvidenceIds.length > 0) {
    const sourceStates = recruitmentEvidenceIds.map((id) => evidenceById.get(id)?.accessState);
    if (sourceStates.every((state) => state === "qr_only")) currentOutcome = "仅二维码";
    else if (!sourceStates.includes("ok") && sourceStates.some((state) => ["blocked", "login_required", "dead"].includes(state ?? ""))) {
      currentOutcome = "页面受阻";
    } else currentOutcome = outcomeForBatches(schoolBatches, asOf);
    lastSearchedAt = latest(recruitmentEvidenceIds.map((id) => evidenceById.get(id)?.accessedAt));
  } else if (existing?.legacyOutcomeLabel && /^(?:发现教师入口|发现相关岗位)$/.test(existing.legacyOutcomeLabel)) {
    currentOutcome = "旧线索待复核";
  } else {
    currentOutcome = "待检索";
  }

  return {
    schoolId: school.id,
    city: school.city,
    ...(lastSearchedAt ? { lastSearchedAt } : {}),
    currentOutcome,
    relevantPositionIds,
    searchEvidenceIds: recruitmentEvidenceIds,
    nextReviewHint: existing?.nextReviewHint,
    recordOrigin: existing?.recordOrigin ?? "native_v2",
    legacyOutcomeLabel: existing?.legacyOutcomeLabel,
  };
}

export function normalizeDatasetIntegrity(dataset: CityDataset, asOf = todayInUtc8()): CityDataset {
  const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
  const batchesBySchoolId = new Map<string, RecruitmentBatch[]>();
  for (const batch of dataset.batches) {
    for (const schoolId of batch.schoolIds) {
      batchesBySchoolId.set(schoolId, [...(batchesBySchoolId.get(schoolId) ?? []), batch]);
    }
  }
  const positionsBySchoolId = new Map<string, PositionRecord[]>();
  for (const position of dataset.positions) {
    if (!position.schoolId) continue;
    positionsBySchoolId.set(position.schoolId, [...(positionsBySchoolId.get(position.schoolId) ?? []), position]);
  }
  const existingCoverage = new Map(dataset.coverage.map((record) => [record.schoolId, record]));
  const schools = dataset.schools.map((school) => normalizeSchool(
    school,
    evidenceById,
    batchesBySchoolId.get(school.id) ?? [],
    asOf,
  ));
  const coverage = schools
    .filter((school) => school.institutionType !== "教育集团/教培")
    .map((school) => normalizeCoverage(
      school,
      existingCoverage.get(school.id),
      positionsBySchoolId.get(school.id) ?? [],
      batchesBySchoolId.get(school.id) ?? [],
      evidenceById,
      asOf,
    ));
  return { ...dataset, schools, coverage };
}
