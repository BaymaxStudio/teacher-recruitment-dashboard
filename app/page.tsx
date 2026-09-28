"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { allPositions, batchById, cityDatasets, positionById, schools } from "./ui/data-index";
import { applicationLink, assess, csvCell, deadlineText, downloadText, hasA1PoolEvidence, isPublicPosition, positionName, positionStatus, salaryText } from "./ui/derive";
import { DEFAULT_FILTERS, filterPositions, type Filters } from "./ui/filters";
import { useMediaQuery } from "./ui/hooks";
import { usePersistedState } from "./ui/usePersistedState";
import { CityBar } from "./ui/components/CityBar";
import { CompareTray, CompareView } from "./ui/components/Compare";
import { MyListView } from "./ui/components/MyListView";
import { OpportunitiesView, type RowHandlers } from "./ui/components/OpportunitiesView";
import { PositionDetail } from "./ui/components/PositionDetail";
import { ProfileForm } from "./ui/components/ProfileForm";
import { CoverageView, OutcomesView, PrivateSchoolsView, PublicExamsView, privateSchoolPool } from "./ui/components/SchoolViews";
import { Sheet } from "./ui/components/Sheet";
import { TopBar } from "./ui/components/TopBar";
import { ViewTabs, type ViewKey } from "./ui/components/ViewTabs";

const LIST_VIEWS: ViewKey[] = ["opportunities", "mylist"];

