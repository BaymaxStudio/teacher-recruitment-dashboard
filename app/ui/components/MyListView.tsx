import type { ReactNode } from "react";
import { allPositions, batchById } from "../data-index";
import type { FollowupStatus } from "../usePersistedState";
import { ListDetailLayout, PositionRows, type RowHandlers } from "./OpportunitiesView";

// 我的清单：收藏和已开始跟进的岗位，按投递进度分组
const GROUPS: Array<{ key: FollowupStatus | "收藏"; title: string; hint: string }> = [
  { key: "笔试/面试", title: "笔试 / 面试", hint: "准备试讲、笔试或面试" },
  { key: "已投递", title: "已投递", hint: "等待学校回复" },
  { key: "准备材料", title: "准备材料", hint: "整理简历、证书和试讲材料" },
  { key: "收藏", title: "已收藏，未开始", hint: "还没开始跟进的收藏岗位" },
  { key: "已放弃", title: "已放弃", hint: "保留记录，便于回看" },
];

export function MyListView({ handlers, detail, onCloseDetail }: { handlers: RowHandlers; detail: ReactNode; onCloseDetail: () => void }) {
  const { favorites, followups } = handlers;
  const tracked = allPositions.filter((position) => favorites.includes(position.id) || (followups[position.id] ?? "未开始") !== "未开始");
  const groupOf = (id: string) => {
    const followup = followups[id] ?? "未开始";
    return followup === "未开始" ? "收藏" : followup;
  };
  const byDeadline = (a: string, b: string) => (batchById.get(a)?.deadline ?? "9999").localeCompare(batchById.get(b)?.deadline ?? "9999");

  return (
    <ListDetailLayout detail={detail} onCloseDetail={onCloseDetail}>
      <section className="list-column" aria-labelledby="mylist-heading">
        <div className="view-head">
          <h1 id="mylist-heading">我的清单</h1>
          <p>收藏的岗位和已开始跟进的岗位都会出现在这里，按投递进度分组。数据只保存在当前浏览器。</p>
        </div>
        {tracked.length === 0 && (
          <div className="empty-state">
            <strong>清单还是空的</strong>
            <p>在“当前机会”里点岗位右侧的星标收藏，或把跟进状态改成“准备材料”，它就会出现在这里。</p>
          </div>
        )}
        {GROUPS.map((group) => {
          const items = tracked.filter((position) => groupOf(position.id) === group.key)
            .sort((a, b) => byDeadline(a.batchId, b.batchId));
          if (!items.length) return null;
          return (
            <section key={group.key} className={`track-group${group.key === "已放弃" ? " is-muted" : ""}`} aria-labelledby={`group-${group.key}`}>
              <h2 id={`group-${group.key}`}>{group.title}<span className="count">{items.length}</span><small>{group.hint}</small></h2>
              <PositionRows positions={items} handlers={handlers} />
            </section>
          );
        })}
      </section>
    </ListDetailLayout>
  );
}
