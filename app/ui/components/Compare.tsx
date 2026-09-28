import type { PositionRecord } from "../../recruitment-data";
import { deadlineText, employmentLabel, positionName, positionStatus, salaryText, type Assessment } from "../derive";
import { Icon } from "./Icon";
import { MatchText } from "./PositionRow";

export function CompareTray({ count, onOpen, onClear }: { count: number; onOpen: () => void; onClear: () => void }) {
  return (
    <div className="compare-tray" role="region" aria-label="岗位比较">
      <Icon name="compare" />
      <span>已选 {count} / 4 个岗位</span>
      <button type="button" className="button button-primary" onClick={onOpen} disabled={count < 2} title={count < 2 ? "至少选两个岗位" : undefined}>并排比较</button>
      <button type="button" className="text-button" onClick={onClear}>清空</button>
    </div>
  );
}

type Row = { label: string; render: (position: PositionRecord) => React.ReactNode };

export function CompareView({ positions, assessments, onRemove }: { positions: PositionRecord[]; assessments: Map<string, Assessment>; onRemove: (id: string) => void }) {
  const rows: Row[] = [
    { label: "城市", render: (p) => `${p.city ?? "多城市"}${p.district ? ` · ${p.district}` : ""}` },
    { label: "状态", render: (p) => positionStatus(p) },
    { label: "年薪", render: (p) => salaryText(p) },
    { label: "截止", render: (p) => deadlineText(p) },
    { label: "用工性质", render: (p) => employmentLabel(p) },
    { label: "住宿", render: (p) => p.housing.provision },
    { label: "餐食", render: (p) => p.meals.provision },
    { label: "授课语言", render: (p) => p.languageMode },
    { label: "匹配 / 资格", render: (p) => { const a = assessments.get(p.id); return a ? <MatchText assessment={a} /> : "—"; } },
    { label: "选拔流程", render: (p) => p.selectionStages.map((item) => item.name).join(" → ") },
  ];
  return (
    <div className="compare">
      <h2>岗位比较</h2>
      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">项目</span></th>
              {positions.map((p) => (
                <th key={p.id} scope="col">
                  <strong>{positionName(p)}</strong>
                  <span>{p.title}</span>
                  <button type="button" className="text-button" onClick={() => onRemove(p.id)}>移出</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {positions.map((p) => <td key={p.id}>{row.render(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
