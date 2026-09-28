// 岗位、学校展示用的派生值。从原 page.tsx 抽出，语义保持不变。
import {
  computePrivateFit,
  derivePositionStatus,
  evaluatePublicEligibility,
  type CandidateProfile,
  type PositionRecord,
  type RecruitmentStatus,
  type SchoolRecord,
} from "../recruitment-data";
import { batchById, datasetByCity, evidenceById, schoolById, statusAsOf } from "./data-index";

export type ReviewMark = "mark-ok" | "mark-warn" | "mark-no" | "mark-unknown";

const PUBLIC_EMPLOYMENT = ["事业编制", "员额/备案制", "人员控制数", "高层次人才引进", "公费师范生/专项"];
const SOURCE_RANK: Record<string, number> = { A1_government: 5, A2_school_official: 4, B_university_career: 3, C_recruitment_platform: 2, D_aggregator: 1 };

export function positionStatus(position: PositionRecord): RecruitmentStatus {
  return derivePositionStatus(position, batchById.get(position.batchId), statusAsOf);
}

export function isPublicPosition(position: PositionRecord) {
  const batch = batchById.get(position.batchId);
  const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  return school?.ownership === "公办" || PUBLIC_EMPLOYMENT.includes(batch?.employmentType ?? "");
}

export function positionName(position: PositionRecord) {
  const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  return school?.officialName ?? batchById.get(position.batchId)?.employerName ?? "学校待分配";
}

export function positionOwnership(position: PositionRecord) {
  const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  return school?.ownership ?? "混合或待确认";
}

export function employmentLabel(position: PositionRecord) {
  const batch = batchById.get(position.batchId);
  if (isPublicPosition(position)) return batch?.employmentType ?? "未明确";
  const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  return school?.institutionType === "教育集团/教培" ? "教育集团/教培" : "民办合同";
}

export function salaryText(position: PositionRecord) {
  if (position.salaryAnnualMin != null && position.salaryAnnualMax != null) return `${position.salaryAnnualMin}—${position.salaryAnnualMax} 万/年`;
  if (position.salaryAnnualMin != null) return `${position.salaryAnnualMin} 万/年以上`;
  if (position.salaryAnnualMax != null) return `最高 ${position.salaryAnnualMax} 万/年`;
  return position.salaryBasis === "工资政策" ? "按事业单位工资政策" : "薪资未公开";
}

export function salaryBand(position: PositionRecord, floor: number) {
  if (position.salaryAnnualMin == null && position.salaryAnnualMax == null) return "unknown";
  if ((position.salaryAnnualMin ?? 0) >= floor) return "qualified";
  if ((position.salaryAnnualMax ?? position.salaryAnnualMin ?? 0) >= floor) return "possible";
  return "low";
}

export function housingPositive(position: PositionRecord) {
  return !["无住宿", "未公开"].includes(position.housing.provision);
}

export function applicationLink(position: PositionRecord) {
  return batchById.get(position.batchId)?.applicationUrl ?? position.legacy?.application;
}

export function primaryEvidence(position: PositionRecord) {
  return batchById.get(position.batchId)?.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
}

export function sourceLink(position: PositionRecord) {
  return primaryEvidence(position)?.url ?? applicationLink(position);
}

export function sourceRank(position: PositionRecord) {
  return SOURCE_RANK[primaryEvidence(position)?.sourceLevel ?? "D_aggregator"] ?? 0;
}

