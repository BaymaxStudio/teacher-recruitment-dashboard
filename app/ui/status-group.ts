// 状态条的分组规则：默认视图只列出还能采取行动的岗位，往届和已截止的只作参考。
import type { RecruitmentStatus } from "../../lib/recruitment-types.ts";

export type StatusKey = "open" | "rolling" | "waiting" | "unknown" | "past" | "closed";
export type StatusFilter = "actionable" | "reference" | "all" | StatusKey;

export const STATUS_KEYS: Record<StatusKey, { label: string; statuses: RecruitmentStatus[]; group: "actionable" | "reference" }> = {
  open: { label: "现在可投", statuses: ["27届开放", "2027秋季开放"], group: "actionable" },
  rolling: { label: "常年储备", statuses: ["常年储备"], group: "actionable" },
  waiting: { label: "等待公告", statuses: ["等待27届"], group: "actionable" },
  unknown: { label: "待确认", statuses: ["状态待确认"], group: "actionable" },
  past: { label: "往届参考", statuses: ["26届参考"], group: "reference" },
  closed: { label: "已截止", statuses: ["已截止"], group: "reference" },
};

export function statusKey(status: RecruitmentStatus): StatusKey {
  const entry = (Object.entries(STATUS_KEYS) as Array<[StatusKey, (typeof STATUS_KEYS)[StatusKey]]>)
    .find(([, value]) => value.statuses.includes(status));
  return entry ? entry[0] : "unknown";
}

export function statusGroup(status: RecruitmentStatus): "actionable" | "reference" {
  return STATUS_KEYS[statusKey(status)].group;
}

export function matchesStatusFilter(status: RecruitmentStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "actionable" || filter === "reference") return statusGroup(status) === filter;
  return statusKey(status) === filter;
}
