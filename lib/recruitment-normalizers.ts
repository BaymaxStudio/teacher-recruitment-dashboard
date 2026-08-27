// 招聘原文的共享结构化规则：否定与非职责语义优先，避免关键词误判。
import type { EvidenceScope, UnknownState, Workload } from "./recruitment-types.ts";

function stateFromText(
  text: string,
  negative: RegExp,
  positive: RegExp,
): UnknownState {
  if (negative.test(text)) return "no";
  if (positive.test(text)) return "yes";
  return "unknown";
}

export function inferWorkloadFromText(
  raws: string[],
  evidenceIds: string[] = [],
  evidenceScope: EvidenceScope = raws.length > 0 ? "position_general" : "unverified",
): Workload {
  const text = raws.filter(Boolean).join("；");
  const homeroomTeacher: Workload["homeroomTeacher"] =
    /不要求(?:担任|承担)?班主任|无需(?:担任|承担)?班主任/.test(text) ? "不要求"
      : /必须(?:担任|承担)?班主任|班主任(?:工作|职责)?(?:为)?必须|承担班主任职责|担任班主任/.test(text) ? "必须"
        : /可能(?:担任|承担)?班主任|可安排班主任/.test(text) ? "可能"
          : "未公开";

  return {
    officeHours: /不坐班|无需坐班|非坐班/.test(text) ? "非坐班" : (/明确坐班|需要坐班|须坐班|坐班制/.test(text) ? "明确坐班" : "未公开"),
    eveningStudy: stateFromText(text, /无晚修|无晚自习|不安排晚修|无需晚修|晚修未公开/, /晚修值班|晚自习值班|承担晚修|承担晚自习/),
    residentialDuty: stateFromText(text, /无宿舍夜间值班|无夜间值班|无需驻校|不驻校|不安排住校值班/, /宿舍夜间值班|夜间值班|驻校值班|住校值班/),
    homeroomTeacher,
    weekendDuty: stateFromText(text, /周末双休|双休|无需周末|不安排周末|不承担周末/, /周末值班|周末授课|周末活动|周末轮班|承担周末/),
    evidenceIds: [...new Set(evidenceIds)],
    evidenceScope: raws.length > 0 ? evidenceScope : "unverified",
  };
}
