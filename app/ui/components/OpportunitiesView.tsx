import type { ReactNode } from "react";
import type { PositionRecord } from "../../recruitment-data";
import { verificationHealth } from "../../recruitment-data";
import { statusAsOf } from "../data-index";
import type { Assessment } from "../derive";
import { DEFAULT_FILTERS, SORT_OPTIONS, activeChips, type Filters } from "../filters";
import type { StatusFilter, StatusKey } from "../status-group";
import type { FollowupStatus } from "../usePersistedState";
import { FilterPanel } from "./FilterPanel";
import { Icon } from "./Icon";
import { PositionRow } from "./PositionRow";
import { StatusStrip } from "./StatusStrip";

export type RowHandlers = {
  assessments: Map<string, Assessment>;
  selectedId: string | null;
  favorites: string[];
  compareIds: string[];
  followups: Record<string, FollowupStatus>;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
  onFollowup: (id: string, value: FollowupStatus) => void;
};

export function PositionRows({ positions, handlers }: { positions: PositionRecord[]; handlers: RowHandlers }) {
  return (
    <div className="rows">
      {positions.map((position) => {
        const assessment = handlers.assessments.get(position.id);
        if (!assessment) return null;
        return (
          <PositionRow key={position.id} position={position} assessment={assessment}
            selected={handlers.selectedId === position.id}
            favorite={handlers.favorites.includes(position.id)}
            compared={handlers.compareIds.includes(position.id)}
            followup={handlers.followups[position.id] ?? "未开始"}
            onSelect={() => handlers.onSelect(position.id)}
            onFavorite={() => handlers.onFavorite(position.id)}
            onCompare={() => handlers.onCompare(position.id)}
            onFollowup={(value) => handlers.onFollowup(position.id, value)} />
        );
      })}
    </div>
  );
}

// 列表 + 宽屏右侧详情：详情打开时列表仍可见，可以直接点下一条
export function ListDetailLayout({ children, detail, onCloseDetail, className = "" }: { children: ReactNode; detail: ReactNode; onCloseDetail: () => void; className?: string }) {
  return (
    <div className={`list-detail ${className}${detail ? " has-detail" : ""}`}>
      {children}
      {detail && (
        <aside className="detail-pane" aria-labelledby="detail-title">
          <button type="button" className="icon-button detail-close" onClick={onCloseDetail} aria-label="关闭详情"><Icon name="close" /></button>
          {detail}
        </aside>
      )}
    </div>
  );
}

type Props = {
  filters: Filters;
  onFilters: (patch: Partial<Filters>) => void;
  onReset: () => void;
  positions: PositionRecord[];
  counts: Record<StatusKey, number>;
  handlers: RowHandlers;
  filtersOpen: boolean;
  onFiltersOpen: (open: boolean) => void;
  narrow: boolean;
  detail: ReactNode;
  onCloseDetail: () => void;
};

export function OpportunitiesView({ filters, onFilters, onReset, positions, counts, handlers, filtersOpen, onFiltersOpen, narrow, detail, onCloseDetail }: Props) {
  const chips = activeChips(filters);
  const latestVerified = positions.reduce((latest, item) => (item.lastVerified > latest ? item.lastVerified : latest), "");
  const health = latestVerified ? verificationHealth(latestVerified, statusAsOf) : null;
  const referenceCount = counts.past + counts.closed;

  return (
    <ListDetailLayout detail={detail} onCloseDetail={onCloseDetail} className="with-filters">
      <FilterPanel filters={filters} onChange={onFilters} onReset={onReset} resultCount={positions.length}
        open={filtersOpen} narrow={narrow} onClose={() => onFiltersOpen(false)} />

      <section className="list-column" aria-labelledby="list-heading">
        <h1 id="list-heading" className="sr-only">当前机会</h1>
        <StatusStrip value={filters.status} counts={counts} onChange={(status: StatusFilter) => onFilters({ status })} />

        <div className="list-toolbar">
          <button type="button" className="button filter-toggle" onClick={() => onFiltersOpen(true)} aria-expanded={filtersOpen}>
            <Icon name="filter" size={16} />筛选{chips.length > 0 && <span className="count">{chips.length}</span>}
          </button>
          <p className="result-count"><strong>{positions.length}</strong> 个岗位</p>
          <label className="sort">
            <span>排序</span>
            <select value={filters.sort} onChange={(event) => onFilters({ sort: event.target.value as Filters["sort"] })}>
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className="chips" aria-label="已选条件">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="chip" onClick={() => onFilters(resetPatch(chip.key))} aria-label={`移除条件 ${chip.label}`}>
                {chip.label}<Icon name="close" size={13} />
              </button>
            ))}
            <button type="button" className="text-button" onClick={onReset}>全部清除</button>
          </div>
        )}

        {health && health !== "近期核验" && (
          <p className="verify-note"><Icon name="clock" size={15} />岗位信息最近核验于 {latestVerified}，{health === "陈旧" ? "已超过 30 天" : "已超过两周"}。投递前请以学校最新公告为准。</p>
        )}

        <PositionRows positions={positions} handlers={handlers} />

        {positions.length === 0 && (
          <div className="empty-state">
            <strong>当前条件下没有岗位</strong>
            <p>可以放宽城市或薪资条件，或者去“民办学校”看还没有发布岗位的目标校。</p>
            {filters.status === "actionable" && referenceCount > 0 && (
              <button type="button" className="button" onClick={() => onFilters({ status: "reference" })}>看 {referenceCount} 个往届参考岗位</button>
            )}
          </div>
        )}
      </section>
    </ListDetailLayout>
  );
}

// 移除一个条件标签：城市或省份变化时联动清空下级地区
function resetPatch(key: keyof Filters): Partial<Filters> {
  if (key === "province") return { province: "全部", city: "全部", district: "全部" };
  if (key === "city") return { city: "全部", district: "全部" };
  return { [key]: DEFAULT_FILTERS[key] } as Partial<Filters>;
}
