// 岗位筛选：筛选语义沿用原 page.tsx，另加状态条（可行动 / 参考）与已选条件标签。
import type { PositionRecord, SubjectTag } from "../recruitment-data";
import { batchById, datasetByCity, schoolById } from "./data-index";
import { housingPositive, isPublicPosition, positionName, positionOwnership, positionStatus, salaryBand, sourceRank, type Assessment } from "./derive";
import { matchesStatusFilter, statusKey, type StatusFilter, type StatusKey } from "./status-group";

export type SortKey = "match" | "salary" | "process" | "deadline" | "source";

export type Filters = {
  status: StatusFilter;
  query: string;
  province: string;
  city: string;
  district: string;
  subject: string;
  ownership: string;
  stage: string;
  housing: string;
  meals: string;
  language: string;
  certificate: string;
  experience: string;
  process: string;
  matchBand: string;
  salaryFloor: number;
  showPossibleSalary: boolean;
  showUnknownSalary: boolean;
  favoritesOnly: boolean;
  sort: SortKey;
};

export const DEFAULT_FILTERS: Filters = {
  status: "actionable",
  query: "",
  province: "全部",
  city: "全部",
  district: "全部",
  subject: "全部",
  ownership: "全部",
  stage: "全部",
  housing: "全部",
  meals: "全部",
  language: "全部",
  certificate: "全部",
  experience: "全部",
  process: "全部",
  matchBand: "全部",
  salaryFloor: 15,
  showPossibleSalary: false,
  showUnknownSalary: true,
  favoritesOnly: false,
  sort: "match",
};

export const FILTER_OPTIONS = {
  subject: ["全部", "政治/道法", "经济/商科", "全球视野/社科", "历史/人文", "其他"],
  ownership: ["全部", "民办", "公办", "混合或待确认"],
  stage: ["全部", "初中", "高中"],
  housing: ["全部", "有住宿/补贴", "免费住宿", "无住宿"],
  meals: ["全部", "免费餐食", "提供或补贴", "餐食未公开", "无食堂"],
  language: ["全部", "中文", "双语", "全英文", "未公开"],
  certificate: ["全部", "明确要求", "可后补", "未公开"],
  experience: ["全部", "应届或不限", "要求经验", "经验未公开"],
  process: ["全部", "有笔试", "有试讲/说课", "有面试", "流程未公开"],
  matchBand: ["全部", "低风险/满足", "需要确认", "明确不满足/低匹配"],
};

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "match", label: "匹配 / 资格" },
  { value: "salary", label: "薪资下限" },
  { value: "process", label: "流程复杂度" },
  { value: "deadline", label: "截止时间" },
  { value: "source", label: "来源等级" },
];

type Context = { assessments: Map<string, Assessment>; favorites: string[] };

// 除状态外的全部条件；状态条的计数基于这一步的结果
function passesBaseFilters(position: PositionRecord, filters: Filters, context: Context) {
  const dataset = position.city ? datasetByCity.get(position.city) : undefined;
  const publicPosition = isPublicPosition(position);
  if (!publicPosition) {
    const band = salaryBand(position, filters.salaryFloor);
    if (band === "low") return false;
    if (band === "possible" && !filters.showPossibleSalary) return false;
    if (band === "unknown" && !filters.showUnknownSalary) return false;
  }
  if (filters.province !== "全部" && dataset?.province !== filters.province) return false;
  if (filters.city !== "全部" && position.city !== filters.city) return false;
  if (filters.district !== "全部" && position.district !== filters.district) return false;
  if (filters.ownership !== "全部" && positionOwnership(position) !== filters.ownership) return false;
  if (filters.stage !== "全部" && !position.stage.includes(filters.stage)) return false;
  if (filters.subject !== "全部" && !position.subjects.includes(filters.subject as SubjectTag)) return false;

  const housing = position.housing.provision;
  if (filters.housing === "有住宿/补贴" && !housingPositive(position)) return false;
  if (filters.housing === "免费住宿" && !housing.startsWith("免费")) return false;
  if (filters.housing === "无住宿" && housing !== "无住宿") return false;

  const meals = position.meals.provision;
  if (filters.meals === "免费餐食" && !meals.startsWith("免费") && meals !== "部分免费") return false;
  if (filters.meals === "提供或补贴" && ["未公开", "无食堂"].includes(meals)) return false;
  if (filters.meals === "餐食未公开" && meals !== "未公开") return false;
  if (filters.meals === "无食堂" && meals !== "无食堂") return false;

  if (filters.language !== "全部" && position.languageMode !== filters.language) return false;

  const certificateRule = position.requirements.find((item) => item.field === "teacher_certificate");
  if (filters.certificate === "明确要求" && !certificateRule) return false;
  if (filters.certificate === "可后补" && !/到岗前|入职前|入职后|一年内|毕业后|前取得|可.{0,4}取得/.test(certificateRule?.text ?? "")) return false;
  if (filters.certificate === "未公开" && certificateRule && !/未公开|待确认|按岗位审核/.test(certificateRule.text)) return false;

  const experienceRule = position.requirements.find((item) => item.field === "experience");
  const batch = batchById.get(position.batchId);
  const acceptsGraduate = batch?.accepts2027 === "yes" || batch?.accepts2027 === "possible" || /应届|无经验|不限/.test(`${position.legacy?.freshGraduate ?? ""} ${experienceRule?.text ?? ""}`);
  if (filters.experience === "应届或不限" && !acceptsGraduate) return false;
  if (filters.experience === "要求经验" && !(experienceRule?.hardness === "hard" && /经验|教龄|年/.test(experienceRule.text))) return false;
  if (filters.experience === "经验未公开" && experienceRule) return false;

  const selectionNames = position.selectionStages.map((item) => item.name).join(" ");
  if (filters.process === "有笔试" && !/笔试|学科测评/.test(selectionNames)) return false;
  if (filters.process === "有试讲/说课" && !/试讲|试教|说课|模拟课堂|教学展示/.test(selectionNames)) return false;
  if (filters.process === "有面试" && !/面试|面谈|谈话/.test(selectionNames)) return false;
  if (filters.process === "流程未公开" && !position.selectionStages.every((item) => item.certainty === "unknown" || ["投递", "考核", "录用"].includes(item.name))) return false;

  const assessment = context.assessments.get(position.id);
  const fit = assessment?.fit ?? 0;
  const eligibility = assessment?.eligibility?.state ?? "";
  if (filters.matchBand === "低风险/满足" && !(publicPosition ? eligibility === "满足公开条件" : fit >= 80)) return false;
  if (filters.matchBand === "需要确认" && !(publicPosition ? ["可能满足，需要确认", "信息不足"].includes(eligibility) : fit >= 60 && fit < 80)) return false;
  if (filters.matchBand === "明确不满足/低匹配" && !(publicPosition ? eligibility === "明确不满足" : fit < 60)) return false;

  if (filters.favoritesOnly && !context.favorites.includes(position.id)) return false;

  const needle = filters.query.trim().toLowerCase();
  if (needle) {
    const searchable = `${positionName(position)} ${position.title} ${position.city ?? ""} ${position.district} ${position.subjects.join(" ")} ${position.sourceSummary} ${position.requirements.map((item) => item.text).join(" ")}`.toLowerCase();
    if (!searchable.includes(needle)) return false;
  }
  return true;
}

