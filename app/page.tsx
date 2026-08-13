"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  jobs,
  guangzhouCoverage,
  officialGuangzhouPoolSource,
  officialShenzhenPoolSource,
  shenzhenCoverage,
  sourceLegend,
  type JobRecord,
  type RiskLevel,
} from "./recruitment-data";

type SortKey = "fit" | "salary" | "deadline" | "source" | "process";
type ActionKey = "now" | "ask" | "prepare" | "wait" | "exclude";
type FollowupStatus = "未开始" | "已投递" | "已联系" | "面试中" | "已放弃";

const cityOptions = ["全部", "广州 + 深圳", ...Array.from(new Set(jobs.map((job) => job.city)))];
const roleOptions = ["全部", "政治 + 经济", "政治/道法", "经济/商科", "全球视野/社科", "历史/人文", "其他"];
const statusOptions = ["全部", "27届开放", "常年储备", "等待27届", "26届参考", "已截止"];
const languageOptions = ["全部", "中文", "双语", "全英文", "未公开"];
const followupOptions: FollowupStatus[] = ["未开始", "已投递", "已联系", "面试中", "已放弃"];
const riskRank: Record<RiskLevel, number> = { 低: 1, 中: 2, 高: 3, 待确认: 4 };
const sourceRank = { A: 4, B: 3, C: 2, D: 1 } as const;

const latestVerified = jobs.map((job) => job.lastVerified).sort().at(-1) ?? "2026-08-14";

function verifiedAgeDays(date: string) {
  const verified = new Date(`${date}T00:00:00+08:00`).getTime();
  return Math.max(0, Math.round((Date.now() - verified) / 86400000));
}

function verifiedAgeClass(date: string) {
  const days = verifiedAgeDays(date);
  if (days <= 14) return "verified-fresh";
  if (days <= 30) return "verified-warn";
  return "verified-old";
}

function salaryBand(job: JobRecord, floor: number) {
  if (job.salaryMin == null && job.salaryMax == null) return "unknown";
  if ((job.salaryMin ?? 0) >= floor) return "qualified";
  if ((job.salaryMax ?? job.salaryMin ?? 0) >= floor) return "possible";
  return "low";
}

function salaryText(job: JobRecord) {
  if (job.salaryMin != null && job.salaryMax != null) return `${job.salaryMin}—${job.salaryMax}万/年`;
  if (job.salaryMin != null) return `${job.salaryMin}万/年以上`;
  if (job.salaryMax != null) return `最高${job.salaryMax}万/年`;
  return "薪资待确认";
}

function actionFor(job: JobRecord, floor: number): ActionKey {
  if (salaryBand(job, floor) === "low") return "exclude";
  if (job.status === "27届开放") return "now";
  if (job.status === "常年储备") return "ask";
  if (job.status === "等待27届") return "wait";
  return "prepare";
}

function processSummary(job: JobRecord) {
  const known = job.stages.filter((stage) => stage.certainty === "已明确").map((stage) => stage.name);
  if (!known.length) return "流程未公开";
  return known.slice(0, 4).join(" → ");
}

function deadlineValue(job: JobRecord) {
  return job.deadline ? new Date(job.deadline).getTime() : Number.MAX_SAFE_INTEGER;
}

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

