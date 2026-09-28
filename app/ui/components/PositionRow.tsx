import type { PositionRecord } from "../../recruitment-data";
import { deadlineText, employmentLabel, positionName, positionStatus, reviewLabel, salaryText, statusTone, type Assessment } from "../derive";
import { FOLLOWUP_OPTIONS, type FollowupStatus } from "../usePersistedState";
import { Icon } from "./Icon";

type Props = {
  position: PositionRecord;
  assessment: Assessment;
  selected: boolean;
  favorite: boolean;
  compared: boolean;
  followup: FollowupStatus;
  onSelect: () => void;
  onFavorite: () => void;
  onCompare: () => void;
  onFollowup: (value: FollowupStatus) => void;
};

export function StatusBadge({ position }: { position: PositionRecord }) {
  const status = positionStatus(position);
  return <span className={`badge tone-${statusTone(status)}`}>{status}</span>;
}

// compact 用于岗位行：只显示结论和分数，完整说法放在详情与比较里
export function MatchText({ assessment, compact = false }: { assessment: Assessment; compact?: boolean }) {
  const full = assessment.publicPosition ? assessment.eligibility?.state : `匹配 ${assessment.fit} / 100`;
  return (
    <span className={`match ${assessment.mark}`} title={compact ? full : undefined}>
      <span className="match-label">{reviewLabel(assessment.mark)}</span>
      {compact ? (assessment.publicPosition ? "" : assessment.fit) : full}
    </span>
  );
}

export function PositionRow({ position, assessment, selected, favorite, compared, followup, onSelect, onFavorite, onCompare, onFollowup }: Props) {
  const name = positionName(position);
  return (
    <article className={`position-row ${assessment.mark}${selected ? " is-selected" : ""}`} aria-current={selected ? "true" : undefined}>
      <div className="row-main">
        <div className="row-meta">
          <StatusBadge position={position} />
          <span>{position.city ?? "多城市"}{position.district ? ` · ${position.district}` : ""}</span>
          <span className="row-employment">{employmentLabel(position)}</span>
          <span className="row-verified">核验 {position.lastVerified}</span>
        </div>
        <h3 className="row-title">
          <button type="button" onClick={onSelect} aria-expanded={selected}>{name}</button>
        </h3>
        <p className="row-role">{position.title}<span> · {position.subjects.join(" / ")}</span></p>
      </div>

      <dl className="row-facts">
        <div><dt>年薪</dt><dd>{salaryText(position)}</dd></div>
        <div><dt>截止</dt><dd>{deadlineText(position)}</dd></div>
        <div><dt>住宿</dt><dd>{position.housing.provision}</dd></div>
        <div><dt>{assessment.publicPosition ? "报名资格" : "匹配"}</dt><dd><MatchText assessment={assessment} compact /></dd></div>
      </dl>

      <div className="row-actions">
        <button type="button" className={`icon-button${favorite ? " is-on" : ""}`} aria-pressed={favorite}
          aria-label={favorite ? `取消收藏 ${name}` : `收藏 ${name}`} title={favorite ? "取消收藏" : "收藏"} onClick={onFavorite}>
          <Icon name="star" />
        </button>
        <button type="button" className={`icon-button${compared ? " is-on" : ""}`} aria-pressed={compared}
          aria-label={compared ? `移出比较 ${name}` : `加入比较 ${name}`} title={compared ? "移出比较" : "加入比较"} onClick={onCompare}>
          <Icon name="compare" />
        </button>
        <select className={`followup${followup !== "未开始" ? " is-set" : ""}`} aria-label="跟进状态" value={followup}
          onChange={(event) => onFollowup(event.target.value as FollowupStatus)}>
          {FOLLOWUP_OPTIONS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
    </article>
  );
}