function compare(a: PositionRecord, b: PositionRecord, sort: SortKey, assessments: Map<string, Assessment>) {
  if (sort === "salary") return (b.salaryAnnualMin ?? -1) - (a.salaryAnnualMin ?? -1);
  if (sort === "deadline") return (batchById.get(a.batchId)?.deadline ?? "9999").localeCompare(batchById.get(b.batchId)?.deadline ?? "9999");
  if (sort === "process") return b.selectionStages.filter((item) => item.certainty !== "unknown").length - a.selectionStages.filter((item) => item.certainty !== "unknown").length;
  if (sort === "source") return sourceRank(b) - sourceRank(a);
  return (assessments.get(b.id)?.score ?? 0) - (assessments.get(a.id)?.score ?? 0);
}

export function filterPositions(positions: PositionRecord[], filters: Filters, context: Context) {
  const base = positions.filter((position) => passesBaseFilters(position, filters, context));
  const counts: Record<StatusKey, number> = { open: 0, rolling: 0, waiting: 0, unknown: 0, past: 0, closed: 0 };
  for (const position of base) counts[statusKey(positionStatus(position))] += 1;
  const list = base
    .filter((position) => matchesStatusFilter(positionStatus(position), filters.status))
    .sort((a, b) => compare(a, b, filters.sort, context.assessments));
  return { list, counts };
}

export function districtsFor(city: string) {
  const values = [...schoolById.values()].filter((school) => city === "全部" || school.city === city).map((school) => school.district).filter(Boolean);
  return ["全部", ...new Set(values)];
}

const CHIP_LABELS: Partial<Record<keyof Filters, string>> = {
  province: "省份", city: "城市", district: "区县", subject: "方向", ownership: "性质", stage: "学段",
  housing: "住宿", meals: "餐食", language: "授课语言", certificate: "教师资格", experience: "经验",
  process: "选拔流程", matchBand: "资格/匹配",
};

// 已生效的条件，显示成可移除的标签
export function activeChips(filters: Filters) {
  const chips: Array<{ key: keyof Filters; label: string }> = [];
  if (filters.query.trim()) chips.push({ key: "query", label: `搜索：${filters.query.trim()}` });
  for (const [key, name] of Object.entries(CHIP_LABELS) as Array<[keyof Filters, string]>) {
    const value = filters[key];
    if (value !== DEFAULT_FILTERS[key]) chips.push({ key, label: `${name}：${value}` });
  }
  if (filters.salaryFloor !== DEFAULT_FILTERS.salaryFloor) chips.push({ key: "salaryFloor", label: `民办年薪底线 ${filters.salaryFloor} 万` });
  if (filters.showPossibleSalary) chips.push({ key: "showPossibleSalary", label: "含区间可能达到" });
  if (!filters.showUnknownSalary) chips.push({ key: "showUnknownSalary", label: "排除薪资未知" });
  if (filters.favoritesOnly) chips.push({ key: "favoritesOnly", label: "只看收藏" });
  return chips;
}

export const MORE_FILTER_KEYS: Array<keyof Filters> = ["province", "district", "meals", "language", "certificate", "experience", "process", "matchBand", "favoritesOnly"];