export default function Home() {
  const [view, setView] = useState<ViewKey>("opportunities");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 1100px)");
  const store = usePersistedState();
  const { favorites, followups, notes, profile } = store;

  const updateFilters = useCallback((patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch })), []);
  // 重置筛选条件，保留状态条和排序的选择
  const resetFilters = useCallback(() => setFilters((current) => ({ ...DEFAULT_FILTERS, status: current.status, sort: current.sort })), []);

  const assessments = useMemo(() => new Map(allPositions.map((position) => [position.id, assess(position, profile)])), [profile]);
  const { list, counts } = useMemo(() => filterPositions(allPositions, filters, { assessments, favorites }), [filters, assessments, favorites]);
  const anyStatusList = useMemo(() => filterPositions(allPositions, { ...filters, status: "all" }, { assessments, favorites }).list, [filters, assessments, favorites]);
  // 城市条上的数字：其余条件不变，只放开地区
  const countByCity = useMemo(() => {
    const { list: cityList } = filterPositions(allPositions, { ...filters, province: "全部", city: "全部", district: "全部" }, { assessments, favorites });
    return cityList.reduce<Record<string, number>>((acc, position) => {
      if (position.city) acc[position.city] = (acc[position.city] ?? 0) + 1;
      return acc;
    }, {});
  }, [filters, assessments, favorites]);

  const filteredSchools = useMemo(() => {
    const needle = filters.query.trim().toLowerCase();
    return schools.filter((school) => {
      if (school.institutionType === "教育集团/教培") return false;
      if (filters.province !== "全部" && school.province !== filters.province) return false;
      if (filters.city !== "全部" && school.city !== filters.city) return false;
      if (filters.district !== "全部" && school.district !== filters.district) return false;
      if (filters.ownership !== "全部" && school.ownership !== filters.ownership) return false;
      if (filters.stage !== "全部" && !school.schoolStages.includes(filters.stage as "初中" | "高中")) return false;
      if (needle && !`${school.officialName} ${school.aliasNames.join(" ")} ${school.city} ${school.district}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [filters]);

  const coverageStats = useMemo(() => ({
    privateSchools: schools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school)).length,
    publicTargets: schools.filter((school) => school.ownership === "公办").length,
    outcomes: cityDatasets.reduce((sum, dataset) => sum + dataset.outcomes.length, 0),
    gaps: cityDatasets.reduce((sum, dataset) => sum + (dataset.coverageGaps?.length ?? 0), 0),
  }), []);

  const myListCount = useMemo(() => allPositions.filter((position) => favorites.includes(position.id) || (followups[position.id] ?? "未开始") !== "未开始").length, [favorites, followups]);

  const changeView = (next: ViewKey) => {
    setView(next);
    setSelectedId(null);
    setFiltersOpen(false);
  };

  const toggleCompare = (id: string) => {
    if (!compareIds.includes(id) && compareIds.length >= 4) {
      store.setNotice("最多比较四个岗位。");
      return;
    }
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  // 宽屏上再次点同一行收起详情
  const selectPosition = (id: string) => setSelectedId((current) => (current === id && wide ? null : id));

  // 宽屏详情面板不是模态层，Esc 在这里关闭；模态层会先截获 Esc
  useEffect(() => {
    if (!selectedId || !wide) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, wide]);

  const exportCsv = () => {
    const header = ["城市", "区县", "学校/机构", "岗位", "方向", "状态", "薪资", "住宿", "餐食", "用工性质", "截止日期", "投递入口"];
    const rows = list.map((position) => {
      const batch = batchById.get(position.batchId);
      return [position.city ?? "多城市", position.district, positionName(position), position.title, position.subjects.join("/"), positionStatus(position), salaryText(position), position.housing.provision, position.meals.provision, batch?.employmentType, batch?.deadline, applicationLink(position)];
    });
    downloadText("十四城教师招聘_筛选结果.csv", [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
  };

  const copyTodo = async () => {
    const text = list.slice(0, 30).map((position, index) =>
      `${index + 1}. [${positionStatus(position)}] ${position.city ?? "多城市"}｜${positionName(position)}｜${position.title}｜截止 ${deadlineText(position)}｜${applicationLink(position) ?? "入口待确认"}`,
    ).join("\n");
    try {
      await navigator.clipboard.writeText(text || "当前筛选无岗位");
      store.setNotice("当前筛选已复制为投递待办。");
    } catch {
      store.setNotice("浏览器没有允许写入剪贴板，请改用导出 CSV。");
    }
  };

  const handlers: RowHandlers = {
    assessments,
    selectedId,
    favorites,
    compareIds,
    followups,
    onSelect: selectPosition,
    onFavorite: store.toggleFavorite,
    onCompare: toggleCompare,
    onFollowup: store.setFollowup,
  };

  const selected = selectedId ? positionById.get(selectedId) : undefined;
  const selectedAssessment = selected ? assessments.get(selected.id) : undefined;
  const detail = selected && selectedAssessment ? (
    <PositionDetail position={selected} assessment={selectedAssessment}
      favorite={favorites.includes(selected.id)} compared={compareIds.includes(selected.id)}
      followup={followups[selected.id] ?? "未开始"} note={notes[selected.id] ?? ""}
      onFavorite={() => store.toggleFavorite(selected.id)} onCompare={() => toggleCompare(selected.id)}
      onFollowup={(value) => store.setFollowup(selected.id, value)} onNote={(value) => store.setNote(selected.id, value)}
      onProfile={() => setProfileOpen(true)} />
  ) : null;
  const inlineDetail = wide && LIST_VIEWS.includes(view) ? detail : null;
  const comparePositions = compareIds.map((id) => positionById.get(id)).filter((item) => item != null);

  return (
    <>
      <div className="app-header">
        <TopBar query={filters.query} onQuery={(query) => updateFilters({ query })} onProfile={() => setProfileOpen(true)}
          onBackup={store.backup} onRestore={store.restore} onExportCsv={exportCsv} onCopyTodo={copyTodo} />
        <ViewTabs view={view} onView={changeView} myListCount={myListCount} />
      </div>

      <main id="main" className={`main view-${view}`}>
        {view !== "mylist" && (
          <CityBar city={filters.city} countByCity={countByCity}
            onCity={(province, city) => updateFilters({ province, city, district: "全部" })} />
        )}

        {view === "opportunities" && (
          <OpportunitiesView filters={filters} onFilters={updateFilters} onReset={resetFilters}
            positions={list} counts={counts} handlers={handlers}
            filtersOpen={filtersOpen} onFiltersOpen={setFiltersOpen} narrow={!wide}
            detail={inlineDetail} onCloseDetail={() => setSelectedId(null)} />
        )}
        {view === "mylist" && <MyListView handlers={handlers} detail={inlineDetail} onCloseDetail={() => setSelectedId(null)} />}
        {view === "private" && <PrivateSchoolsView schoolRecords={privateSchoolPool(filteredSchools)} />}
        {view === "public" && (
          <PublicExamsView positions={anyStatusList.filter(isPublicPosition)} schoolRecords={filteredSchools.filter((school) => school.ownership === "公办")}
            assessments={assessments} onSelect={setSelectedId} />
        )}
        {view === "outcomes" && <OutcomesView outcomes={cityDatasets.flatMap((dataset) => dataset.outcomes).filter((item) => filters.city === "全部" || item.city === filters.city)} />}
        {view === "coverage" && (
          <CoverageView stats={coverageStats} cityNotes={store.cityNotes} onCityNote={store.setCityNote}
            datasets={cityDatasets.filter((dataset) => (filters.province === "全部" || dataset.province === filters.province) && (filters.city === "全部" || dataset.cityName === filters.city))} />
        )}
      </main>

      <footer className="footer">
        <strong>十四城中学教师招聘决策台</strong>
        <p>本地单用户版本。无登录、无自动监控、无代投；公开资料无法证明的内容显示为待确认或缺口。来源核验日期见岗位卡；截止状态按当前日期计算。</p>
      </footer>

      {compareIds.length > 0 && <CompareTray count={compareIds.length} onOpen={() => setCompareOpen(true)} onClear={() => setCompareIds([])} />}

      {detail && !inlineDetail && <Sheet label="岗位详情" onClose={() => setSelectedId(null)}>{detail}</Sheet>}
      {compareOpen && (
        <Sheet label="岗位比较" side="center" wide onClose={() => setCompareOpen(false)}>
          <CompareView positions={comparePositions} assessments={assessments} onRemove={toggleCompare} />
        </Sheet>
      )}
      {profileOpen && (
        <Sheet label="我的资料" onClose={() => setProfileOpen(false)}>
          <ProfileForm profile={profile} onProfile={store.setProfile} onDone={() => setProfileOpen(false)} />
        </Sheet>
      )}
      {store.notice && <div className="toast" role="status">{store.notice}</div>}
    </>
  );
}
