// 将已审核的城市资料包转换为正式 V2 学校池；未审核字段保持未知。
import type {
  CityDataset,
  CoverageGap,
  CoverageRecordV2,
  EvidenceRef,
  SchoolRecord,
  UnresolvedAlias,
  SourceLevel,
} from "../../lib/recruitment-types.ts";
import hangzhou from "../../research/intake/zhejiang/hangzhou.json" with { type: "json" };
import nanjing from "../../research/intake/jiangsu/nanjing.json" with { type: "json" };
import suzhou from "../../research/intake/jiangsu/suzhou.json" with { type: "json" };

type IntakeSource = {
  id: string; title: string; url: string; publisher: string; sourceLevel: SourceLevel;
  sourceType: EvidenceRef["sourceType"]; publishedAt: string | null; accessedAt: string;
  accessState: EvidenceRef["accessState"]; note: string;
};
type IntakePrivateSchool = {
  id: string; officialName: string; district: string; schoolStages: Array<"初中" | "高中">;
  ownership: "民办"; officialPoolEvidenceIds: string[]; aliasNames: string[];
  activeState: SchoolRecord["activeState"]; note: string;
};
type IntakePublicTarget = {
  id: string; officialName: string; district: string; schoolStages: ["高中"];
  targetTier: "核心" | "扩展"; targetReason: string; evidenceIds: string[]; note: string;
};

type IntakeLike = {
  batchId: string;
  province: "浙江" | "江苏";
  city: string;
  researchedAt: string;
  sources: IntakeSource[];
  privateSchools: IntakePrivateSchool[];
  publicTargets: IntakePublicTarget[];
  coverageGaps: CoverageGap[];
  unresolvedAliases: UnresolvedAlias[];
};

function evidenceOf(source: IntakeSource): EvidenceRef {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    sourceLevel: source.sourceLevel,
    sourceType: source.sourceType,
    publishedAt: source.publishedAt ?? undefined,
    accessedAt: source.accessedAt,
    accessState: source.accessState,
    note: source.note || undefined,
  };
}

function currentActiveEvidenceIds(intake: IntakeLike, evidenceIds: string[]) {
  const byId = new Map(intake.sources.map((source) => [source.id, source]));
  return evidenceIds.filter((id) => {
    const source = byId.get(id);
    if (!source || source.accessState !== "ok") return false;
    if (source.publishedAt?.startsWith("2026-")) return true;
    return source.sourceLevel === "A2_school_official"
      && source.sourceType === "学校主页"
      && source.accessedAt.startsWith("2026-");
  });
}

function privateSchoolOf(intake: IntakeLike, school: IntakePrivateSchool): SchoolRecord {
  const activeEvidenceIds = currentActiveEvidenceIds(intake, school.officialPoolEvidenceIds);
  const activeState = school.activeState === "正常办学" && activeEvidenceIds.length === 0
    ? "待确认"
    : school.activeState;
  return {
    id: school.id,
    province: intake.province,
    city: intake.city,
    district: school.district,
    officialName: school.officialName,
    aliasNames: school.aliasNames,
    institutionType: "民办中学",
    ownership: "民办",
    schoolStages: school.schoolStages,
    curricula: [],
    boardingSchool: "unknown",
    recruitmentChannelEvidenceIds: [],
    recruitmentContacts: [],
    officialPoolEvidenceIds: school.officialPoolEvidenceIds,
    activeState,
    lastVerified: intake.researchedAt,
    fieldEvidence: {
      officialName: school.officialPoolEvidenceIds,
      ownership: school.officialPoolEvidenceIds,
      schoolStages: school.officialPoolEvidenceIds,
      district: school.officialPoolEvidenceIds,
      activeState: activeEvidenceIds,
    },
  };
}

function publicSchoolOf(intake: IntakeLike, school: IntakePublicTarget): SchoolRecord {
  const activeEvidenceIds = currentActiveEvidenceIds(intake, school.evidenceIds);
  return {
    id: school.id,
    province: intake.province,
    city: intake.city,
    district: school.district,
    officialName: school.officialName,
    aliasNames: [],
    institutionType: "公办中学",
    ownership: "公办",
    schoolStages: ["高中"],
    curricula: ["国内课程"],
    boardingSchool: "unknown",
    recruitmentChannelEvidenceIds: [],
    recruitmentContacts: [],
    officialPoolEvidenceIds: school.evidenceIds,
    publicTargetTier: school.targetTier,
    publicTargetReason: school.targetReason,
    activeState: activeEvidenceIds.length ? "正常办学" : "待确认",
    lastVerified: intake.researchedAt,
    fieldEvidence: {
      officialName: school.evidenceIds,
      ownership: school.evidenceIds,
      schoolStages: school.evidenceIds,
      district: school.evidenceIds,
      activeState: activeEvidenceIds,
    },
  };
}

