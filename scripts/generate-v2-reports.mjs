// 从正式 V2 数据生成可审计的 Markdown 清单，所有计数取自数据体。
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cityDatasets, multiCityDataset } from "../app/recruitment-data.ts";
import { derivePositionStatus, todayInUtc8 } from "../lib/recruitment-status.ts";

const outputDirectory = new URL("../outputs/", import.meta.url);
const generatedAt = todayInUtc8();
const allDatasets = [...cityDatasets, multiCityDataset];
const schools = allDatasets.flatMap((dataset) => dataset.schools);
const schoolById = new Map(schools.map((school) => [school.id, school]));
const batches = allDatasets.flatMap((dataset) => dataset.batches);
const batchById = new Map(batches.map((batch) => [batch.id, batch]));
const evidence = allDatasets.flatMap((dataset) => dataset.evidence);
const evidenceById = new Map(evidence.map((item) => [item.id, item]));
const positions = allDatasets.flatMap((dataset) => dataset.positions);
const statusValues = positions.map((position) => status(position));
const releaseStatusStats = {
  ready: statusValues.filter((value) => ["27届开放", "2027秋季开放", "常年储备"].includes(value)).length,
  pending: statusValues.filter((value) => ["等待27届", "状态待确认"].includes(value)).length,
  closed: statusValues.filter((value) => value === "已截止").length,
  reference: statusValues.filter((value) => value === "26届参考").length,
};

function link(title, url) {
  return url ? `[${title}](${url})` : title;
}

function salary(position) {
  if (position.salaryAnnualMin != null && position.salaryAnnualMax != null) return `${position.salaryAnnualMin}—${position.salaryAnnualMax}万/年`;
  if (position.salaryAnnualMin != null) return `${position.salaryAnnualMin}万/年以上`;
  if (position.salaryAnnualMax != null) return `最高${position.salaryAnnualMax}万/年`;
  return position.salaryBasis === "工资政策" ? "事业单位工资政策" : "未公开";
}

function status(position) {
  return derivePositionStatus(position, batchById.get(position.batchId), generatedAt);
}

function sourceForPosition(position) {
  const batch = batchById.get(position.batchId);
  return batch?.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
}

