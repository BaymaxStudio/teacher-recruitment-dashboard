import { STATUS_KEYS, type StatusFilter, type StatusKey } from "../status-group";

type Props = {
  value: StatusFilter;
  counts: Record<StatusKey, number>;
  onChange: (value: StatusFilter) => void;
};

const ACTIONABLE: StatusKey[] = ["open", "rolling", "waiting", "unknown"];
const REFERENCE: StatusKey[] = ["past", "closed"];

// 状态条：既是概览数字，也是状态筛选。默认“可行动”
export function StatusStrip({ value, counts, onChange }: Props) {
  const sum = (keys: StatusKey[]) => keys.reduce((total, key) => total + counts[key], 0);
  const chip = (key: StatusFilter, label: string, count: number, extra = "") => (
    <button key={key} type="button" className={`status-chip ${extra}${value === key ? " active" : ""}`}
      aria-pressed={value === key} onClick={() => onChange(key)}>
      {label}<span className="status-count">{count}</span>
    </button>
  );
  return (
    <div className="status-strip" role="group" aria-label="按招聘状态筛选">
      <div className="status-group">
        {chip("actionable", "可行动", sum(ACTIONABLE), "is-group")}
        {ACTIONABLE.map((key) => chip(key, STATUS_KEYS[key].label, counts[key], `tone-${key}`))}
      </div>
      <div className="status-group is-reference">
        {chip("reference", "参考", sum(REFERENCE), "is-group")}
        {REFERENCE.map((key) => chip(key, STATUS_KEYS[key].label, counts[key], `tone-${key}`))}
        {chip("all", "全部", sum([...ACTIONABLE, ...REFERENCE]), "is-group")}
      </div>
    </div>
  );
}
