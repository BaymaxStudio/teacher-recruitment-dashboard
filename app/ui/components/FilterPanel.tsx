"use client";

import { useRef, useState } from "react";
import { useModal } from "../hooks";
import { CITIES, datasetByCity } from "../data-index";
import { DEFAULT_FILTERS, FILTER_OPTIONS, MORE_FILTER_KEYS, districtsFor, type Filters } from "../filters";
import { Icon } from "./Icon";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  resultCount: number;
  open: boolean;
  narrow: boolean;
  onClose: () => void;
};

function FilterSelect({ label, value, options, onChange, first = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; first?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} data-autofocus={first || undefined}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

// 宽屏为左侧常驻栏；窄屏为抽屉，打开时按模态层处理
export function FilterPanel({ filters, onChange, onReset, resultCount, open, narrow, onClose }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  useModal(ref, narrow && open, onClose);
  const moreActive = MORE_FILTER_KEYS.filter((key) => filters[key] !== DEFAULT_FILTERS[key]).length;
  // 有“更多条件”生效时默认展开；之后由用户自己开合，不因移除条件而突然收起
  const [moreOpen, setMoreOpen] = useState(() => moreActive > 0);
  const cityOptions = ["全部", ...CITIES.filter((city) => filters.province === "全部" || datasetByCity.get(city)?.province === filters.province)];

  return (
    <>
      {narrow && open && <button type="button" className="drawer-scrim" aria-label="关闭筛选" tabIndex={-1} onClick={onClose} />}
      <aside ref={ref} className={`filter-panel${open ? " is-open" : ""}`} aria-label="筛选条件"
        role={narrow && open ? "dialog" : undefined} aria-modal={narrow && open ? true : undefined} tabIndex={-1}>
        <div className="filter-head">
          <strong>筛选</strong>
          <button type="button" className="text-button" onClick={onReset}>重置</button>
          <button type="button" className="icon-button filter-close" onClick={onClose} aria-label="关闭筛选"><Icon name="close" /></button>
        </div>

        <div className="filter-body">
          <FilterSelect label="岗位方向" value={filters.subject} options={FILTER_OPTIONS.subject} onChange={(subject) => onChange({ subject })} first />
          <FilterSelect label="学校性质" value={filters.ownership} options={FILTER_OPTIONS.ownership} onChange={(ownership) => onChange({ ownership })} />
          <FilterSelect label="学段" value={filters.stage} options={FILTER_OPTIONS.stage} onChange={(stage) => onChange({ stage })} />
          <FilterSelect label="住宿" value={filters.housing} options={FILTER_OPTIONS.housing} onChange={(housing) => onChange({ housing })} />

          <div className="field salary-field">
            <label htmlFor="salary-floor">民办年薪底线 <strong>{filters.salaryFloor} 万</strong></label>
            <input id="salary-floor" type="range" min="10" max="35" step="1" value={filters.salaryFloor}
              onChange={(event) => onChange({ salaryFloor: Number(event.target.value) })} />
            <label className="check"><input type="checkbox" checked={filters.showPossibleSalary}
              onChange={(event) => onChange({ showPossibleSalary: event.target.checked })} />区间可能达到</label>
            <label className="check"><input type="checkbox" checked={filters.showUnknownSalary}
              onChange={(event) => onChange({ showUnknownSalary: event.target.checked })} />保留薪资未知</label>
            <p className="field-hint">公办岗位不按民办薪资筛除</p>
          </div>

          <details className="more-filters" open={moreOpen} onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
            <summary>更多条件{moreActive > 0 && <span className="count">{moreActive}</span>}</summary>
            <div className="more-grid">
              <FilterSelect label="省份" value={filters.province} options={["全部", "广东", "浙江", "江苏"]}
                onChange={(province) => onChange({ province, city: "全部", district: "全部" })} />
              <FilterSelect label="城市" value={filters.city} options={cityOptions}
                onChange={(city) => onChange({ city, district: "全部", province: city === "全部" ? filters.province : datasetByCity.get(city)?.province ?? filters.province })} />
              <FilterSelect label="区县" value={filters.district} options={districtsFor(filters.city)} onChange={(district) => onChange({ district })} />
              <FilterSelect label="餐食" value={filters.meals} options={FILTER_OPTIONS.meals} onChange={(meals) => onChange({ meals })} />
              <FilterSelect label="授课语言" value={filters.language} options={FILTER_OPTIONS.language} onChange={(language) => onChange({ language })} />
              <FilterSelect label="教师资格" value={filters.certificate} options={FILTER_OPTIONS.certificate} onChange={(certificate) => onChange({ certificate })} />
              <FilterSelect label="经验" value={filters.experience} options={FILTER_OPTIONS.experience} onChange={(experience) => onChange({ experience })} />
              <FilterSelect label="选拔流程" value={filters.process} options={FILTER_OPTIONS.process} onChange={(process) => onChange({ process })} />
              <FilterSelect label="资格/匹配" value={filters.matchBand} options={FILTER_OPTIONS.matchBand} onChange={(matchBand) => onChange({ matchBand })} />
              <label className="check"><input type="checkbox" checked={filters.favoritesOnly}
                onChange={(event) => onChange({ favoritesOnly: event.target.checked })} />只看收藏</label>
            </div>
          </details>
        </div>

        <div className="filter-foot">
          <button type="button" className="button button-primary" onClick={onClose}>查看 {resultCount} 个岗位</button>
        </div>
      </aside>
    </>
  );
}
