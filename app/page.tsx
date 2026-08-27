"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  allPositions,
  cityDatasets,
  computePrivateFit,
  derivePositionStatus,
  evaluatePublicEligibility,
  multiCityDataset,
  todayInUtc8,
  type CandidateProfile,
  type CityDataset,
  type PositionRecord,
  type RecruitmentStatus,
} from "./recruitment-data";
import { loadStorageState, saveStorageState, STORAGE_SCHEMA_VERSION } from "../lib/storage";

type ViewKey = "opportunities" | "private" | "public" | "outcomes" | "coverage";
type FollowupStatus = "未开始" | "准备材料" | "已投递" | "笔试/面试" | "已放弃";

const viewItems: Array<{ key: ViewKey; label: string; caption: string }> = [
  { key: "opportunities", label: "当前机会", caption: "岗位与行动顺序" },
  { key: "private", label: "民办学校", caption: "学校池与食宿" },
  { key: "public", label: "公办招考", caption: "编制与报名资格" },
  { key: "outcomes", label: "录用结果", caption: "院校与专业样本" },
  { key: "coverage", label: "覆盖与来源", caption: "完成度与缺口" },
];

const cities = ["广州", "深圳", "佛山", "珠海", "惠州", "东莞", "杭州", "宁波", "温州", "嘉兴", "绍兴", "南京", "苏州", "无锡"];
const cityGroups = [
  { province: "广东", cityNames: ["广州", "深圳", "佛山", "珠海", "惠州", "东莞"] },
  { province: "浙江", cityNames: ["杭州", "宁波", "温州", "嘉兴", "绍兴"] },
  { province: "江苏", cityNames: ["南京", "苏州", "无锡"] },
];
const followupOptions: FollowupStatus[] = ["未开始", "准备材料", "已投递", "笔试/面试", "已放弃"];
const subjectOptions = ["全部", "政治/道法", "经济/商科", "全球视野/社科", "历史/人文", "其他"];
const statusOptions = ["全部", "27届开放", "2027秋季开放", "常年储备", "等待27届", "26届参考", "已截止", "状态待确认"];

const allDatasets = [...cityDatasets, multiCityDataset];
const datasetByCity = new Map(cityDatasets.map((dataset) => [dataset.cityName, dataset]));
const schools = allDatasets.flatMap((dataset) => dataset.schools);
const schoolById = new Map(schools.map((school) => [school.id, school]));
const batches = allDatasets.flatMap((dataset) => dataset.batches);
const batchById = new Map(batches.map((batch) => [batch.id, batch]));
const evidence = allDatasets.flatMap((dataset) => dataset.evidence);
const evidenceById = new Map(evidence.map((item) => [item.id, item]));
const statusAsOf = todayInUtc8();

function positionStatus(position: PositionRecord): RecruitmentStatus {
  return derivePositionStatus(position, batchById.get(position.batchId), statusAsOf);
}

function isPublicPosition(position: PositionRecord) {
  const batch = batchById.get(position.batchId);
  const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  return school?.ownership === "公办" || ["事业编制", "员额/备案制", "人员控制数", "高层次人才引进", "公费师范生/专项"].includes(batch?.employmentType ?? "");
}

function salaryText(position: PositionRecord) {
  if (position.salaryAnnualMin != null && position.salaryAnnualMax != null) return `${position.salaryAnnualMin}—${position.salaryAnnualMax} 万/年`;
  if (position.salaryAnnualMin != null) return `${position.salaryAnnualMin} 万/年以上`;
  if (position.salaryAnnualMax != null) return `最高 ${position.salaryAnnualMax} 万/年`;
  return position.salaryBasis === "工资政策" ? "按事业单位工资政策" : "薪资未公开";
}

function salaryBand(position: PositionRecord, floor: number) {
  if (position.salaryAnnualMin == null && position.salaryAnnualMax == null) return "unknown";
  if ((position.salaryAnnualMin ?? 0) >= floor) return "qualified";
  if ((position.salaryAnnualMax ?? position.salaryAnnualMin ?? 0) >= floor) return "possible";
  return "low";
}

function housingPositive(position: PositionRecord) {
  return !["无住宿", "未公开"].includes(position.housing.provision);
}

function positionName(position: PositionRecord) {
  const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  return school?.officialName ?? batchById.get(position.batchId)?.employerName ?? "学校待分配";
}

function applicationLink(position: PositionRecord) {
  const batch = batchById.get(position.batchId);
  return batch?.applicationUrl ?? position.legacy?.application;
}

function sourceLink(position: PositionRecord) {
  const batch = batchById.get(position.batchId);
  const source = batch?.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
  return source?.url ?? applicationLink(position);
}

function formatDate(value?: string) {
  if (!value) return "未公开";
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function uniqueText(values: string[]) {
  return [...new Set(values)];
}

function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sourceLevelLabel(level: string) {
  return ({ A1_government: "A1 政府", A2_school_official: "A2 学校", B_university_career: "B 高校", C_recruitment_platform: "C 平台", D_aggregator: "D 聚合" } as Record<string, string>)[level] ?? level;
}

function statusTone(status: RecruitmentStatus) {
  if (["27届开放", "2027秋季开放"].includes(status)) return "positive";
  if (status === "已截止") return "muted";
  if (status === "常年储备") return "blue";
  return "amber";
}

function schoolCoverageRecord(dataset: CityDataset | undefined, schoolId: string) {
  return dataset?.coverage.find((record) => record.schoolId === schoolId);
}

function accessStateLabel(state?: string) {
  return ({ ok: "可访问", qr_only: "仅二维码", login_required: "需登录", blocked: "访问受阻", dead: "链接失效" } as Record<string, string>)[state ?? ""] ?? "待确认";
}

function contactHref(channel: string, value: string) {
  if (channel === "email") return `mailto:${value}`;
  if (channel === "phone") return `tel:${value.replace(/[^\d+]/g, "")}`;
  return undefined;
}

function contactSummary(school: (typeof schools)[number]) {
  if (!school.recruitmentContacts.length) return "待补";
  if (school.recruitmentContacts.every((contact) => contact.validity === "往届")) return `往届 ${school.recruitmentContacts.length}`;
  const officialCount = school.recruitmentContacts.filter((contact) => ["A1_government", "A2_school_official"].includes(evidenceById.get(contact.evidenceId)?.sourceLevel ?? "")).length;
  if (officialCount) return `官方 ${officialCount}`;
  return `第三方/待确认 ${school.recruitmentContacts.length}`;
}

function hasA1PoolEvidence(school: (typeof schools)[number]) {
  return school.officialPoolEvidenceIds.some((id) => evidenceById.get(id)?.sourceLevel === "A1_government");
}

function citySignal(cityName: string) {
  const dataset = datasetByCity.get(cityName);
  if (!dataset) return { privateCount: 0, positionCount: 0, gapCount: 0 };
  return {
    privateCount: dataset.schools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school)).length,
    positionCount: dataset.positions.length,
    gapCount: dataset.coverageGaps?.length ?? 0,
  };
}

