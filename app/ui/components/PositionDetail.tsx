import type { PositionRecord } from "../../recruitment-data";
import { batchById, evidenceById } from "../data-index";
import { accessStateLabel, applicationLink, deadlineText, employmentLabel, positionName, reviewLabel, salaryText, sourceLevelLabel, type Assessment } from "../derive";
import { FOLLOWUP_OPTIONS, type FollowupStatus } from "../usePersistedState";
import { Icon } from "./Icon";
import { StatusBadge } from "./PositionRow";

const FIELD_LABEL: Record<string, string> = {
  graduate_year: "毕业年份", degree: "学历", major: "专业", teacher_certificate: "教师资格", mandarin: "普通话",
  english: "英语", age: "年龄", hukou: "户籍", party_membership: "政治面貌", experience: "经验",
  overseas_degree_authentication: "海外学历认证", other: "其他",
};
const HARDNESS_LABEL = { hard: "硬性", preferred: "优先", unknown: "口径未明" } as const;

type Props = {
  position: PositionRecord;
  assessment: Assessment;
  favorite: boolean;
  compared: boolean;
  followup: FollowupStatus;
  note: string;
  onFavorite: () => void;
  onCompare: () => void;
  onFollowup: (value: FollowupStatus) => void;
  onNote: (value: string) => void;
  onProfile: () => void;
};

export function PositionDetail({ position, assessment, favorite, compared, followup, note, onFavorite, onCompare, onFollowup, onNote, onProfile }: Props) {
  const batch = batchById.get(position.batchId);
  const evidence = (batch?.evidenceIds ?? []).map((id) => evidenceById.get(id)).filter((item) => item != null);
  const apply = applicationLink(position);
  const { eligibility } = assessment;

  return (
    <div className="detail">
      <header className="detail-head">
        <div className="row-meta">
          <StatusBadge position={position} />
          <span>{position.city ?? "多城市"}{position.district ? ` · ${position.district}` : ""}</span>
          <span className="row-employment">{employmentLabel(position)}</span>
        </div>
        <h2 id="detail-title">{positionName(position)}</h2>
        <p className="detail-role">{position.title} · {position.subjects.join(" / ")}</p>
        <div className="detail-actions">
          {apply && <a className="button button-primary" href={apply} target="_blank" rel="noreferrer">打开投递入口<Icon name="external" size={15} /></a>}
          <select className={`followup${followup !== "未开始" ? " is-set" : ""}`} aria-label="跟进状态" value={followup}
            onChange={(event) => onFollowup(event.target.value as FollowupStatus)}>
            {FOLLOWUP_OPTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="button" className={`icon-button${favorite ? " is-on" : ""}`} aria-pressed={favorite} aria-label={favorite ? "取消收藏" : "收藏"} onClick={onFavorite}><Icon name="star" /></button>
          <button type="button" className={`icon-button${compared ? " is-on" : ""}`} aria-pressed={compared} aria-label={compared ? "移出比较" : "加入比较"} onClick={onCompare}><Icon name="compare" /></button>
        </div>
      </header>

      <dl className="detail-facts">
        <div><dt>年薪</dt><dd>{salaryText(position)}<small>{position.salaryBasis}</small></dd></div>
        <div><dt>截止</dt><dd>{deadlineText(position)}</dd></div>
        <div><dt>用工性质</dt><dd>{batch?.employmentType ?? "未明确"}</dd></div>
        <div><dt>名额</dt><dd>{position.vacancyCount ?? "未公开"}</dd></div>
        <div><dt>住宿</dt><dd>{position.housing.provision}{position.housing.note && <small>{position.housing.note}</small>}</dd></div>
        <div><dt>餐食</dt><dd>{position.meals.provision}{position.meals.note && <small>{position.meals.note}</small>}</dd></div>
        <div><dt>授课语言</dt><dd>{position.languageMode}</dd></div>
        <div><dt>班主任</dt><dd>{position.workload.homeroomTeacher}</dd></div>
      </dl>

      <section className={`detail-section assessment ${assessment.mark}`}>
        <h3>{assessment.publicPosition ? "报名资格" : "匹配判断"}<span className="match-label">{reviewLabel(assessment.mark)}</span></h3>
        {assessment.publicPosition ? (
          <>
            <p className="assessment-main">{eligibility?.state}</p>
            {eligibility?.reasons.map((item) => <p key={`no-${item}`} className="reason is-no">不满足：{item}</p>)}
            {eligibility?.unresolved.map((item) => <p key={`q-${item}`} className="reason">待确认：{item}</p>)}
          </>
        ) : (
          <p className="assessment-main">匹配 {assessment.fit} / 100</p>
        )}
        <p className="assessment-hint">判断基于公开条件和 <button type="button" className="text-button" onClick={onProfile}>我的资料</button>，填写得越完整越准确。</p>
      </section>

      <section className="detail-section">
        <h3>公开条件</h3>
        {position.requirements.length ? (
          <ul className="requirements">
            {position.requirements.map((item, index) => (
              <li key={`${item.field}-${index}`}>
                <span className="req-field">{FIELD_LABEL[item.field] ?? item.field}</span>
                <p>{item.text}</p>
                <span className={`req-hard hard-${item.hardness}`}>{HARDNESS_LABEL[item.hardness]}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">公告未列出具体条件。</p>}
      </section>

      <section className="detail-section">
        <h3>选拔流程</h3>
        <ol className="timeline">
          {position.selectionStages.map((item) => (
            <li key={item.order} className={item.certainty === "unknown" ? "is-unknown" : ""}>
              <strong>{item.name}</strong>
              <p>{item.detail ?? (item.certainty === "unknown" ? "细节未公开" : "已在公告中明确")}</p>
              <small>{[item.cycle, item.format ?? "形式未公开"].filter(Boolean).join(" · ")}</small>
            </li>
          ))}
        </ol>
      </section>

      {(position.legacy?.applicationNote || position.legacy?.summary) && (
        <section className="detail-section">
          <h3>投递说明</h3>
          {position.legacy?.summary && <p>{position.legacy.summary}</p>}
          {position.legacy?.applicationNote && <p className="muted">{position.legacy.applicationNote}</p>}
        </section>
      )}

      <section className="detail-section">
        <h3>证据来源</h3>
        {evidence.length ? (
          <ul className="sources">
            {evidence.map((item) => (
              <li key={item.id}>
                <span className="source-level">{sourceLevelLabel(item.sourceLevel)}</span>
                <a href={item.url} target="_blank" rel="noreferrer">{item.title}<Icon name="external" size={13} /></a>
                <small>{item.publisher} · {item.sourceType} · 访问 {item.accessedAt} · {accessStateLabel(item.accessState)}</small>
              </li>
            ))}
          </ul>
        ) : <p className="muted">来源待确认。</p>}
        <p className="muted">岗位信息核验于 {position.lastVerified}。投递前请重新查看学校或主管部门的最新公告。</p>
      </section>

      <section className="detail-section">
        <h3><label htmlFor={`note-${position.id}`}>个人备注</label></h3>
        <textarea id={`note-${position.id}`} className="note-area" value={note} onChange={(event) => onNote(event.target.value)}
          placeholder="记录要问学校的问题、材料准备进度和风险判断" />
      </section>
    </div>
  );
}
