// 从正式 V2 数据生成指定城市的 DSH 招聘试采目标（默认宁波），避免手工复制学校名称和证据外键。
import { mkdir, writeFile } from "node:fs/promises";
import { cityDatasets } from "../app/recruitment-data.ts";

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const cityName = requested[0] ?? "宁波";
const dataset = cityDatasets.find((item) => item.cityName === cityName);
if (!dataset) throw new Error(`正式数据中缺少城市数据集：${cityName}`);

const evidenceById = new Map(dataset.evidence.map((item) => [item.id, item]));
const coverageBySchoolId = new Map(dataset.coverage.map((item) => [item.schoolId, item]));
const schools = dataset.schools
  .filter((school) => school.ownership === "民办" || school.ownership === "公办")
  .sort((left, right) => {
    if (left.ownership !== right.ownership) return left.ownership === "民办" ? -1 : 1;
    return left.officialName.localeCompare(right.officialName, "zh-CN");
  })
  .map((school) => ({
    schoolId: school.id,
    officialName: school.officialName,
    ownership: school.ownership,
    district: school.district,
    schoolStages: school.schoolStages,
    poolEvidence: school.officialPoolEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean).map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      publisher: item.publisher,
      sourceLevel: item.sourceLevel,
      sourceType: item.sourceType,
      publishedAt: item.publishedAt ?? null,
      accessedAt: item.accessedAt,
      accessState: item.accessState,
    })),
    currentCoverageOutcome: coverageBySchoolId.get(school.id)?.currentOutcome ?? "待检索",
    currentOfficialWebsite: school.officialWebsite ?? null,
    currentRecruitmentChannelCount: school.recruitmentChannelEvidenceIds.length,
    currentContactCount: school.recruitmentContacts.length,
  }));

if (schools.length === 0) throw new Error(`${cityName} 目标清单为空，请先确认正式数据中的学校池`);

const privateCount = schools.filter((school) => school.ownership === "民办").length;
const publicCount = schools.filter((school) => school.ownership === "公办").length;

const payload = {
  schemaVersion: 1,
  generatedAt: "2026-08-21",
  province: dataset.province,
  city: cityName,
  targetCount: schools.length,
  privateSchoolCount: privateCount,
  publicTargetCount: publicCount,
  source: "正式 V2 数据自动生成；只作 DSH 招聘试采目标，不表示学校排名或当前存在招聘。",
  schools,
};

const directory = new URL("../research/handoff/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL(`${dataset.cityId}-targets.json`, directory), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`已生成 ${cityName} DSH 目标清单：${schools.length} 所（民办 ${privateCount}，公办 ${publicCount}）。`);