function defaultProfile(): CandidateProfile {
  return {
    graduationYear: 2027,
    teacherCertificateStage: "中学未确认",
    teacherCertificateSubject: "政治",
    minimumSalaryAnnual: 15,
    housingPreference: "优先提供住宿",
  };
}

export default function Home() {
  const [view, setView] = useState<ViewKey>("opportunities");
  const [province, setProvince] = useState("全部");
  const [city, setCity] = useState("全部");
  const [district, setDistrict] = useState("全部");
  const [subject, setSubject] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [ownership, setOwnership] = useState("全部");
  const [stage, setStage] = useState("全部");
  const [housing, setHousing] = useState("全部");
  const [meals, setMeals] = useState("全部");
  const [language, setLanguage] = useState("全部");
  const [certificate, setCertificate] = useState("全部");
  const [experience, setExperience] = useState("全部");
  const [processFilter, setProcessFilter] = useState("全部");
  const [matchBand, setMatchBand] = useState("全部");
  const [salaryFloor, setSalaryFloor] = useState(15);
  const [showPossibleSalary, setShowPossibleSalary] = useState(false);
  const [showUnknownSalary, setShowUnknownSalary] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("match");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [followups, setFollowups] = useState<Record<string, FollowupStatus>>({});
  const [cityNotes, setCityNotes] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<CandidateProfile>(defaultProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const backupInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const apply = () => setFiltersOpen(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadStorageState();
      if (loaded.ok) {
        setFavorites(loaded.state.favorites);
        setNotes(loaded.state.notes);
        setFollowups(loaded.state.followups as Record<string, FollowupStatus>);
        setCityNotes(loaded.state.cityNotes ?? {});
        setProfile({ ...defaultProfile(), ...(loaded.state.candidateProfile ?? {}) });
        if (loaded.warnings.length) setNotice(loaded.warnings.join("；"));
      } else {
        setStorageBlocked(true);
        setNotice(loaded.message);
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || storageBlocked) return;
    const saved = saveStorageState({ schemaVersion: STORAGE_SCHEMA_VERSION, favorites, notes, followups, cityNotes, candidateProfile: profile });
    if (!saved) {
      const timer = window.setTimeout(() => {
        setStorageBlocked(true);
        setNotice("浏览器拒绝写入本地数据；本次会话仍可使用，但刷新后不会保留。");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [favorites, notes, followups, cityNotes, profile, storageReady, storageBlocked]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedPositionId(null);
      setCompareOpen(false);
      setProfileOpen(false);
    };
    window.addEventListener("keydown", closeOverlay);
    return () => window.removeEventListener("keydown", closeOverlay);
  }, []);

  const districts = useMemo(() => {
    const values = schools.filter((school) => city === "全部" || school.city === city).map((school) => school.district).filter(Boolean);
    return ["全部", ...new Set(values)];
  }, [city]);

  const filteredPositions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = allPositions.filter((position) => {
      const school = position.schoolId ? schoolById.get(position.schoolId) : undefined;
      const dataset = position.city ? datasetByCity.get(position.city) : undefined;
      const positionOwnership = school?.ownership ?? "混合或待确认";
      const band = salaryBand(position, salaryFloor);
      if (!isPublicPosition(position)) {
        if (band === "low") return false;
        if (band === "possible" && !showPossibleSalary) return false;
        if (band === "unknown" && !showUnknownSalary) return false;
      }
      if (province !== "全部" && dataset?.province !== province) return false;
      if (city !== "全部" && position.city !== city) return false;
      if (district !== "全部" && position.district !== district) return false;
      if (ownership !== "全部" && positionOwnership !== ownership) return false;
      if (stage !== "全部" && !position.stage.includes(stage)) return false;
      if (subject !== "全部" && !position.subjects.includes(subject as PositionRecord["subjects"][number])) return false;
      if (status !== "全部" && positionStatus(position) !== status) return false;
      if (housing === "有住宿/补贴" && !housingPositive(position)) return false;
      if (housing === "免费住宿" && !position.housing.provision.startsWith("免费")) return false;
      if (housing === "无住宿" && position.housing.provision !== "无住宿") return false;
      if (meals === "免费餐食" && !position.meals.provision.startsWith("免费") && position.meals.provision !== "部分免费") return false;
      if (meals === "提供或补贴" && ["未公开", "无食堂"].includes(position.meals.provision)) return false;
      if (meals === "餐食未公开" && position.meals.provision !== "未公开") return false;
      if (meals === "无食堂" && position.meals.provision !== "无食堂") return false;
      if (language !== "全部" && position.languageMode !== language) return false;
      const certificateRule = position.requirements.find((item) => item.field === "teacher_certificate");
      if (certificate === "明确要求" && !certificateRule) return false;
      if (certificate === "可后补" && !/到岗前|入职前|入职后|一年内|毕业后|前取得|可.{0,4}取得/.test(certificateRule?.text ?? "")) return false;
      if (certificate === "未公开" && certificateRule && !/未公开|待确认|按岗位审核/.test(certificateRule.text)) return false;
      const experienceRule = position.requirements.find((item) => item.field === "experience");
      const batch = batchById.get(position.batchId);
      const acceptsGraduate = batch?.accepts2027 === "yes" || batch?.accepts2027 === "possible" || /应届|无经验|不限/.test(`${position.legacy?.freshGraduate ?? ""} ${experienceRule?.text ?? ""}`);
      if (experience === "应届或不限" && !acceptsGraduate) return false;
      if (experience === "要求经验" && !(experienceRule?.hardness === "hard" && /经验|教龄|年/.test(experienceRule.text))) return false;
      if (experience === "经验未公开" && experienceRule) return false;
      const selectionNames = position.selectionStages.map((item) => item.name).join(" ");
      if (processFilter === "有笔试" && !/笔试|学科测评/.test(selectionNames)) return false;
      if (processFilter === "有试讲/说课" && !/试讲|试教|说课|模拟课堂|教学展示/.test(selectionNames)) return false;
      if (processFilter === "有面试" && !/面试|面谈|谈话/.test(selectionNames)) return false;
      if (processFilter === "流程未公开" && !position.selectionStages.every((item) => item.certainty === "unknown" || ["投递", "考核", "录用"].includes(item.name))) return false;
      const publicPosition = isPublicPosition(position);
      const fitValue = publicPosition ? null : computePrivateFit(position, profile);
      const eligibility = publicPosition ? evaluatePublicEligibility(position, profile).state : null;
      if (matchBand === "低风险/满足" && !(publicPosition ? eligibility === "满足公开条件" : (fitValue ?? 0) >= 80)) return false;
      if (matchBand === "需要确认" && !(publicPosition ? ["可能满足，需要确认", "信息不足"].includes(eligibility ?? "") : (fitValue ?? 0) >= 60 && (fitValue ?? 0) < 80)) return false;
      if (matchBand === "明确不满足/低匹配" && !(publicPosition ? eligibility === "明确不满足" : (fitValue ?? 0) < 60)) return false;
      if (favoritesOnly && !favorites.includes(position.id)) return false;
      if (needle) {
        const searchable = `${positionName(position)} ${position.title} ${position.subjects.join(" ")} ${position.sourceSummary} ${position.requirements.map((item) => item.text).join(" ")}`.toLowerCase();
        if (!searchable.includes(needle)) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "salary") return (b.salaryAnnualMin ?? -1) - (a.salaryAnnualMin ?? -1);
      if (sort === "deadline") return (batchById.get(a.batchId)?.deadline ?? "9999").localeCompare(batchById.get(b.batchId)?.deadline ?? "9999");
      if (sort === "process") return b.selectionStages.filter((item) => item.certainty !== "unknown").length - a.selectionStages.filter((item) => item.certainty !== "unknown").length;
      if (sort === "source") {
        const rank: Record<string, number> = { A1_government: 5, A2_school_official: 4, B_university_career: 3, C_recruitment_platform: 2, D_aggregator: 1 };
        const aEvidence = batchById.get(a.batchId)?.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
        const bEvidence = batchById.get(b.batchId)?.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
        return (rank[bEvidence?.sourceLevel ?? "D_aggregator"] ?? 0) - (rank[aEvidence?.sourceLevel ?? "D_aggregator"] ?? 0);
      }
      const scoreA = isPublicPosition(a) ? (evaluatePublicEligibility(a, profile).state === "满足公开条件" ? 100 : 60) : computePrivateFit(a, profile);
      const scoreB = isPublicPosition(b) ? (evaluatePublicEligibility(b, profile).state === "满足公开条件" ? 100 : 60) : computePrivateFit(b, profile);
      return scoreB - scoreA;
    });
  }, [query, province, city, district, ownership, stage, subject, status, housing, meals, language, certificate, experience, processFilter, matchBand, salaryFloor, showPossibleSalary, showUnknownSalary, favoritesOnly, favorites, sort, profile]);

  const filteredSchools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return schools.filter((school) => {
      if (school.institutionType === "教育集团/教培") return false;
      if (province !== "全部" && school.province !== province) return false;
      if (city !== "全部" && school.city !== city) return false;
      if (district !== "全部" && school.district !== district) return false;
      if (ownership !== "全部" && school.ownership !== ownership) return false;
      if (stage !== "全部" && !school.schoolStages.includes(stage as "初中" | "高中")) return false;
      if (needle && !`${school.officialName} ${school.aliasNames.join(" ")} ${school.city} ${school.district}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [query, province, city, district, ownership, stage]);

  const privateSchools = filteredSchools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school));
  const publicSchools = filteredSchools.filter((school) => school.ownership === "公办");
  const outcomes = cityDatasets.flatMap((dataset) => dataset.outcomes).filter((item) => city === "全部" || item.city === city);
  const selectedPosition = selectedPositionId ? allPositions.find((position) => position.id === selectedPositionId) : undefined;
  const comparePositions = compareIds.map((id) => allPositions.find((position) => position.id === id)).filter(Boolean) as PositionRecord[];

  const stats = useMemo(() => ({
    open2027: allPositions.filter((position) => ["27届开放", "2027秋季开放"].includes(positionStatus(position))).length,
    ready: allPositions.filter((position) => ["27届开放", "2027秋季开放", "常年储备"].includes(positionStatus(position))).length,
    pending: allPositions.filter((position) => ["等待27届", "状态待确认"].includes(positionStatus(position))).length,
    closed: allPositions.filter((position) => positionStatus(position) === "已截止").length,
    reference: allPositions.filter((position) => positionStatus(position) === "26届参考").length,
    privateSchools: schools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school)).length,
    publicTargets: schools.filter((school) => school.ownership === "公办").length,
    outcomes: cityDatasets.reduce((sum, dataset) => sum + dataset.outcomes.length, 0),
    gaps: cityDatasets.reduce((sum, dataset) => sum + (dataset.coverageGaps?.length ?? 0), 0),
  }), []);

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) {
        setNotice("最多比较四个岗位。");
        return current;
      }
      return [...current, id];
    });
  }

  function resetFilters() {
    setProvince("全部"); setCity("全部"); setDistrict("全部"); setSubject("全部"); setStatus("全部");
    setOwnership("全部"); setStage("全部"); setHousing("全部"); setMeals("全部"); setLanguage("全部");
    setCertificate("全部"); setExperience("全部"); setProcessFilter("全部"); setMatchBand("全部"); setQuery(""); setSalaryFloor(15);
    setShowPossibleSalary(false); setShowUnknownSalary(true); setFavoritesOnly(false); setSort("match");
  }

  function exportCsv() {
    const rows = filteredPositions.map((position) => {
      const batch = batchById.get(position.batchId);
      return [position.city ?? "多城市", position.district, positionName(position), position.title, position.subjects.join("/"), positionStatus(position), salaryText(position), position.housing.provision, position.meals.provision, batch?.employmentType, batch?.deadline, applicationLink(position)];
    });
    const header = ["城市", "区县", "学校/机构", "岗位", "方向", "状态", "薪资", "住宿", "餐食", "用工性质", "截止日期", "投递入口"];
    downloadText("十四城教师招聘_筛选结果.csv", [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  async function copyTodo() {
    const text = filteredPositions.slice(0, 30).map((position, index) => {
      const batch = batchById.get(position.batchId);
      return `${index + 1}. [${positionStatus(position)}] ${position.city ?? "多城市"}｜${positionName(position)}｜${position.title}｜截止 ${batch?.deadline ?? "待确认"}｜${applicationLink(position) ?? "入口待确认"}`;
    }).join("\n");
    await navigator.clipboard.writeText(text || "当前筛选无岗位");
    setNotice("当前筛选已复制为投递待办。");
  }

  function backup() {
    downloadText("十四城决策台_本地备份.json", JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, favorites, notes, followups, cityNotes, candidateProfile: profile }, null, 2), "application/json");
  }

  function restore(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.favorites) || typeof data.notes !== "object" || typeof data.followups !== "object") throw new Error("格式不兼容");
        setFavorites(data.favorites.filter((id: unknown) => typeof id === "string"));
        setNotes(data.notes); setFollowups(data.followups); setCityNotes(data.cityNotes ?? {});
        setProfile({ ...defaultProfile(), ...(data.candidateProfile ?? {}) });
        setNotice("备份已恢复到当前浏览器。");
      } catch {
        setNotice("备份文件无法识别，未修改现有数据。");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main>
      <header className="masthead">
        <div className="masthead-top">
          <div className="identity-lockup">
            <span className="identity-mark" aria-hidden="true">师</span>
            <div><strong>十四城中学教师招聘决策台</strong><span>V2 · 公开研究版</span></div>
          </div>
          <div className="header-actions">
            <button className="text-button" onClick={() => setProfileOpen(true)}>我的资料</button>
            <button className="text-button" onClick={backup}>备份</button>
            <button className="text-button" onClick={() => backupInput.current?.click()}>恢复</button>
            <input ref={backupInput} hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && restore(event.target.files[0])} />
          </div>
        </div>
        <div className="hero-grid">
          <div className="title-lockup">
            <p className="eyebrow">2027 TEACHER RECRUITMENT · EVIDENCE DESK</p>
            <dl className="hero-stats">
              <div><dt>可投</dt><dd>{stats.ready}</dd></div>
              <div><dt>待确认</dt><dd>{stats.pending}</dd></div>
              <div><dt>已截止</dt><dd>{stats.closed}</dd></div>
              <div><dt>参考</dt><dd>{stats.reference}</dd></div>
            </dl>
            <p className="deck">来源核验日期见岗位卡；截止状态按当前日期计算。</p>
            <div className="scope-line"><span>政治 / 道法</span><span>经济 / 商科</span><span>历史 / 社科</span></div>
          </div>
          <aside className="brief-card">
            <div className="brief-card-head"><span>覆盖口径</span><strong>14 城学校池</strong></div>
            <dl>
              <div><dt>正式入池民办校</dt><dd>{stats.privateSchools}</dd></div>
              <div><dt>公办关注目标</dt><dd>{stats.publicTargets}</dd></div>
              <div><dt>公开缺口</dt><dd>{stats.gaps}</dd></div>
              <div><dt>匿名录用样本</dt><dd>{stats.outcomes}</dd></div>
            </dl>
            <p>民办税前年薪底线 {salaryFloor} 万；薪资未知保留；上海不在范围内。</p>
          </aside>
        </div>
        <div className="city-route" aria-label="十四城证据路线">
          <div className="route-heading">
            <div><span>十四城证据路线</span><p>节点依次显示：正式民办校 / 相关岗位 / 公开缺口</p></div>
            <button className={city === "全部" ? "active" : ""} onClick={() => { setProvince("全部"); setCity("全部"); setDistrict("全部"); }}>查看全部</button>
          </div>
          <div className="route-groups">
            {cityGroups.map((group) => <section key={group.province} className="route-group" aria-label={`${group.province}城市`}>
              <strong>{group.province}</strong>
              <div className="route-cities">
                {group.cityNames.map((cityName) => { const signal = citySignal(cityName); return <button key={cityName} className={city === cityName ? "active" : ""} aria-pressed={city === cityName} onClick={() => { setProvince(group.province); setCity(cityName); setDistrict("全部"); }}><i aria-hidden="true" /><span>{cityName}</span><small>{signal.privateCount} / {signal.positionCount} / {signal.gapCount}</small></button>; })}
              </div>
            </section>)}
          </div>
        </div>
      </header>

      <nav className="view-nav" aria-label="主视图">
        {viewItems.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setView(item.key); } }}><i aria-hidden="true" /><strong>{item.label}</strong><small>{item.caption}</small></button>)}
      </nav>

      <section className="workspace">
        <aside className="filters" aria-label="筛选条件">
          <button className="filters-toggle" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>筛选条件 <span>{filtersOpen ? "收起" : "展开"}</span></button>
          <div className={`filters-body ${filtersOpen ? "open" : ""}`}>
            <label className="search-field"><span>搜索学校、岗位或要求</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：政治、经济、万科梅沙" /></label>
            <div className="filter-grid">
              <label><span>省份</span><select value={province} onChange={(event) => { setProvince(event.target.value); setCity("全部"); setDistrict("全部"); }}><option>全部</option><option>广东</option><option>浙江</option><option>江苏</option></select></label>
              <label><span>城市</span><select value={city} onChange={(event) => { setCity(event.target.value); setDistrict("全部"); }}><option>全部</option>{cities.filter((item) => province === "全部" || datasetByCity.get(item)?.province === province).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>区县</span><select value={district} onChange={(event) => setDistrict(event.target.value)}>{districts.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>学校性质</span><select value={ownership} onChange={(event) => setOwnership(event.target.value)}><option>全部</option><option>民办</option><option>公办</option><option>混合或待确认</option></select></label>
              <label><span>学段</span><select value={stage} onChange={(event) => setStage(event.target.value)}><option>全部</option><option>初中</option><option>高中</option></select></label>
              <label><span>岗位方向</span><select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjectOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>招聘状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>住宿</span><select value={housing} onChange={(event) => setHousing(event.target.value)}><option>全部</option><option>有住宿/补贴</option><option>免费住宿</option><option>无住宿</option></select></label>
              <label><span>餐食</span><select value={meals} onChange={(event) => setMeals(event.target.value)}><option>全部</option><option>免费餐食</option><option>提供或补贴</option><option>餐食未公开</option><option>无食堂</option></select></label>
              <label><span>授课语言</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>全部</option><option>中文</option><option>双语</option><option>全英文</option><option>未公开</option></select></label>
              <label><span>教师资格</span><select value={certificate} onChange={(event) => setCertificate(event.target.value)}><option>全部</option><option>明确要求</option><option>可后补</option><option>未公开</option></select></label>
              <label><span>经验</span><select value={experience} onChange={(event) => setExperience(event.target.value)}><option>全部</option><option>应届或不限</option><option>要求经验</option><option>经验未公开</option></select></label>
              <label><span>选拔流程</span><select value={processFilter} onChange={(event) => setProcessFilter(event.target.value)}><option>全部</option><option>有笔试</option><option>有试讲/说课</option><option>有面试</option><option>流程未公开</option></select></label>
              <label><span>资格/匹配</span><select value={matchBand} onChange={(event) => setMatchBand(event.target.value)}><option>全部</option><option>低风险/满足</option><option>需要确认</option><option>明确不满足/低匹配</option></select></label>
            </div>
            <label className="range-field"><span>民办年薪底线 <strong>{salaryFloor} 万</strong></span><input type="range" min="10" max="35" step="1" value={salaryFloor} onChange={(event) => setSalaryFloor(Number(event.target.value))} /></label>
            <div className="check-row"><label><input type="checkbox" checked={showPossibleSalary} onChange={(event) => setShowPossibleSalary(event.target.checked)} /> 区间可能达到</label><label><input type="checkbox" checked={showUnknownSalary} onChange={(event) => setShowUnknownSalary(event.target.checked)} /> 保留薪资未知</label><label><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} /> 只看收藏</label></div>
            <div className="filter-actions"><button onClick={resetFilters}>重置</button><button onClick={exportCsv}>导出 CSV</button><button onClick={copyTodo}>复制待办</button></div>
          </div>
        </aside>

        <div className="content">
          {view === "opportunities" && <OpportunitiesView positions={filteredPositions} profile={profile} favorites={favorites} compareIds={compareIds} followups={followups} sort={sort} onSort={setSort} onFavorite={toggleFavorite} onCompare={toggleCompare} onSelect={setSelectedPositionId} onFollowup={(id, value) => setFollowups((current) => ({ ...current, [id]: value }))} />}
          {view === "private" && <PrivateSchoolsView schoolRecords={privateSchools} />}
          {view === "public" && <PublicExamsView positions={filteredPositions.filter(isPublicPosition)} schoolRecords={publicSchools} profile={profile} onSelect={setSelectedPositionId} />}
          {view === "outcomes" && <OutcomesView outcomes={outcomes} />}
          {view === "coverage" && <CoverageView datasets={cityDatasets.filter((dataset) => province === "全部" || dataset.province === province).filter((dataset) => city === "全部" || dataset.cityName === city)} cityNotes={cityNotes} onCityNote={(name, value) => setCityNotes((current) => ({ ...current, [name]: value }))} />}
        </div>
      </section>

      {compareIds.length > 0 && <div className="compare-bar"><span>已选 {compareIds.length} / 4</span><button onClick={() => setCompareOpen(true)}>打开比较</button><button onClick={() => setCompareIds([])}>清空</button></div>}
      {selectedPosition && <PositionModal position={selectedPosition} profile={profile} note={notes[selectedPosition.id] ?? ""} onNote={(value) => setNotes((current) => ({ ...current, [selectedPosition.id]: value }))} onClose={() => setSelectedPositionId(null)} />}
      {compareOpen && <CompareModal positions={comparePositions} onRemove={toggleCompare} onClose={() => setCompareOpen(false)} />}
      {profileOpen && <ProfileModal profile={profile} onProfile={setProfile} onClose={() => setProfileOpen(false)} />}
      {notice && <div className="toast" role="status">{notice}</div>}
      <footer><strong>十四城中学教师招聘决策台</strong><p>本地单用户版本。无登录、无自动监控、无代投；公开资料无法证明的内容显示为待确认或缺口。</p></footer>
    </main>
  );
}

function SectionHeading({ code, title, copy, count }: { code: string; title: string; copy: string; count?: string }) {
  return <div className="section-heading"><div><span>{code}</span><h2>{title}</h2><p>{copy}</p></div>{count && <strong>{count}</strong>}</div>;
}

function OpportunitiesView(props: { positions: PositionRecord[]; profile: CandidateProfile; favorites: string[]; compareIds: string[]; followups: Record<string, FollowupStatus>; sort: string; onSort: (value: string) => void; onFavorite: (id: string) => void; onCompare: (id: string) => void; onSelect: (id: string) => void; onFollowup: (id: string, value: FollowupStatus) => void }) {
  const { positions } = props;
  return <><div className="section-heading"><div><span>CURRENT OPPORTUNITIES</span><h2>当前机会</h2><p>民办用匹配分排序，公办用资格状态判断。已截止岗位只作为流程参考。</p></div><label>排序<select value={props.sort} onChange={(event) => props.onSort(event.target.value)}><option value="match">匹配 / 资格</option><option value="salary">薪资下限</option><option value="process">流程复杂度</option><option value="deadline">截止时间</option><option value="source">来源等级</option></select></label></div><div className="action-rail"><div><span>现在可投</span><strong>{positions.filter((item) => ["27届开放", "2027秋季开放"].includes(positionStatus(item))).length}</strong></div><div><span>先询问</span><strong>{positions.filter((item) => positionStatus(item) === "常年储备").length}</strong></div><div><span>准备笔试/试讲</span><strong>{positions.filter((item) => item.selectionStages.some((step) => /笔试|试讲|面试/.test(step.name))).length}</strong></div><div><span>等待秋招</span><strong>{positions.filter((item) => positionStatus(item) === "等待27届").length}</strong></div></div><div className="position-list">{positions.map((position) => <PositionCard key={position.id} position={position} profile={props.profile} favorite={props.favorites.includes(position.id)} compared={props.compareIds.includes(position.id)} followup={props.followups[position.id] ?? "未开始"} onFavorite={() => props.onFavorite(position.id)} onCompare={() => props.onCompare(position.id)} onSelect={() => props.onSelect(position.id)} onFollowup={(value) => props.onFollowup(position.id, value)} />)}{!positions.length && <div className="empty-state"><strong>当前筛选没有岗位</strong><p>可保留薪资未知、放宽城市，或切换到“民办学校”查看尚未发现岗位的目标校。</p></div>}</div></>;
}


function reviewMark(position: PositionRecord, eligibility: string | null, fit: number | null): "mark-ok" | "mark-warn" | "mark-no" | "mark-unknown" {
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

function reviewLabel(mark: string): string {
  if (mark === "mark-ok") return "可投";
  if (mark === "mark-warn") return "待确认";
  if (mark === "mark-no") return "不满足";
  return "参考";
}

function PositionCard(props: { position: PositionRecord; profile: CandidateProfile; favorite: boolean; compared: boolean; followup: FollowupStatus; onFavorite: () => void; onCompare: () => void; onSelect: () => void; onFollowup: (value: FollowupStatus) => void }) {
  const { position } = props;
  const batch = batchById.get(position.batchId);
  const publicPosition = isPublicPosition(position);
  const institution = position.schoolId ? schoolById.get(position.schoolId) : undefined;
  const employmentLabel = publicPosition
    ? batch?.employmentType
    : institution?.institutionType === "教育集团/教培" ? "教育集团/教培" : "民办合同";
  const eligibility = publicPosition ? evaluatePublicEligibility(position, props.profile) : null;
  const fit = publicPosition ? null : computePrivateFit(position, props.profile);
  const source = batch?.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
  const mark = reviewMark(position, publicPosition ? (eligibility?.state ?? null) : null, fit);
  return <article className={`position-card review-strip ${mark}`}><div className="card-index">{position.city ?? "多城市"}<span>{position.district}</span></div><div className="card-main"><div className="card-flags"><span className={`review-seal ${mark}`}>{reviewLabel(mark)}</span><span className={`badge ${statusTone(positionStatus(position))}`}>{positionStatus(position)}</span><span className="badge outline">{employmentLabel}</span><span className="badge outline">{position.languageMode}</span></div><h3>{positionName(position)}</h3><p className="role-line">{position.title} · {position.subjects.join(" / ")}</p><div className="facts"><div><span>薪资</span><strong>{salaryText(position)}</strong></div><div><span>住宿</span><strong>{position.housing.provision}</strong></div><div><span>餐食</span><strong>{position.meals.provision}</strong></div><div><span>截止</span><strong>{formatDate(batch?.deadline)}</strong></div></div><div className="process-line" aria-label="选拔流程">{position.selectionStages.map((step) => <span key={`${position.id}-${step.order}`} className={step.certainty === "unknown" ? "unknown" : ""}>{step.name}</span>)}</div><div className="risk-line"><span>{publicPosition ? `资格：${eligibility?.state}` : `匹配：${fit} / 100`}</span><span>教师资格：{position.requirements.find((item) => item.field === "teacher_certificate")?.text ?? "待确认"}</span><span>专业：{position.requirements.find((item) => item.field === "major")?.text ?? "待确认"}</span></div><div className="source-line"><span className="source-seal">{source ? sourceLevelLabel(source.sourceLevel) : "来源待确认"}</span><span className="source-seal">核验 {position.lastVerified}</span>{sourceLink(position) && <a href={sourceLink(position)} target="_blank" rel="noreferrer">查看证据</a>}</div></div><div className="card-actions"><button className={props.favorite ? "selected" : ""} onClick={props.onFavorite}>{props.favorite ? "已收藏" : "收藏"}</button><button className={props.compared ? "selected" : ""} onClick={props.onCompare}>{props.compared ? "移出比较" : "加入比较"}</button><button onClick={props.onSelect}>查看详情</button><select aria-label="跟进状态" value={props.followup} onChange={(event) => props.onFollowup(event.target.value as FollowupStatus)}>{followupOptions.map((item) => <option key={item}>{item}</option>)}</select></div></article>;
}

function PrivateSchoolsView({ schoolRecords }: { schoolRecords: typeof schools }) {
  return <>
    <SectionHeading code="PRIVATE SCHOOL POOL" title="民办学校" copy="学校官网、招聘入口和政府入池依据分开显示。旧名单能证明学校曾被列入，不能证明当前招聘。" count={`${schoolRecords.length} 所`} />
    <div className="school-grid">{schoolRecords.map((school) => {
      const dataset = datasetByCity.get(school.city);
      const coverage = schoolCoverageRecord(dataset, school.id);
      const positions = allPositions.filter((position) => position.schoolId === school.id);
      const poolEvidence = school.officialPoolEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
      const websiteEvidence = school.officialWebsiteEvidenceId ? evidenceById.get(school.officialWebsiteEvidenceId) : undefined;
      const recruitmentEvidence = school.recruitmentChannelEvidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
      const websiteState = websiteEvidence ? (websiteEvidence.accessState === "ok" ? "已确认" : accessStateLabel(websiteEvidence.accessState)) : "待补";
      const positionText = positions.length
        ? positions.map((item) => item.title).join("、")
        : coverage?.currentOutcome === "待检索"
          ? "尚未逐校检查"
          : coverage?.currentOutcome === "旧线索待复核"
            ? "旧线索未形成结构化岗位"
            : "当前没有结构化岗位";
      return <article className="school-card" key={school.id}>
        <div className="school-card-top"><span>{school.city} · {school.district}</span><span>{school.schoolStages.join(" / ") || "学段待确认"}</span></div>
        <h3>{school.officialName}</h3>
        <p>{school.activeState} · {school.boardingSchool === "yes" ? "寄宿制" : school.boardingSchool === "no" ? "非寄宿" : "寄宿待确认"}</p>
        <div className="evidence-band" aria-label="学校证据状态">
          <div><span>学校官网</span><strong>{websiteState}</strong></div>
          <div><span>招聘入口</span><strong>{coverage?.currentOutcome ?? "待检索"}</strong></div>
          <div><span>联系方式</span><strong>{contactSummary(school)}</strong></div>
        </div>
        <dl>
          <div><dt>检索日期</dt><dd>{coverage?.lastSearchedAt ?? "尚未检索"}</dd></div>
          <div><dt>相关岗位</dt><dd>{positionText}</dd></div>
          <div><dt>食宿证据</dt><dd>{positions.some(housingPositive) ? uniqueText(positions.map((item) => item.housing.provision)).join("、") : "待校方确认"}</dd></div>
        </dl>
        <div className="school-link-row">
          {school.officialWebsite && <a href={school.officialWebsite} target="_blank" rel="noreferrer">学校官网</a>}
          {recruitmentEvidence[0] && <a href={recruitmentEvidence[0].url} target="_blank" rel="noreferrer">招聘入口</a>}
          {poolEvidence[0] && <a href={poolEvidence[0].url} target="_blank" rel="noreferrer">学校池依据</a>}
        </div>
        {school.recruitmentContacts.length > 0 && <details className="contact-panel"><summary>查看公开联系方式</summary><div>{school.recruitmentContacts.map((contact) => {
          const source = evidenceById.get(contact.evidenceId);
          const href = contactHref(contact.channel, contact.value);
          return <p key={contact.id}><span>{contact.purpose} · {contact.validity}</span>{href ? <a href={href}>{contact.value}</a> : <strong>{contact.value}</strong>}<small>{source ? `${sourceLevelLabel(source.sourceLevel)} · ${source.title}` : "来源待确认"}</small></p>;
        })}</div></details>}
      </article>;
    })}</div>
  </>;
}

function PublicExamsView({ positions, schoolRecords, profile, onSelect }: { positions: PositionRecord[]; schoolRecords: typeof schools; profile: CandidateProfile; onSelect: (id: string) => void }) {
  return <><SectionHeading code="PUBLIC EXAM" title="公办招考" copy="事业编制只在政府或人社部门公告明确说明时显示。学校关注目标不是排名。" count={`${schoolRecords.length} 所目标校`} /><div className="public-layout"><div className="public-jobs"><h3>相关招考岗位</h3>{positions.map((position) => { const result = evaluatePublicEligibility(position, profile); const batch = batchById.get(position.batchId); return <article className="exam-card" key={position.id}><div><span>{position.city} · {batch?.employmentType}</span><h4>{positionName(position)}｜{position.title}</h4><p>{position.sourceSummary}</p></div><strong className={`eligibility ${result.state === "明确不满足" ? "negative" : ""}`}>{result.state}</strong><div className="exam-meta"><span>报名截止：{formatDate(batch?.deadline)}</span><span>学历：{position.requirements.find((item) => item.field === "degree")?.text ?? "待确认"}</span><span>专业：{position.requirements.find((item) => item.field === "major")?.text ?? "待确认"}</span></div><div className="process-line">{position.selectionStages.map((item) => <span key={item.order}>{item.name}</span>)}</div><button onClick={() => onSelect(position.id)}>查看条件与证据</button></article>; })}{!positions.length && <div className="empty-state"><strong>该筛选下没有结构化公办岗位</strong><p>公办目标校仍会显示在右侧；未恢复岗位表时不会推测专业目录或编制性质。</p></div>}</div><aside className="target-list"><h3>关注目标校</h3>{schoolRecords.map((school) => <div key={school.id}><span>{school.city} · {school.district}</span><strong>{school.officialName}</strong><small>{school.publicTargetReason ?? "关注目标，依据待补"}</small></div>)}</aside></div></>;
}

function OutcomesView({ outcomes }: { outcomes: CityDataset["outcomes"] }) {
  return <><SectionHeading code="HIRING OUTCOMES" title="录用结果" copy="只保留岗位、学校、学历、毕业院校与专业。姓名、性别、成绩和排名不进入本地数据。" count={`${outcomes.length} 条`} />{outcomes.length ? <div className="outcome-table-wrap"><table className="outcome-table"><thead><tr><th>年份 / 城市</th><th>学校与岗位</th><th>学历</th><th>毕业院校</th><th>专业</th><th>状态</th><th>证据</th></tr></thead><tbody>{outcomes.map((item) => { const school = item.schoolId ? schoolById.get(item.schoolId) : undefined; const source = evidenceById.get(item.evidenceId); return <tr key={item.id}><td>{item.recruitmentYear}<br />{item.city}</td><td><strong>{school?.officialName ?? "统招未分配学校"}</strong><br />{item.subject}</td><td>{item.degree ?? "未公开"}</td><td>{item.graduateInstitution ?? "未公开"}</td><td>{item.majorAsPublished ?? "未公开"}</td><td>{item.stage}</td><td>{source && <a href={source.url} target="_blank" rel="noreferrer">A1 公示</a>}</td></tr>; })}</tbody></table></div> : <div className="empty-state"><strong>当前城市尚无匿名录用样本</strong><p>只在官方公示同时公开学历、院校或专业时录入；没有这些字段的公示只保留覆盖缺口。</p></div>}</>;
}

function CoverageView({ datasets, cityNotes, onCityNote }: { datasets: CityDataset[]; cityNotes: Record<string, string>; onCityNote: (city: string, value: string) => void }) {
  const cityRows = datasets.map((dataset) => {
    const foundOutcomes = new Set(["发现27届岗位", "发现招聘入口", "发现常年入口", "发现往届参考", "发现相关岗位"]);
    return {
      dataset,
      privateCount: dataset.schools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school)).length,
      publicCount: dataset.schools.filter((school) => school.ownership === "公办").length,
      websiteCount: dataset.schools.filter((school) => school.officialWebsiteEvidenceId).length,
      searchedCount: dataset.coverage.filter((record) => record.lastSearchedAt).length,
      pendingCount: dataset.coverage.filter((record) => record.currentOutcome === "待检索").length,
      foundCount: dataset.coverage.filter((record) => foundOutcomes.has(record.currentOutcome)).length,
      contactCount: dataset.schools.reduce((sum, school) => sum + school.recruitmentContacts.length, 0),
    };
  });
  return <>
    <SectionHeading code="COVERAGE & EVIDENCE" title="覆盖与来源" copy="城市状态由正式数据实时计算。零学校不代表当地没有学校，只代表完整官方名单尚未恢复。" count={`${datasets.reduce((sum, item) => sum + item.evidence.length, 0)} 条来源`} />
    <div className="city-comparison-wrap" aria-label="城市比较表">
      <table className="city-comparison">
        <thead><tr><th>城市</th><th>正式民办池</th><th>公办目标</th><th>官网已确认</th><th>已检索</th><th>待检索</th><th>招聘发现</th><th>联系方式</th><th>公开缺口</th></tr></thead>
        <tbody>{cityRows.map(({ dataset, privateCount, publicCount, websiteCount, searchedCount, pendingCount, foundCount, contactCount }) => <tr key={`compare-${dataset.cityId}`}><td><strong>{dataset.cityName}</strong><small>{dataset.province}</small></td><td>{privateCount}</td><td>{publicCount}</td><td>{websiteCount}</td><td>{searchedCount}</td><td>{pendingCount}</td><td>{foundCount}</td><td>{contactCount}</td><td>{dataset.coverageGaps?.length ?? 0}</td></tr>)}</tbody>
      </table>
      <p>岗位为 0 表示当前数据尚未形成结构化岗位，不表示当地没有招聘。生活环境判断仅写入浏览器备注。</p>
    </div>
    <div className="coverage-list">{cityRows.map(({ dataset, websiteCount, searchedCount, pendingCount, foundCount, contactCount }) => {
      const accessProblems = dataset.evidence.filter((item) => item.accessState !== "ok");
      return <article className="coverage-card" key={dataset.cityId}><header><div><span>{dataset.province}</span><h3>{dataset.cityName}</h3></div><strong>{dataset.coverage.length} 条学校检索记录</strong></header><div className="coverage-metrics"><div><span>官网已确认</span><strong>{websiteCount}</strong></div><div><span>已检索</span><strong>{searchedCount}</strong></div><div><span>待检索</span><strong>{pendingCount}</strong></div><div><span>招聘发现</span><strong>{foundCount}</strong></div><div><span>联系方式</span><strong>{contactCount}</strong></div><div><span>访问异常</span><strong>{accessProblems.length}</strong></div></div><div className="coverage-columns"><div><h4>主要来源</h4>{dataset.evidence.slice(0, 4).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span className="source-seal">{sourceLevelLabel(item.sourceLevel)}</span>{item.title}</a>)}</div><div><h4>明确缺口</h4>{(dataset.coverageGaps ?? []).length ? dataset.coverageGaps!.map((gap, index) => <p key={`${dataset.cityId}-gap-${index}`}><strong>{gap.scope}</strong>{gap.description}<small>下一步：{gap.nextAction}</small></p>) : <p>本批次未登记结构性缺口；仍需按招聘季复查岗位。</p>}</div></div><label className="city-note"><span>我的城市备注（仅本浏览器）</span><textarea value={cityNotes[dataset.cityName] ?? ""} onChange={(event) => onCityNote(dataset.cityName, event.target.value)} placeholder="例如：通勤、租房、生活节奏的个人判断" /></label></article>;
    })}</div>
  </>;
}

function PositionModal({ position, profile, note, onNote, onClose }: { position: PositionRecord; profile: CandidateProfile; note: string; onNote: (value: string) => void; onClose: () => void }) {
  const publicPosition = isPublicPosition(position);
  const eligibility = publicPosition ? evaluatePublicEligibility(position, profile) : undefined;
  const fitValue = publicPosition ? null : computePrivateFit(position, profile);
  const mark = reviewMark(position, publicPosition ? (eligibility?.state ?? null) : null, fitValue);
  return <div className="modal-backdrop"><section className="modal detail-modal" role="dialog" aria-modal="true" aria-label="岗位详情">
    <button className="modal-close" onClick={onClose} aria-label="关闭">×</button><span className="eyebrow">POSITION EVIDENCE</span><span className={`review-seal ${mark}`}>{reviewLabel(mark)}</span><h2>{positionName(position)}</h2><p className="detail-role">{position.title} · {position.city ?? "多城市"} · {position.district}</p>
    <div className="detail-grid"><div><span>状态</span><strong>{positionStatus(position)}</strong></div><div><span>用工性质</span><strong>{batchById.get(position.batchId)?.employmentType ?? "未明确"}</strong></div><div><span>薪资</span><strong>{salaryText(position)}</strong></div><div><span>食宿</span><strong>{position.housing.provision} / {position.meals.provision}</strong></div></div>
    <div className="eligibility-detail"><strong>{publicPosition ? `报名资格：${eligibility?.state}` : `民办匹配：${computePrivateFit(position, profile)} / 100`}</strong>{eligibility?.reasons.map((item) => <p key={`failed-${item}`}>不满足：{item}</p>)}{eligibility?.unresolved.map((item) => <p key={`unknown-${item}`}>待确认：{item}</p>)}</div>
    <h3>公开条件</h3><ul className="requirement-list">{position.requirements.map((item, index) => <li key={`${item.field}-${index}`}><span>{item.field}</span><p>{item.text}</p><small>{item.hardness} · {item.evidenceScope}</small></li>)}</ul>
    <h3>选拔流程</h3><ol className="timeline">{position.selectionStages.map((item) => <li key={item.order}><span>{item.order}</span><div><strong>{item.name}</strong><p>{item.detail ?? (item.certainty === "unknown" ? "未公开" : "已在公告中明确")}</p><small>{item.cycle} · {item.format ?? "形式未公开"}</small></div></li>)}</ol>
    <h3>个人备注</h3><textarea className="note-area" value={note} onChange={(event) => onNote(event.target.value)} placeholder="记录提问、材料准备和风险判断" />
    <div className="detail-actions">{applicationLink(position) && <a href={applicationLink(position)} target="_blank" rel="noreferrer">打开投递入口</a>}{sourceLink(position) && <a href={sourceLink(position)} target="_blank" rel="noreferrer">打开证据页</a>}</div>
  </section></div>;
}

function CompareModal({ positions, onRemove, onClose }: { positions: PositionRecord[]; onRemove: (id: string) => void; onClose: () => void }) {
  return <div className="modal-backdrop"><section className="modal compare-modal" role="dialog" aria-modal="true" aria-label="岗位比较"><button className="modal-close" onClick={onClose}>×</button><span className="eyebrow">COMPARE UP TO FOUR</span><h2>岗位比较</h2><div className="compare-grid">{positions.map((position) => <article key={position.id}><span>{position.city ?? "多城市"}</span><h3>{positionName(position)}</h3><p>{position.title}</p><dl><div><dt>状态</dt><dd>{positionStatus(position)}</dd></div><div><dt>薪资</dt><dd>{salaryText(position)}</dd></div><div><dt>住宿</dt><dd>{position.housing.provision}</dd></div><div><dt>餐食</dt><dd>{position.meals.provision}</dd></div><div><dt>语言</dt><dd>{position.languageMode}</dd></div><div><dt>流程</dt><dd>{position.selectionStages.map((item) => item.name).join(" → ")}</dd></div></dl><button onClick={() => onRemove(position.id)}>移出比较</button></article>)}</div></section></div>;
}

function ProfileModal({ profile, onProfile, onClose }: { profile: CandidateProfile; onProfile: (profile: CandidateProfile) => void; onClose: () => void }) {
  return <div className="modal-backdrop"><section className="modal profile-modal" role="dialog" aria-modal="true" aria-label="我的资料">
    <button className="modal-close" onClick={onClose}>×</button>
    <span className="eyebrow">LOCAL PROFILE</span><h2>我的资料</h2><p>只保存在当前浏览器，用于民办匹配分和公办报名资格判断。</p>
    <div className="profile-grid">
      <label><span>毕业年份</span><input type="number" value={profile.graduationYear ?? ""} onChange={(event) => onProfile({ ...profile, graduationYear: Number(event.target.value) || undefined })} /></label>
      <label><span>本科专业</span><input value={profile.bachelorMajor ?? ""} onChange={(event) => onProfile({ ...profile, bachelorMajor: event.target.value })} /></label>
      <label><span>硕士专业</span><input value={profile.masterMajor ?? ""} onChange={(event) => onProfile({ ...profile, masterMajor: event.target.value })} /></label>
      <label><span>教学经验（年）</span><input type="number" min="0" value={profile.teachingExperienceYears ?? ""} onChange={(event) => onProfile({ ...profile, teachingExperienceYears: Number(event.target.value) || 0 })} /></label>
      <label><span>教师资格学段</span><select value={profile.teacherCertificateStage ?? "中学未确认"} onChange={(event) => onProfile({ ...profile, teacherCertificateStage: event.target.value as CandidateProfile["teacherCertificateStage"] })}><option>中学未确认</option><option>初中</option><option>高中</option></select></label>
      <label><span>教师资格学科</span><input value={profile.teacherCertificateSubject ?? ""} onChange={(event) => onProfile({ ...profile, teacherCertificateSubject: event.target.value })} /></label>
      <label><span>普通话等级</span><input value={profile.mandarinLevel ?? ""} onChange={(event) => onProfile({ ...profile, mandarinLevel: event.target.value })} /></label>
      <label><span>IELTS</span><input type="number" min="0" max="9" step="0.5" value={profile.ielts ?? ""} onChange={(event) => onProfile({ ...profile, ielts: Number(event.target.value) || undefined })} /></label>
      <label><span>海外学历认证</span><select value={profile.overseasAuthentication ?? "未开始"} onChange={(event) => onProfile({ ...profile, overseasAuthentication: event.target.value as CandidateProfile["overseasAuthentication"] })}><option>未开始</option><option>办理中</option><option>已完成</option><option>不适用</option></select></label>
      <label><span>住宿偏好</span><select value={profile.housingPreference ?? "优先提供住宿"} onChange={(event) => onProfile({ ...profile, housingPreference: event.target.value as CandidateProfile["housingPreference"] })}><option>必须提供住宿</option><option>优先提供住宿</option><option>不要求住宿</option></select></label>
      <label><span>最低年薪（万）</span><input type="number" value={profile.minimumSalaryAnnual ?? 15} onChange={(event) => onProfile({ ...profile, minimumSalaryAnnual: Number(event.target.value) || undefined })} /></label>
      <label><span>偏好城市（逗号分隔）</span><input value={profile.preferredCities?.join("，") ?? ""} onChange={(event) => onProfile({ ...profile, preferredCities: event.target.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean) })} /></label>
      <label className="profile-checkbox"><input type="checkbox" checked={profile.cet6 ?? false} onChange={(event) => onProfile({ ...profile, cet6: event.target.checked })} /><span>已通过 CET-6</span></label>
      <label className="profile-checkbox"><input type="checkbox" checked={profile.internationalCurriculumExperience ?? false} onChange={(event) => onProfile({ ...profile, internationalCurriculumExperience: event.target.checked })} /><span>有国际课程经验</span></label>
      <label className="profile-checkbox"><input type="checkbox" checked={profile.acceptsSharedHousing ?? false} onChange={(event) => onProfile({ ...profile, acceptsSharedHousing: event.target.checked })} /><span>接受合住</span></label>
    </div>
    <div className="profile-checklist"><h3>报名材料清单</h3><p>中文简历、成绩单、学历/学籍证明、教师资格证、普通话证书、就业推荐表与协议书；国际课程岗另备英文简历和英文试讲材料；公办岗位按公告核对专业目录及海外学历认证。</p><h3>食宿询问清单</h3><p>是否免费、房型与室友、校内或校外、寒暑假能否入住、水电费用、教师餐覆盖餐次、晚修和宿舍值班频率。</p></div>
    <button className="primary-button" onClick={onClose}>保存并关闭</button>
  </section></div>;
}