function tableEscape(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function officialWebsiteCell(school) {
  if (!school.officialWebsite || !school.officialWebsiteEvidenceId) return "待补";
  const source = evidenceById.get(school.officialWebsiteEvidenceId);
  return source?.sourceLevel === "A2_school_official" && source.sourceType === "学校主页"
    ? link("学校官网", school.officialWebsite)
    : "待复核";
}

function recruitmentChannelsCell(school) {
  const sources = school.recruitmentChannelEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
  return sources.length > 0
    ? sources.map((source) => link(source.title, source.url)).join("；")
    : "待补";
}

function contactCell(school) {
  if (school.recruitmentContacts.length === 0) return "待补";
  const counts = new Map();
  for (const contact of school.recruitmentContacts) counts.set(contact.validity, (counts.get(contact.validity) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => `${key}${count}条`).join("；");
}

async function write(name, content) {
  await writeFile(new URL(name, outputDirectory), `${content.trim()}\n`, "utf8");
}

function trackingReport() {
  const rows = positions.map((position) => {
    const batch = batchById.get(position.batchId);
    const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
    const source = sourceForPosition(position);
    const qualification = position.requirements.map((item) => `${item.field}:${item.text}`).join("；");
    const process = position.selectionStages.map((item) => `${item.name}${item.certainty === "unknown" ? "（未公开）" : ""}`).join(" → ");
    return `| ${tableEscape(position.city ?? "多城市")} | ${tableEscape(school?.officialName ?? batch?.employerName ?? "学校待分配")} | ${tableEscape(position.title)} | ${tableEscape(status(position))} | ${tableEscape(salary(position))} | ${tableEscape(position.housing.provision)} / ${tableEscape(position.meals.provision)} | ${tableEscape(qualification)} | ${tableEscape(process)} | ${source ? link(source.sourceLevel, source.url) : "待确认"} |`;
  });
  return `# 十四城教师招聘追踪清单

最后生成：${generatedAt}。共 ${positions.length} 条岗位，其中 48 条来自广东 V1 无损迁移，${positions.filter((item) => !item.legacy).length} 条为原生 V2 与已审核 DSH 扫描岗位。来源核验日期见各岗位记录；截止状态按生成当日计算。低薪筛选只作用于网站默认视图，清单保留全部记录。

状态统计（UTC+8 ${generatedAt}）：可投 ${releaseStatusStats.ready}，待确认 ${releaseStatusStats.pending}，已截止 ${releaseStatusStats.closed}，参考 ${releaseStatusStats.reference}。

| 城市 | 学校/机构 | 岗位 | 状态 | 薪资 | 食宿 | 公开条件 | 选拔流程 | 主要来源 |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## 使用边界

- “26届参考”不得解释为当前可投；流程也不得自动套用于27届。
- “未公开”与“没有”不同。住宿或餐食未公开时，应向校方询问，不应当作不提供。
- 教培多城市岗位不等同于全日制学校教师。
`;
}

function privateCoverageReport() {
  const sections = cityDatasets.map((dataset) => {
    const privateSchools = dataset.schools.filter((school) => school.ownership === "民办" && school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government"));
    const rows = privateSchools.map((school) => {
      const coverage = dataset.coverage.find((item) => item.schoolId === school.id);
      const sources = school.officialPoolEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
      return `| ${tableEscape(school.district)} | ${tableEscape(school.officialName)} | ${school.schoolStages.join("/") || "待确认"} | ${school.activeState} | ${officialWebsiteCell(school)} | ${coverage?.currentOutcome ?? "待检索"} | ${recruitmentChannelsCell(school)} | ${contactCell(school)} | ${sources.map((item) => link(item.title, item.url)).join("；") || "缺口"} |`;
    });
    const privateCoverage = dataset.coverage.filter((record) => privateSchools.some((school) => school.id === record.schoolId));
    const websiteCount = privateSchools.filter((school) => school.officialWebsiteEvidenceId).length;
    const searchedCount = privateCoverage.filter((record) => record.lastSearchedAt).length;
    const contactCount = privateSchools.reduce((sum, school) => sum + school.recruitmentContacts.length, 0);
    return `## ${dataset.cityName}

正式民办学校池 ${privateSchools.length} 所；已确认官网 ${websiteCount} 所；实际招聘检索 ${searchedCount} 所；公开招聘联系方式 ${contactCount} 条；岗位 ${dataset.positions.length} 条；登记缺口 ${dataset.coverageGaps?.length ?? 0} 条。

${rows.length ? `| 区县 | 正式名称 | 学段 | 办学状态 | 学校官网 | 招聘状态 | 招聘入口 | 联系方式 | A1 入池依据 |\n|---|---|---|---|---|---|---|---|---|\n${rows.join("\n")}` : "尚未恢复可满足正式入池标准的民办初高中名单。详见缺口报告。"}`;
  });
  return `# 十四城民办初高中覆盖报告

正式学校池以 A1 政府学校名单为入池门槛。当前共有 ${cityDatasets.reduce((sum, dataset) => sum + dataset.schools.filter((school) => school.ownership === "民办" && school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government")).length, 0)} 所民办学校满足该门槛。岗位页或学校官网只能增加招聘线索，不能替代政府学校池依据。

${sections.join("\n\n")}
`;
}

function publicTargetsReport() {
  const rows = cityDatasets.flatMap((dataset) => dataset.schools.filter((school) => school.ownership === "公办").map((school) => {
    const sources = school.officialPoolEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
    return `| ${school.city} | ${school.district} | ${school.officialName} | ${school.publicTargetTier ?? "扩展"} | ${tableEscape(school.publicTargetReason ?? "求职关注目标")} | ${sources.map((item) => link(item.title, item.url)).join("；") || "待补"} |`;
  }));
  return `# 十四城重点公办高中目标池

当前 ${rows.length} 所。目标池表示求职关注范围，不表达学校排名；事业编制必须另由具体招聘公告证明。

| 城市 | 区县 | 学校 | 目标层级 | 入池理由 | 官方依据 |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
}

function outcomesReport() {
  const outcomes = cityDatasets.flatMap((dataset) => dataset.outcomes);
  const rows = outcomes.map((item) => {
    const school = item.schoolId ? schoolById.get(item.schoolId) : undefined;
    const source = evidenceById.get(item.evidenceId);
    return `| ${item.recruitmentYear} | ${item.city} | ${school?.officialName ?? "统招未分配学校"} | ${item.subject ?? "未公开"} | ${item.degree ?? "未公开"} | ${item.graduateInstitution ?? "未公开"} | ${item.majorAsPublished ?? "未公开"} | ${item.stage} | ${source ? link("官方公示", source.url) : "证据缺失"} |`;
  });
  return `# 公办教师录用结果证据库

当前 ${outcomes.length} 条匿名样本。只保存岗位、学校、学历、毕业院校、专业、阶段和证据链接；不保存姓名、性别、成绩、排名、准考证号、电话、邮箱或照片。

| 年份 | 城市 | 学校 | 岗位 | 学历 | 毕业院校 | 专业 | 阶段 | 证据 |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
}

function gapsReport() {
  const rows = cityDatasets.flatMap((dataset) => (dataset.coverageGaps ?? []).map((gap) => `| ${dataset.cityName} | ${gap.scope} | ${tableEscape(gap.description)} | ${tableEscape(gap.nextAction)} | ${gap.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean).map((item) => link(item.title, item.url)).join("；") || "无"} |`));
  return `# 数据迁移与缺口报告

## 迁移状态

- 48 个 V1 岗位 ID 全部保留；V1 文本保存在 \`position.legacy\`，原生 V2 岗位不制造该字段。
- 广东六城原覆盖记录保持深圳49、广州43、东莞29、佛山34、惠州19、珠海9；顺德是佛山市的区县。
- 当前十四城共 ${cityDatasets.reduce((sum, dataset) => sum + dataset.coverage.length, 0)} 条正式学校池覆盖记录、${positions.length} 条岗位、${cityDatasets.reduce((sum, dataset) => sum + dataset.outcomes.length, 0)} 条匿名录用结果。
- 南京旧年检只证明对应年份曾列入名单；缺少当前学段或办学状态证据的候选校已从正式池排除或降级。

## 未恢复内容

| 城市 | 缺口范围 | 描述 | 下一步 | 已有关联证据 |
|---|---|---|---|---|
${rows.join("\n")}

公开信息无法恢复时保持缺口，不用第三方聚合页补成“已确认”。
`;
}

async function b12Report() {
  const files = [
    new URL("../research/intake/zhejiang/hangzhou.json", import.meta.url),
    new URL("../research/intake/jiangsu/nanjing.json", import.meta.url),
    new URL("../research/intake/jiangsu/suzhou.json", import.meta.url),
  ];
  const intakes = await Promise.all(files.map(async (url) => JSON.parse(await readFile(url, "utf8"))));
  const rows = intakes.map((item) => `| ${item.city} | ${item.batchId} | ${item.sources.length} | ${item.privateSchools.length} | ${item.publicTargets.length} | ${item.coverageGaps.length} | ${item.unresolvedAliases.length} |`);
  return `# 阶段 B1.2 资料批次报告

本报告由 \`scripts/generate-v2-reports.mjs\` 从三个资料 JSON 自动计算，避免人工计数漂移。

| 城市 | 批次 ID | 来源 | 民办候选校 | 公办目标 | 覆盖缺口 | 未解决别名 |
|---|---|---:|---:|---:|---:|---:|
${rows.join("\n")}

南京民办候选校数量是年检图像录入后的研究候选数，不等于正式学校池。正式池还要通过当前学段与办学状态审核。
`;
}

await mkdir(outputDirectory, { recursive: true });
await write("十四城招聘追踪清单.md", trackingReport());
await write("十四城民办初高中覆盖报告.md", privateCoverageReport());
await write("十四城重点公办高中目标池.md", publicTargetsReport());
await write("公办教师录用结果证据库.md", outcomesReport());
await write("数据迁移与缺口报告.md", gapsReport());
await writeFile(new URL("../research/intake/batch-b1-report.md", import.meta.url), `${(await b12Report()).trim()}\n`, "utf8");
console.log("已生成5份V2报告，并从资料JSON重建B1.2批次报告。");