export function formatDate(value?: string) {
  if (!value) return "未公开";
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

// 截止日期：有日期显示日期；常年储备和等待公告给出含义，而不是笼统的“未公开”
export function deadlineText(position: PositionRecord, status = positionStatus(position)) {
  const deadline = batchById.get(position.batchId)?.deadline;
  if (deadline) return formatDate(deadline);
  if (status === "常年储备") return "常年招聘";
  if (status === "等待27届") return "待公告";
  return "未公开";
}

export function sourceLevelLabel(level: string) {
  return ({ A1_government: "A1 政府", A2_school_official: "A2 学校", B_university_career: "B 高校", C_recruitment_platform: "C 平台", D_aggregator: "D 聚合" } as Record<string, string>)[level] ?? level;
}

export function statusTone(status: RecruitmentStatus) {
  if (["27届开放", "2027秋季开放"].includes(status)) return "positive";
  if (status === "已截止") return "muted";
  if (status === "常年储备") return "blue";
  return "amber";
}

export function accessStateLabel(state?: string) {
  return ({ ok: "可访问", qr_only: "仅二维码", login_required: "需登录", blocked: "访问受阻", dead: "链接失效" } as Record<string, string>)[state ?? ""] ?? "待确认";
}

export function contactHref(channel: string, value: string) {
  if (channel === "email") return `mailto:${value}`;
  if (channel === "phone") return `tel:${value.replace(/[^\d+]/g, "")}`;
  return undefined;
}

export function contactSummary(school: SchoolRecord) {
  if (!school.recruitmentContacts.length) return "待补";
  if (school.recruitmentContacts.every((contact) => contact.validity === "往届")) return `往届 ${school.recruitmentContacts.length}`;
  const officialCount = school.recruitmentContacts.filter((contact) => ["A1_government", "A2_school_official"].includes(evidenceById.get(contact.evidenceId)?.sourceLevel ?? "")).length;
  if (officialCount) return `官方 ${officialCount}`;
  return `第三方/待确认 ${school.recruitmentContacts.length}`;
}

export function hasA1PoolEvidence(school: SchoolRecord) {
  return school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government");
}

export function citySignal(cityName: string) {
  const dataset = datasetByCity.get(cityName);
  if (!dataset) return { privateCount: 0, positionCount: 0, gapCount: 0 };
  return {
    privateCount: dataset.schools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school)).length,
    positionCount: dataset.positions.length,
    gapCount: dataset.coverageGaps?.length ?? 0,
  };
}

export function requirementText(position: PositionRecord, field: string) {
  return position.requirements.find((item) => item.field === field)?.text;
}

export function reviewMark(position: PositionRecord, eligibility: string | null, fit: number | null): ReviewMark {
  if (eligibility) {
    if (eligibility === "满足公开条件") return "mark-ok";
    if (eligibility === "明确不满足") return "mark-no";
    return "mark-warn";
  }
  if (fit != null) {
    if (fit >= 80) return "mark-ok";
    if (fit >= 60) return "mark-warn";
    return "mark-no";
  }
  const status = positionStatus(position);
  if (["27届开放", "2027秋季开放", "常年储备"].includes(status)) return "mark-ok";
  if (status === "已截止") return "mark-no";
  if (status === "26届参考") return "mark-unknown";
  return "mark-warn";
}

export function reviewLabel(mark: ReviewMark) {
  if (mark === "mark-ok") return "可投";
  if (mark === "mark-warn") return "待确认";
  if (mark === "mark-no") return "不满足";
  return "参考";
}

export type Assessment = {
  publicPosition: boolean;
  fit: number | null;
  eligibility: ReturnType<typeof evaluatePublicEligibility> | null;
  mark: ReviewMark;
  score: number;
};

// 民办用匹配分，公办用报名资格；score 供“匹配 / 资格”排序使用，口径同原实现
export function assess(position: PositionRecord, profile: CandidateProfile): Assessment {
  const publicPosition = isPublicPosition(position);
  const eligibility = publicPosition ? evaluatePublicEligibility(position, profile) : null;
  const fit = publicPosition ? null : computePrivateFit(position, profile);
  const mark = reviewMark(position, eligibility?.state ?? null, fit);
  const score = publicPosition ? (eligibility?.state === "满足公开条件" ? 100 : 60) : (fit ?? 0);
  return { publicPosition, fit, eligibility, mark, score };
}

export function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