export function buildIntakeDataset(intake: IntakeLike): CityDataset {
  const excludedStageCandidates = intake.city === "南京"
    ? intake.privateSchools.filter((school) => {
        const hasCurrentStageEvidence = school.officialPoolEvidenceIds.some((id) => /2026/.test(id));
        const explicitHighSchool = /高级中学/.test(school.officialName);
        return !hasCurrentStageEvidence && !explicitHighSchool && /以学校官网为准|需.*核实|是否含高中|具体.*阶段/.test(school.note);
      })
    : [];
  const excludedIds = new Set(excludedStageCandidates.map((school) => school.id));
  const schools = [
    ...intake.privateSchools.filter((school) => !excludedIds.has(school.id)).map((school) => privateSchoolOf(intake, school)),
    ...intake.publicTargets.map((school) => publicSchoolOf(intake, school)),
  ];
  const coverage: CoverageRecordV2[] = schools.map((school) => ({
    schoolId: school.id,
    city: intake.city,
    currentOutcome: "待检索",
    relevantPositionIds: [],
    searchEvidenceIds: [],
    recordOrigin: "native_v2",
  }));
  return {
    cityId: intake.city === "杭州" ? "hangzhou" : intake.city === "南京" ? "nanjing" : "suzhou",
    cityName: intake.city,
    province: intake.province,
    schools,
    coverage,
    batches: [],
    positions: [],
    evidence: intake.sources.map(evidenceOf),
    outcomes: [],
    coverageGaps: [
      ...intake.coverageGaps,
      ...(excludedStageCandidates.length ? [{
        scope: "private_school_pool" as const,
        description: `${excludedStageCandidates.length} 所南京年检候选校因初中/高中学段缺少当前官方证据，暂不进入正式学校池`,
        evidenceIds: ["src-nj-edu-2024-annual-inspection"],
        nextAction: "逐校补充教育部门或学校官方学段证据后再导入",
      }] : []),
    ],
    unresolvedAliases: intake.unresolvedAliases,
    researchBatchId: intake.batchId,
    researchedAt: intake.researchedAt,
  };
}

const recoverySources = {
  宁波: { province: "浙江", url: "https://jyj.ningbo.gov.cn/", publisher: "宁波市教育局" },
  温州: { province: "浙江", url: "https://edu.wenzhou.gov.cn/", publisher: "温州市教育局" },
  嘉兴: { province: "浙江", url: "https://jyj.jiaxing.gov.cn/", publisher: "嘉兴市教育局" },
  绍兴: { province: "浙江", url: "https://jyj.sx.gov.cn/art/2025/6/24/art_1229558610_1910007.html", publisher: "绍兴市教育局" },
  无锡: { province: "江苏", url: "https://edu.wuxi.gov.cn/", publisher: "无锡市教育局" },
} as const;

export function buildRecoveryDataset(cityName: keyof typeof recoverySources): CityDataset {
  const source = recoverySources[cityName];
  const cityIds = { 宁波: "ningbo", 温州: "wenzhou", 嘉兴: "jiaxing", 绍兴: "shaoxing", 无锡: "wuxi" } as const;
  const cityId = cityIds[cityName];
  const evidenceId = `src-${cityId}-education-official`;
  return {
    cityId,
    cityName,
    province: source.province,
    schools: [],
    coverage: [],
    batches: [],
    positions: [],
    evidence: [{
      id: evidenceId,
      title: `${cityName}市教育部门官方入口`,
      url: source.url,
      publisher: source.publisher,
      sourceLevel: "A1_government",
      sourceType: "教育部门说明",
      accessedAt: "2026-08-21",
      accessState: cityName === "无锡" ? "blocked" : "ok",
      note: cityName === "无锡"
        ? "已确认无锡市教育局官方入口；2026-08-21链接检查无法连接，当前仍未恢复完整民办初高中名单。"
        : "已找到官方入口，但本轮未恢复同时覆盖民办初中、民办高中和一贯制学校的完整名单。",
    }],
    outcomes: [],
    coverageGaps: [
      { scope: "private_school_pool", description: `${cityName}民办初高中完整官方名单尚未恢复`, evidenceIds: [evidenceId], nextAction: "继续检查年度招生计划、年检公示及区县教育部门名单" },
      { scope: "public_target_pool", description: `${cityName}重点公办高中仍需逐校核验正式名称、区县和公办性质`, evidenceIds: [evidenceId], nextAction: "逐校补充政府或学校官方依据后再入池" },
      { scope: "recruitment", description: `${cityName}学校池未完整前不能声称完成逐校岗位扫描`, evidenceIds: [evidenceId], nextAction: "学校池确认后逐校检查政治、经济、社科和历史岗位" },
    ],
    unresolvedAliases: [],
    researchBatchId: `recovery-${cityId}-2026-08-21`,
    researchedAt: "2026-08-21",
  };
}

export const researchedCityDatasets = [
  buildIntakeDataset(hangzhou as unknown as IntakeLike),
  buildIntakeDataset(nanjing as unknown as IntakeLike),
  buildIntakeDataset(suzhou as unknown as IntakeLike),
  buildRecoveryDataset("宁波"),
  buildRecoveryDataset("温州"),
  buildRecoveryDataset("嘉兴"),
  buildRecoveryDataset("绍兴"),
  buildRecoveryDataset("无锡"),
];
