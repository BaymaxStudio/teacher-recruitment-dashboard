// 将网站数据导出为便于后续人工更新的 JSON。
// 阶段 A.1 修正：V2 导出必须包含全部岗位（含教培多城市的 position / batch / evidence / 机构记录），
// metadata 中的计数全部由实际序列化的数据计算，不再手工累加。
import { mkdir, writeFile } from "node:fs/promises";
import {
  jobs,
  dongguanCoverage,
  foshanCoverage,
  guangzhouCoverage,
  huizhouCoverage,
  officialFoshanPoolSource,
  officialDongguanPoolSource,
  officialGuangzhouPoolSource,
  officialHuizhouPoolSource,
  officialShenzhenPoolSource,
  officialZhuhaiPoolSource,
  shenzhenCoverage,
  sourceLegend,
  zhuhaiCoverage,
  cityDatasets,
  multiCityDataset,
} from "../app/recruitment-data.ts";
import { derivePositionStatus, todayInUtc8 } from "../lib/recruitment-status.ts";

const outputDirectory = new URL("../outputs/", import.meta.url);
const v1File = new URL("广东民办中学教师_2027秋招数据.json", outputDirectory);
const v2File = new URL("十四城决策台_V2数据.json", outputDirectory);

const exportData = {
  metadata: {
    title: "广东民办中学教师 2027 秋招结构化数据",
    lastVerified: "2026-08-14",
    salaryUnit: "税前年薪万元",
    defaultSalaryFloor: 15,
    notes: [
      "26届流程只作参考，不代表27届采用相同流程。",
      "未公开与没有要求是不同状态。",
      "公开月薪只乘12，不加入未确认奖金或课时费。",
    ],
    sourceLegend,
    officialShenzhenPoolSource,
    officialGuangzhouPoolSource,
    officialDongguanPoolSource,
    officialFoshanPoolSource,
    officialHuizhouPoolSource,
    officialZhuhaiPoolSource,
  },
  jobs: jobs.map(({ stages, ...job }) => ({ ...job, selectionStages: stages })),
  shenzhenCoverage,
  guangzhouCoverage,
  dongguanCoverage,
  foshanCoverage,
  huizhouCoverage,
  zhuhaiCoverage,
};

// 计数一律取自实际序列化的数据体，杜绝 metadata 与数据体不一致。
const serializedCityPositions = cityDatasets.flatMap((dataset) => dataset.positions);
const serializedMultiCityPositions = multiCityDataset.positions;
const serializedTotalPositions = serializedCityPositions.length + serializedMultiCityPositions.length;
const statusAsOf = todayInUtc8();
const allDatasets = [...cityDatasets, multiCityDataset];
const batchById = new Map(allDatasets.flatMap((dataset) => dataset.batches).map((batch) => [batch.id, batch]));
const statusCounts = Object.fromEntries(
  [...serializedCityPositions, ...serializedMultiCityPositions].reduce((counts, position) => {
    const status = derivePositionStatus(position, batchById.get(position.batchId), statusAsOf);
    counts.set(status, (counts.get(status) ?? 0) + 1);
    return counts;
  }, new Map()),
);

const coverageTotal = cityDatasets.reduce((sum, dataset) => sum + dataset.coverage.length, 0);
const schoolTotal = cityDatasets.reduce((sum, dataset) => sum + dataset.schools.length, 0);
const outcomeTotal = cityDatasets.reduce((sum, dataset) => sum + dataset.outcomes.length, 0);
const evidenceTotal = cityDatasets.reduce((sum, dataset) => sum + dataset.evidence.length, 0);
const coverageGapTotal = cityDatasets.reduce((sum, dataset) => sum + (dataset.coverageGaps?.length ?? 0), 0);
const citySummary = cityDatasets.map((dataset) => {
  const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
  return {
    city: dataset.cityName,
    schools: dataset.schools.length,
    coverage: dataset.coverage.length,
    positions: dataset.positions.length,
    publicTargets: dataset.schools.filter((school) => school.ownership === "公办").length,
    privateSchools: dataset.schools.filter((school) => school.ownership === "民办" && school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government")).length,
    outcomes: dataset.outcomes.length,
    evidence: dataset.evidence.length,
    coverageGaps: dataset.coverageGaps?.length ?? 0,
  };
});

const v2Data = {
  metadata: {
    schema: "v2",
    generatedAt: new Date().toISOString(),
    statusAsOf,
    statusCounts,
    totalPositions: serializedTotalPositions,
    cityPositions: serializedCityPositions.length,
    multiCityPositions: serializedMultiCityPositions.length,
    totalSchools: schoolTotal,
    totalFormalPoolSchools: coverageTotal,
    cityCoverageTotal: coverageTotal,
    totalOutcomes: outcomeTotal,
    totalEvidence: evidenceTotal,
    totalCoverageGaps: coverageGapTotal,
    citySummary,
    multiCitySummary: {
      city: multiCityDataset.cityName,
      schools: multiCityDataset.schools.length,
      batches: multiCityDataset.batches.length,
      positions: multiCityDataset.positions.length,
      evidence: multiCityDataset.evidence.length,
    },
    notes: [
      "V2 数据按城市与数据类别拆分；结构化住宿/餐食/工作量/选拔环节/硬性条件为基于 V1 文本的最佳努力映射，原文保留在 position.legacy。",
      "教培多城市岗位 city 为 null，完整记录在 multiCity（schools / batches / positions / evidence）。",
      "原生 V2 岗位与录用结果不包含 legacy 或 legacyFitScore；这些字段仅保留在 V1 迁移记录。",
      "录用结果仅保留岗位、学校、学历、毕业院校和专业等聚合分析字段，不保存姓名、性别、成绩、排名或联系方式。",
      "官方名单无法完整恢复的城市保留 coverageGaps，不用第三方来源补成已确认。",
    ],
  },
  cityDatasets,
  multiCity: {
    cityId: multiCityDataset.cityId,
    cityName: multiCityDataset.cityName,
    province: multiCityDataset.province,
    schools: multiCityDataset.schools,
    batches: multiCityDataset.batches,
    positions: multiCityDataset.positions,
    evidence: multiCityDataset.evidence,
    outcomes: multiCityDataset.outcomes,
  },
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(v1File, `${JSON.stringify(exportData, null, 2)}\n`, "utf8");
await writeFile(v2File, `${JSON.stringify(v2Data, null, 2)}\n`, "utf8");
console.log(`V1 导出 ${jobs.length} 条岗位；V2 实际序列化 ${serializedTotalPositions} 条岗位（十四城 ${serializedCityPositions.length} + 教培多城市 ${serializedMultiCityPositions.length}），14 城正式学校池 ${coverageTotal} 所、岗位线索附加学校 ${schoolTotal - coverageTotal} 所、匿名录用结果 ${outcomeTotal} 条。`);
console.log(`V1 文件：${v1File.pathname}`);
console.log(`V2 文件：${v2File.pathname}`);
