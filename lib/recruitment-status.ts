// 招聘状态计算：把日期事实与公告语义分开，避免旧公告进入当前队列。
import type { PositionRecord, RecruitmentBatch, RecruitmentStatus } from "./recruitment-types.ts";

export function todayInUtc8(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function deriveRecruitmentStatus(
  batch: RecruitmentBatch,
  asOf = todayInUtc8(),
): RecruitmentStatus {
  const basis = batch.statusBasis;
  if (basis === "reference_2026") return "26届参考";
  if (basis === "evergreen") return "常年储备";
  if (batch.deadline && batch.deadline < asOf) return "已截止";
  if (basis === "current_2027" && batch.accepts2027 === "yes") return "27届开放";
  if (basis === "autumn_2027" && ["yes", "possible"].includes(batch.accepts2027)) return "2027秋季开放";
  if (basis === "waiting") return "等待27届";
  return "状态待确认";
}

export function derivePositionStatus(
  position: PositionRecord,
  batch: RecruitmentBatch | undefined,
  asOf = todayInUtc8(),
): RecruitmentStatus {
  const legacyStatus = position.legacy?.status;
  const legacyStates: RecruitmentStatus[] = [
    "27届开放", "2027秋季开放", "常年储备", "等待27届", "26届参考", "已截止", "状态待确认",
  ];
  if (legacyStatus && legacyStates.includes(legacyStatus as RecruitmentStatus)) {
    return legacyStatus as RecruitmentStatus;
  }
  return batch ? deriveRecruitmentStatus(batch, asOf) : "状态待确认";
}

export function verificationHealth(lastVerified: string, asOf = todayInUtc8()) {
  const age = Math.floor((Date.parse(`${asOf}T00:00:00+08:00`) - Date.parse(`${lastVerified}T00:00:00+08:00`)) / 86400000);
  if (age <= 14) return "近期核验" as const;
  if (age <= 30) return "建议复查" as const;
  return "陈旧" as const;
}
