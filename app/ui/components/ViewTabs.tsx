export type ViewKey = "opportunities" | "mylist" | "private" | "public" | "outcomes" | "coverage";

const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: "opportunities", label: "当前机会" },
  { key: "mylist", label: "我的清单" },
  { key: "private", label: "民办学校" },
  { key: "public", label: "公办招考" },
  { key: "outcomes", label: "录用结果" },
  { key: "coverage", label: "覆盖与来源" },
];

export function ViewTabs({ view, onView, myListCount }: { view: ViewKey; onView: (view: ViewKey) => void; myListCount: number }) {
  return (
    <nav className="view-tabs" aria-label="主视图">
      <div className="view-tabs-in">
        {VIEWS.map((item) => (
          <button key={item.key} type="button" className={view === item.key ? "active" : ""}
            aria-current={view === item.key ? "page" : undefined} onClick={() => onView(item.key)}>
            {item.label}
            {item.key === "mylist" && myListCount > 0 && <span className="count">{myListCount}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