export default function Home() {
  const [city, setCity] = useState("全部");
  const [district, setDistrict] = useState("全部");
  const [orgType, setOrgType] = useState("全部");
  const [curriculum, setCurriculum] = useState("全部");
  const [role, setRole] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [language, setLanguage] = useState("全部");
  const [riskLimit, setRiskLimit] = useState("全部");
  const [certificateRiskLimit, setCertificateRiskLimit] = useState("全部");
  const [languageRiskLimit, setLanguageRiskLimit] = useState("全部");
  const [experienceRiskLimit, setExperienceRiskLimit] = useState("全部");
  const [qualification, setQualification] = useState("全部");
  const [experienceFilter, setExperienceFilter] = useState("全部");
  const [workloadFilter, setWorkloadFilter] = useState("全部");
  const [salaryFloor, setSalaryFloor] = useState(15);
  const [includePossible, setIncludePossible] = useState(false);
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [freshOnly, setFreshOnly] = useState(false);
  const [noWritten, setNoWritten] = useState(false);
  const [hasDemo, setHasDemo] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [onsiteOnly, setOnsiteOnly] = useState(false);
  const [boardingOnly, setBoardingOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [followups, setFollowups] = useState<Record<string, FollowupStatus>>({});
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [followupFilter, setFollowupFilter] = useState<FollowupStatus | "全部">("全部");
  const [showCompare, setShowCompare] = useState(false);
  const [toast, setToast] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [actionQueue, setActionQueue] = useState<ActionKey | "all">("all");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setFavorites(JSON.parse(localStorage.getItem("teacher-job-favorites") || "[]"));
        setNotes(JSON.parse(localStorage.getItem("teacher-job-notes") || "{}"));
        setFollowups(JSON.parse(localStorage.getItem("teacher-job-followups") || "{}"));
      } catch {
        setFavorites([]);
        setNotes({});
        setFollowups({});
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("teacher-job-favorites", JSON.stringify(favorites));
  }, [favorites, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("teacher-job-notes", JSON.stringify(notes));
  }, [notes, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("teacher-job-followups", JSON.stringify(followups));
  }, [followups, storageReady]);

  useEffect(() => {
    if (!selectedId && !showCompare) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setShowCompare(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedId, showCompare]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const list = jobs.filter((job) => {
      const band = salaryBand(job, salaryFloor);
      const searchableRequirements = `${job.certificate} ${job.language} ${job.experience} ${job.workload.join(" ")}`;
      const hasInternationalCurriculum = job.curricula.some((item) => /国际|IB|AP|A-Level|IGCSE|DSE|HKDSE/i.test(item));

      if (actionQueue === "exclude") {
        if (band !== "low") return false;
      } else {
        if (band === "low") return false;
        if (band === "possible" && !includePossible) return false;
        if (band === "unknown" && !includeUnknown) return false;
        if (actionQueue !== "all" && actionFor(job, salaryFloor) !== actionQueue) return false;
      }
      if (city === "广州 + 深圳" && !["广州", "深圳"].includes(job.city)) return false;
      if (!["全部", "广州 + 深圳"].includes(city) && job.city !== city) return false;
      if (district !== "全部" && job.district !== district) return false;
      if (orgType !== "全部" && job.orgType !== orgType) return false;
      if (curriculum === "国内课程" && !job.curricula.includes("国家课程")) return false;
      if (curriculum === "国际课程" && !hasInternationalCurriculum) return false;
      if (role === "政治 + 经济" && !job.roleTags.some((item) => ["政治/道法", "经济/商科"].includes(item))) return false;
      if (!["全部", "政治 + 经济"].includes(role) && !job.roleTags.includes(role)) return false;
      if (status !== "全部" && job.status !== status) return false;
      if (language !== "全部" && job.languageMode !== language) return false;
      if (riskLimit !== "全部" && riskRank[job.majorRisk] > riskRank[riskLimit as RiskLevel]) return false;
      if (certificateRiskLimit !== "全部" && riskRank[job.certificateRisk] > riskRank[certificateRiskLimit as RiskLevel]) return false;
      if (languageRiskLimit !== "全部" && riskRank[job.languageRisk] > riskRank[languageRiskLimit as RiskLevel]) return false;
      if (experienceRiskLimit !== "全部" && riskRank[job.experienceRisk] > riskRank[experienceRiskLimit as RiskLevel]) return false;
      if (qualification === "CET-6" && !/CET-6/i.test(searchableRequirements)) return false;
      if (qualification === "IELTS/TOEFL" && !/IELTS|TOEFL/i.test(searchableRequirements)) return false;
      if (qualification === "PGCE/QTS" && !/PGCE|QTS/i.test(searchableRequirements)) return false;
      if (qualification === "教师资格可后补" && !/到岗前取得|按.*期限取得|培训考取/i.test(job.certificate)) return false;
      if (experienceFilter === "0—2年" && !(job.experienceYears != null && job.experienceYears <= 2)) return false;
      if (experienceFilter === "3年以上" && !(job.experienceYears != null && job.experienceYears >= 3)) return false;
      if (workloadFilter === "明确坐班" && !job.workload.some((item) => /明确坐班/.test(item))) return false;
      if (workloadFilter === "班主任要求/偏好" && !job.workload.some((item) => /班主任(经验|能力|意愿)|承担班主任/.test(item))) return false;
      if (workloadFilter === "明确无夜间值班" && !job.workload.some((item) => /无.*夜间值班/.test(item))) return false;
      if (workloadFilter === "晚班或周末" && !job.workload.some((item) => /晚班|周末/.test(item))) return false;
      if (freshOnly && !["明确接受", "可能接受"].includes(job.freshGraduate)) return false;
      if (noWritten && job.writtenTest !== false) return false;
      if (hasDemo && job.demoLesson !== true) return false;
      if (onlineOnly && job.onlinePossible !== true) return false;
      if (onsiteOnly && job.onlinePossible !== false) return false;
      if (boardingOnly && job.boarding !== true) return false;
      if (normalizedQuery) {
        const haystack = [job.school, job.district, ...job.roles, ...job.curricula, job.summary].join(" ").toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      if (favoritesOnly && !favorites.includes(job.id)) return false;
      if (followupFilter !== "全部" && (followups[job.id] ?? "未开始") !== followupFilter) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sortKey === "salary") return (b.salaryMin ?? -1) - (a.salaryMin ?? -1);
      if (sortKey === "deadline") return deadlineValue(a) - deadlineValue(b);
      if (sortKey === "source") return sourceRank[b.sources[0].level] - sourceRank[a.sources[0].level];
      if (sortKey === "process") {
        const cost = { 低: 1, 中: 2, 高: 3, 待确认: 4 };
        return cost[a.preparationCost] - cost[b.preparationCost];
      }
      return b.fitScore - a.fitScore;
    });
  }, [actionQueue, boardingOnly, certificateRiskLimit, city, curriculum, district, experienceFilter, experienceRiskLimit, favorites, favoritesOnly, followupFilter, followups, freshOnly, hasDemo, includePossible, includeUnknown, language, languageRiskLimit, noWritten, onlineOnly, onsiteOnly, orgType, qualification, query, riskLimit, role, salaryFloor, sortKey, status, workloadFilter]);

  const districtOptions = useMemo(() => [
    "全部",
    ...Array.from(new Set(jobs.filter((job) => city === "全部" || (city === "广州 + 深圳" ? ["广州", "深圳"].includes(job.city) : job.city === city)).map((job) => job.district))),
  ], [city]);

  const selectedJob = jobs.find((job) => job.id === selectedId) ?? null;
  const comparedJobs = compareIds.map((id) => jobs.find((job) => job.id === id)).filter(Boolean) as JobRecord[];
  const stats = useMemo(() => ({
    open27: jobs.filter((job) => job.status === "27届开放").length,
    actionable: jobs.filter((job) => ["27届开放", "常年储备"].includes(job.status)).length,
    qualified: jobs.filter((job) => salaryBand(job, salaryFloor) === "qualified").length,
    unknown: jobs.filter((job) => salaryBand(job, salaryFloor) === "unknown").length,
  }), [salaryFloor]);

  const actionCounts = useMemo(() => {
    const counts: Record<ActionKey, number> = { now: 0, ask: 0, prepare: 0, wait: 0, exclude: 0 };
    jobs.forEach((job) => counts[actionFor(job, salaryFloor)]++);
    return counts;
  }, [salaryFloor]);

  const resetFilters = () => {
    setCity("全部"); setDistrict("全部"); setOrgType("全部"); setCurriculum("全部"); setRole("全部");
    setStatus("全部"); setLanguage("全部"); setRiskLimit("全部"); setCertificateRiskLimit("全部");
    setLanguageRiskLimit("全部"); setExperienceRiskLimit("全部"); setQualification("全部");
    setExperienceFilter("全部"); setWorkloadFilter("全部"); setActionQueue("all");
    setSalaryFloor(15); setIncludePossible(false); setIncludeUnknown(true); setFreshOnly(false); setNoWritten(false);
    setHasDemo(false); setOnlineOnly(false); setOnsiteOnly(false); setBoardingOnly(false); setQuery(""); setSortKey("fit");
    setFavoritesOnly(false); setFollowupFilter("全部");
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) {
        setToast("最多同时比较4所学校");
        return current;
      }
      return [...current, id];
    });
  };

  const exportCsv = () => {
    const header = ["城市", "学校", "岗位", "状态", "年薪", "应届生", "授课语言", "专业风险", "教师资格风险", "经验年限", "截止时间", "最高来源", "邮箱", "跟进状态", "个人备注", "流程", "投递入口"];
    const rows = filteredJobs.map((job) => [
      job.city, job.school, job.roles.join("/"), job.status, salaryText(job), job.freshGraduate, job.languageMode,
      job.majorRisk, job.certificateRisk, job.experienceYears ?? "未公开", job.deadline ?? "", job.sources[0]?.level ?? "",
      job.email ?? "", followups[job.id] ?? "未开始", notes[job.id] ?? "", processSummary(job), job.application,
    ]);
    const content = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `广东民办中学筛选结果_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`已导出${filteredJobs.length}条记录`);
  };

  const copyTodo = async () => {
    const text = filteredJobs.map((job, index) => `${index + 1}. ${job.city}｜${job.school}｜${job.roles.join("、")}｜${job.status}｜跟进：${followups[job.id] ?? "未开始"}｜${salaryText(job)}\n   ${job.applicationNote}\n   ${job.email ? `邮箱：${job.email}\n   ` : ""}${job.application}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已复制${filteredJobs.length}条待办`);
    } catch {
      setToast("浏览器未授权复制，请导出 CSV");
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setToast("邮箱已复制");
    } catch {
      setToast("浏览器未授权复制");
    }
  };

  return (
    <main>
      <header className="hero">
        <div className="hero-kicker">2027 TEACHER RECRUITMENT · GUANGDONG</div>
        <div className="hero-grid">
          <div>
            <h1>广东民办中学<br />秋招决策台</h1>
            <p className="hero-copy">政治、经济与社会科学岗位。把薪资、专业门槛和选拔流程放在同一张桌面上。</p>
          </div>
          <div className="hero-note">
            <span>核验口径</span>
            <strong>校方入口优先</strong>
            <p>26届流程只作参考；未公开不等于没有要求。最近核验：{latestVerified}。</p>
          </div>
        </div>
        <div className="stat-row" aria-label="招聘数据概览">
          <div><strong>{stats.open27}</strong><span>27届开放</span></div>
          <div><strong>{stats.actionable}</strong><span>可投或可询问</span></div>
          <div><strong>{stats.qualified}</strong><span>保底薪资达标</span></div>
          <div><strong>{stats.unknown}</strong><span>薪资待确认</span></div>
          <div><strong>{shenzhenCoverage.length}/{shenzhenCoverage.length}</strong><span>深圳官方池已检索</span></div>
        </div>
      </header>

      <section className="action-strip" aria-label="行动队列">
        <button className={actionQueue === "now" ? "active" : ""} onClick={() => { setStatus("全部"); setActionQueue("now"); setIncludePossible(true); }}><span>现在可投</span><strong>{actionCounts.now}</strong></button>
        <button className={actionQueue === "ask" ? "active" : ""} onClick={() => { setStatus("全部"); setActionQueue("ask"); }}><span>先询问</span><strong>{actionCounts.ask}</strong></button>
        <button className={actionQueue === "prepare" ? "active" : ""} onClick={() => { setStatus("全部"); setActionQueue("prepare"); setIncludePossible(true); }}><span>备考参考</span><strong>{actionCounts.prepare}</strong></button>
        <button className={actionQueue === "wait" ? "active" : ""} onClick={() => { setStatus("全部"); setActionQueue("wait"); }}><span>等待秋招</span><strong>{actionCounts.wait}</strong></button>
        <button className={actionQueue === "exclude" ? "active" : ""} onClick={() => { setStatus("全部"); setActionQueue("exclude"); }}><span>低于当前底线</span><strong>{actionCounts.exclude}</strong></button>
      </section>

      <div className="workspace">
        <aside className="filters" aria-label="筛选条件">
          <div className="filter-heading">
            <div><span>FILTER</span><h2>筛选条件</h2></div>
            <button onClick={resetFilters}>重置</button>
          </div>
          <label className="search-field">
            <span>搜索学校或岗位</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：经济、顺德、全英文" />
          </label>
          <div className="filter-grid">
            <label><span>城市</span><select value={city} onChange={(event) => { setCity(event.target.value); setDistrict("全部"); }}>{cityOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>区</span><select value={district} onChange={(event) => setDistrict(event.target.value)}>{districtOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>机构类型</span><select value={orgType} onChange={(event) => setOrgType(event.target.value)}><option>全部</option><option>全日制学校</option><option>教育集团/教培</option></select></label>
            <label><span>课程</span><select value={curriculum} onChange={(event) => setCurriculum(event.target.value)}><option>全部</option><option>国内课程</option><option>国际课程</option></select></label>
            <label><span>方向</span><select value={role} onChange={(event) => setRole(event.target.value)}>{roleOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>状态</span><select value={status} onChange={(event) => { setStatus(event.target.value); setActionQueue("all"); }}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>语言</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languageOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>语言/国际资质</span><select value={qualification} onChange={(event) => setQualification(event.target.value)}><option>全部</option><option>CET-6</option><option>IELTS/TOEFL</option><option>PGCE/QTS</option><option>教师资格可后补</option></select></label>
            <label><span>经验年限</span><select value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value)}><option>全部</option><option>0—2年</option><option>3年以上</option></select></label>
            <label><span>工作安排</span><select value={workloadFilter} onChange={(event) => setWorkloadFilter(event.target.value)}><option>全部</option><option>明确坐班</option><option>班主任要求/偏好</option><option>明确无夜间值班</option><option>晚班或周末</option></select></label>
            <label><span>跟进状态</span><select value={followupFilter} onChange={(event) => setFollowupFilter(event.target.value as FollowupStatus | "全部")}><option>全部</option>{followupOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>专业风险</span><select value={riskLimit} onChange={(event) => setRiskLimit(event.target.value)}><option>全部</option><option value="低">只看低风险</option><option value="中">不高于中风险</option></select></label>
            <label><span>证书风险</span><select value={certificateRiskLimit} onChange={(event) => setCertificateRiskLimit(event.target.value)}><option>全部</option><option value="低">只看低风险</option><option value="中">不高于中风险</option></select></label>
            <label><span>语言风险</span><select value={languageRiskLimit} onChange={(event) => setLanguageRiskLimit(event.target.value)}><option>全部</option><option value="低">只看低风险</option><option value="中">不高于中风险</option></select></label>
            <label><span>经验风险</span><select value={experienceRiskLimit} onChange={(event) => setExperienceRiskLimit(event.target.value)}><option>全部</option><option value="低">只看低风险</option><option value="中">不高于中风险</option></select></label>
          </div>

          <div className="salary-filter">
            <div><span>税前年薪底线</span><strong>{salaryFloor} 万</strong></div>
            <input aria-label="税前年薪底线" type="range" min="0" max="35" step="1" value={salaryFloor} onChange={(event) => setSalaryFloor(Number(event.target.value))} />
            <small>按公开下限判断，不计未确认奖金。</small>
          </div>

          <div className="check-list">
            <label><input type="checkbox" checked={includePossible} onChange={(event) => setIncludePossible(event.target.checked)} />区间可能达到底线</label>
            <label><input type="checkbox" checked={includeUnknown} onChange={(event) => setIncludeUnknown(event.target.checked)} />显示薪资未知</label>
            <label><input type="checkbox" checked={freshOnly} onChange={(event) => setFreshOnly(event.target.checked)} />只看接受应届生</label>
            <label><input type="checkbox" checked={noWritten} onChange={(event) => setNoWritten(event.target.checked)} />明确无笔试</label>
            <label><input type="checkbox" checked={hasDemo} onChange={(event) => setHasDemo(event.target.checked)} />明确有试讲</label>
            <label><input type="checkbox" checked={onlineOnly} onChange={(event) => setOnlineOnly(event.target.checked)} />支持线上环节</label>
            <label><input type="checkbox" checked={onsiteOnly} onChange={(event) => setOnsiteOnly(event.target.checked)} />明确必须到校</label>
            <label><input type="checkbox" checked={boardingOnly} onChange={(event) => setBoardingOnly(event.target.checked)} />寄宿学校</label>
          </div>

          <div className="legend">
            <h3>来源等级</h3>
            {Object.entries(sourceLegend).map(([level, text]) => <p key={level}><b>{level}</b>{text}</p>)}
          </div>
        </aside>

        <section className="results" aria-live="polite">
          <div className="results-toolbar">
            <div><span>RESULTS</span><h2>{filteredJobs.length} 个结果</h2></div>
            <div className="toolbar-actions">
              <button className={favoritesOnly ? "active" : ""} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((current) => !current)}>只看收藏（{favorites.length}）</button>
              <select aria-label="排序方式" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="fit">匹配程度</option><option value="salary">薪资下限</option><option value="deadline">截止时间</option><option value="source">来源可靠度</option><option value="process">准备成本</option>
              </select>
              <button onClick={copyTodo}>复制待办</button>
              <button onClick={exportCsv}>导出 CSV</button>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="empty-state"><strong>没有符合全部条件的岗位</strong><p>可降低薪资线，或打开“区间可能达到”“显示薪资未知”。</p><button onClick={resetFilters}>恢复默认筛选</button></div>
          ) : (
            <div className="job-list">
              {filteredJobs.map((job) => {
                const band = salaryBand(job, salaryFloor);
                return (
                  <article className="job-card" key={job.id}>
                    <div className="card-topline">
                      <div className="location"><span>{job.city}</span><span>{job.district}</span><span>{job.orgType}</span></div>
                      <div className="card-icons">
                        <button aria-label={favorites.includes(job.id) ? "取消收藏" : "收藏"} className={favorites.includes(job.id) ? "active" : ""} onClick={() => toggleFavorite(job.id)}>{favorites.includes(job.id) ? "★" : "☆"}</button>
                        {(notes[job.id] || "").trim() !== "" && <span className="note-dot" title="有个人备注">●</span>}
                        <label className="compare-check"><input type="checkbox" checked={compareIds.includes(job.id)} onChange={() => toggleCompare(job.id)} />比较</label>
                      </div>
                    </div>
                    <div className="card-title-row">
                      <div><h3>{job.school}</h3><p>{job.schoolType}</p></div>
                      <div className="status-pills">
                        <span className={`status status-${job.status}`}>{job.status}</span>
                        {(followups[job.id] ?? "未开始") !== "未开始" && <span className={`followup followup-${followups[job.id]}`}>{followups[job.id]}</span>}
                      </div>
                    </div>
                    <div className="role-row">{job.roles.map((item) => <span key={item}>{item}</span>)}</div>
                    <p className="summary">{job.summary}</p>

                    <div className="decision-grid">
                      <div><span>年薪</span><strong>{salaryText(job)}</strong><small className={`salary-${band}`}>{band === "qualified" ? "保底达标" : band === "possible" ? "区间可能达到" : band === "unknown" ? "待确认" : "低于底线"}</small></div>
                      <div><span>应届生</span><strong>{job.freshGraduate}</strong><small>{job.experience}</small></div>
                      <div><span>选拔流程</span><strong>{processSummary(job)}</strong><small>准备成本：{job.preparationCost}</small></div>
                    </div>

                    <div className="risk-row">
                      <span>专业 <b className={`risk-${job.majorRisk}`}>{job.majorRisk}</b></span>
                      <span>证书 <b className={`risk-${job.certificateRisk}`}>{job.certificateRisk}</b></span>
                      <span>语言 <b className={`risk-${job.languageRisk}`}>{job.languageRisk}</b></span>
                      <span>经验 <b className={`risk-${job.experienceRisk}`}>{job.experienceRisk}</b></span>
                    </div>

                    <div className="card-footer">
                      <div className="source-pills">{job.sources.slice(0, 3).map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><b>{source.level}</b>{source.label}</a>)}</div>
                      <button className="detail-button" onClick={() => setSelectedId(job.id)}>查看要求与流程 <span>→</span></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="coverage-section">
            <div className="coverage-heading">
              <div><span>COVERAGE</span><h2>深圳 49 所官方民办普高检索记录</h2></div>
              <a href={officialShenzhenPoolSource} target="_blank" rel="noreferrer">查看教育局名单 ↗</a>
            </div>
            <p>“本轮未发现”表示截至 2026-08-14 的公开网页检索未找到政治、经济、社科岗位或明确教师入口，不代表学校没有内部招聘。</p>
            <div className="coverage-grid">
              {shenzhenCoverage.map((item) => <div key={item.name} className={`coverage-item coverage-${item.outcome}`}><span>{item.district}</span><strong>{item.name}</strong><small>{item.outcome} · {item.boarding}</small></div>)}
            </div>
          </section>

          <section className="coverage-section">
            <div className="coverage-heading">
              <div><span>COVERAGE</span><h2>广州 {guangzhouCoverage.length} 所民办普高检索记录</h2></div>
              <a href={officialGuangzhouPoolSource} target="_blank" rel="noreferrer">查看报考指南名单 ↗</a>
            </div>
            <p>名单取自市教育局《2026年高中阶段学校报考指南》民办普高部分；“发现相关岗位”含历史或平台线索，不代表 27 届当前开放；未发现不代表学校没有招聘。</p>
            <div className="coverage-grid">
              {guangzhouCoverage.map((item) => <div key={item.name} className={`coverage-item coverage-${item.outcome}`}><span>{item.district}</span><strong>{item.name}</strong><small>{item.outcome} · {item.boarding}</small></div>)}
            </div>
          </section>
        </section>
      </div>

      {compareIds.length > 0 && (
        <div className="compare-bar"><span>已选 {compareIds.length}/4 所</span><button onClick={() => setCompareIds([])}>清空</button><button className="primary" onClick={() => setShowCompare(true)}>开始比较</button></div>
      )}

      {selectedJob && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button className="close-button" aria-label="关闭" onClick={() => setSelectedId(null)}>×</button>
            <div className="detail-kicker">{selectedJob.city} · {selectedJob.district} · 核验 <span className={verifiedAgeClass(selectedJob.lastVerified)}>{selectedJob.lastVerified}（{verifiedAgeDays(selectedJob.lastVerified)} 天前）</span></div>
            <h2 id="detail-title">{selectedJob.school}</h2>
            <div className="role-row">{selectedJob.roles.map((item) => <span key={item}>{item}</span>)}</div>

            <section className="detail-section"><h3>硬性要求</h3><dl className="requirement-list">
              <div><dt>学历</dt><dd>{selectedJob.degree}</dd></div><div><dt>专业</dt><dd>{selectedJob.major}</dd></div>
              <div><dt>教师资格</dt><dd>{selectedJob.certificate}</dd></div><div><dt>语言</dt><dd>{selectedJob.languageMode}｜{selectedJob.language}</dd></div>
              <div><dt>经验</dt><dd>{selectedJob.experience}</dd></div><div><dt>到岗</dt><dd>{selectedJob.start || "未公开"}</dd></div>
            </dl></section>

            <section className="detail-section"><div className="section-title-row"><h3>选拔流程</h3><span>只展示校方或来源明确内容</span></div>
              <div className="timeline">{selectedJob.stages.map((stage, index) => <div className={`stage stage-${stage.certainty}`} key={`${stage.name}-${index}`}><div className="stage-marker">{index + 1}</div><div><strong>{stage.name}</strong><p>{stage.detail}</p><small>{stage.certainty}{stage.cycle ? ` · ${stage.cycle}` : ""}</small></div></div>)}</div>
            </section>

            <section className="detail-section"><h3>准备材料</h3><div className="material-list">{selectedJob.materials.map((item) => <span key={item}>□ {item}</span>)}</div></section>
            <section className="detail-section"><h3>薪资与工作负担</h3><p className="detail-salary">{salaryText(selectedJob)} <small>{selectedJob.salaryNote}</small></p><div className="tag-cloud">{[...selectedJob.benefits, ...selectedJob.workload].map((item) => <span key={item}>{item}</span>)}</div></section>
            <section className="detail-section"><h3>投递前确认</h3><p>{selectedJob.applicationNote}</p>{selectedJob.email && <p>公开邮箱：<button className="text-button" onClick={() => copyEmail(selectedJob.email || "")}>{selectedJob.email}（复制）</button></p>}</section>
            <section className="detail-section"><h3>信息来源</h3><div className="source-pills detail-sources">{selectedJob.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><b>{source.level}</b>{source.label}</a>)}</div></section>
            <section className="detail-section"><h3>跟进状态</h3><div className="followup-picker">{followupOptions.map((item) => <button key={item} className={(followups[selectedJob.id] ?? "未开始") === item ? "active" : ""} aria-pressed={(followups[selectedJob.id] ?? "未开始") === item} onClick={() => setFollowups((current) => ({ ...current, [selectedJob.id]: item }))}>{item}</button>)}</div></section>
            <section className="detail-section"><h3>个人备注</h3><textarea value={notes[selectedJob.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [selectedJob.id]: event.target.value }))} placeholder="记录联系结果、准备进度或疑问。备注仅保存在当前浏览器。" /></section>
            <div className="detail-actions"><button onClick={() => toggleFavorite(selectedJob.id)}>{favorites.includes(selectedJob.id) ? "取消收藏" : "收藏学校"}</button><a className="primary-link" href={selectedJob.application} target="_blank" rel="noreferrer">打开投递/公告页 ↗</a></div>
          </aside>
        </div>
      )}

      {showCompare && comparedJobs.length > 0 && (
        <div className="overlay compare-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCompare(false); }}>
          <section className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
            <button className="close-button" aria-label="关闭" onClick={() => setShowCompare(false)}>×</button>
            <div className="detail-kicker">SCHOOL COMPARISON</div><h2 id="compare-title">学校比较</h2>
            <div className="compare-table" style={{ "--compare-count": comparedJobs.length } as CSSProperties}>
              <div className="compare-label">学校</div>{comparedJobs.map((job) => <strong key={job.id}>{job.school}</strong>)}
              <div className="compare-label">岗位</div>{comparedJobs.map((job) => <span key={job.id}>{job.roles.join("、")}</span>)}
              <div className="compare-label">年薪</div>{comparedJobs.map((job) => <span key={job.id}>{salaryText(job)}<br /><small>{job.salaryNote}</small></span>)}
              <div className="compare-label">应届生</div>{comparedJobs.map((job) => <span key={job.id}>{job.freshGraduate}</span>)}
              <div className="compare-label">学历</div>{comparedJobs.map((job) => <span key={job.id}>{job.degree}</span>)}
              <div className="compare-label">专业</div>{comparedJobs.map((job) => <span key={job.id}>{job.major}</span>)}
              <div className="compare-label">到岗</div>{comparedJobs.map((job) => <span key={job.id}>{job.start || "未公开"}</span>)}
              <div className="compare-label">语言</div>{comparedJobs.map((job) => <span key={job.id}>{job.languageMode}<br /><small>{job.language}</small></span>)}
              <div className="compare-label">风险</div>{comparedJobs.map((job) => <span key={job.id}>专业 {job.majorRisk}<br />证书 {job.certificateRisk}<br />经验 {job.experienceRisk}</span>)}
              <div className="compare-label">流程</div>{comparedJobs.map((job) => <span key={job.id}>{processSummary(job)}<br /><small>成本 {job.preparationCost}</small></span>)}
              <div className="compare-label">负担</div>{comparedJobs.map((job) => <span key={job.id}>{job.workload.join("；") || "未公开"}</span>)}
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
