// V1 兼容层 + V2 数据层入口。
//
// 本文件保留 V1 界面所需的数据 API（jobs / 六城覆盖 / 官方名单来源 / 来源图例），
// 全部从 ./data/legacy.ts 原样再导出，确保现有界面、筛选、收藏、CSV 导出与既有测试无需改动。
// V2 拆分后的结构化数据见 ./data/migration.ts（按城市与数据类别组织）与 ../lib/recruitment-types.ts。

export * from "./data/legacy.ts";

export type {
  CityDataset,
  PositionRecord,
  SchoolRecord,
  RecruitmentBatch,
  EvidenceRef,
  EvidenceScope,
  CoverageRecordV2,
  HiringOutcome,
  RequirementRule,
  HousingBenefit,
  MealBenefit,
  Workload,
  SelectionStageV2,
  EmploymentType,
  InstitutionType,
  SubjectTag,
  UnknownState,
  CoverageGap,
  UnresolvedAlias,
  RecruitmentStatus,
  EligibilityState,
  CandidateProfile,
  RecruitmentContact,
} from "../lib/recruitment-types.ts";

import type { PositionRecord } from "../lib/recruitment-types.ts";
import { buildCityDatasets, buildMultiCityDataset } from "./data/migration.ts";
import { researchedCityDatasets } from "./data/intake-adapter.ts";
import { enrichNativeV2Datasets } from "./data/native-v2.ts";
import { applyDshScanIncrements } from "./data/scan-adapter.ts";
export { deriveRecruitmentStatus, derivePositionStatus, todayInUtc8, verificationHealth } from "../lib/recruitment-status.ts";
export { evaluatePublicEligibility } from "../lib/eligibility.ts";
export { computePrivateFit } from "../lib/fit.ts";

// V2 十四城数据集：广东六城迁移数据 + 浙苏八城审核资料；教培多城市另存。
export const cityDatasets = applyDshScanIncrements(enrichNativeV2Datasets([...buildCityDatasets(), ...researchedCityDatasets]));
// 教培多城市岗位的完整数据集：positions 全部 city=null，并附带 school / batch / evidence。
export const multiCityDataset = buildMultiCityDataset();
export const multiCityPositions = multiCityDataset.positions;
export const allPositions = [
  ...cityDatasets.flatMap((dataset) => dataset.positions),
  ...multiCityPositions,
];

// 阶段 A 稳定兼容层：fitScore 从静态分改造为“可按用户资料计算”的结构。
// 完整匹配算法在阶段 B/C 接入用户资料后替换；本阶段无 profile 时回退到 legacyFitScore，
// 不改变既有排序，避免界面与行为退化。
export interface FitProfile {
  backgrounds?: string[];
  targetCities?: string[];
  acceptBoarding?: boolean;
  minSalaryAnnual?: number;
}

export function computeFitScore(position: PositionRecord, profile?: FitProfile): number {
  const base = position.legacyFitScore ?? 0;
  if (!profile) return base;

  let score = base;
  const legacy = position.legacy;
  if (profile.minSalaryAnnual != null && (position.salaryAnnualMin ?? 0) >= profile.minSalaryAnnual) {
    score += 5;
  }
  if (profile.acceptBoarding === false && legacy?.boarding === true) {
    score -= 8;
  }
  if (profile.targetCities && position.city && !profile.targetCities.includes(position.city)) {
    score -= 3;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
