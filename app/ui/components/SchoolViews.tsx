import type { CityDataset, PositionRecord, SchoolRecord } from "../../recruitment-data";
import { allPositions, batchById, datasetByCity, evidenceById, schoolById } from "../data-index";
import { accessStateLabel, contactHref, contactSummary, formatDate, housingPositive, hasA1PoolEvidence, positionName, sourceLevelLabel, type Assessment } from "../derive";
import { Icon } from "./Icon";

function ViewHead({ id, title, copy, count }: { id: string; title: string; copy: string; count?: string }) {
  return (
    <div className="view-head">
      <h1 id={id}>{title}{count && <span className="view-count">{count}</span>}</h1>
      <p>{copy}</p>
    </div>
  );
}

// ---- 民办学校 ----

export function PrivateSchoolsView({ schoolRecords }: { schoolRecords: SchoolRecord[] }) {
  return (
    <section className="view" aria-labelledby="private-heading">
      <ViewHead id="private-heading" title="民办学校" count={`${schoolRecords.length} 所`}
        copy="学校官网、招聘入口和政府入池依据分开显示。旧名单能证明学校曾被列入，不能证明当前在招聘。" />
      <ul className="school-list">
        {schoolRecords.map((school) => <SchoolItem key={school.id} school={school} />)}
      </ul>
      {schoolRecords.length === 0 && <div className="empty-state"><strong>当前条件下没有学校</strong><p>换一个城市或清空搜索试试。</p></div>}
    </section>
  );
}

function SchoolItem({ school }: { school: SchoolRecord }) {
  const coverage = datasetByCity.get(school.city)?.coverage.find((record) => record.schoolId === school.id);
  const positions = allPositions.filter((position) => position.schoolId === school.id);
  const poolEvidence = school.officialPoolEvidenceIds.map((id) => evidenceById.get(id)).filter((item) => item != null);
  const websiteEvidence = school.officialWebsiteEvidenceId ? evidenceById.get(school.officialWebsiteEvidenceId) : undefined;
  const recruitmentEvidence = school.recruitmentChannelEvidenceIds.map((id) => evidenceById.get(id)).filter((item) => item != null);
  const websiteState = websiteEvidence ? (websiteEvidence.accessState === "ok" ? "已确认" : accessStateLabel(websiteEvidence.accessState)) : "待补";
  const positionText = positions.length
    ? positions.map((item) => item.title).join("、")
    : coverage?.currentOutcome === "待检索" ? "尚未逐校检查"
      : coverage?.currentOutcome === "旧线索待复核" ? "旧线索未形成结构化岗位" : "当前没有结构化岗位";

  return (
    <li className="school">
      <details>
        <summary>
          <span className="school-main">
            <strong>{school.officialName}</strong>
            <small>{school.city} · {school.district} · {school.schoolStages.join(" / ") || "学段待确认"} · {school.boardingSchool === "yes" ? "寄宿制" : school.boardingSchool === "no" ? "非寄宿" : "寄宿待确认"}</small>
          </span>
          <span className="school-signals">
            <span><em>官网</em>{websiteState}</span>
            <span><em>招聘入口</em>{coverage?.currentOutcome ?? "待检索"}</span>
            <span><em>联系方式</em>{contactSummary(school)}</span>
            <span className={positions.length ? "has-positions" : ""}><em>岗位</em>{positions.length}</span>
          </span>
          <Icon name="chevron" size={16} />
        </summary>
        <div className="school-body">
          <dl className="kv">
            <div><dt>办学状态</dt><dd>{school.activeState}</dd></div>
            <div><dt>检索日期</dt><dd>{coverage?.lastSearchedAt ?? "尚未检索"}</dd></div>
            <div><dt>相关岗位</dt><dd>{positionText}</dd></div>
            <div><dt>食宿证据</dt><dd>{positions.some(housingPositive) ? [...new Set(positions.map((item) => item.housing.provision))].join("、") : "待校方确认"}</dd></div>
          </dl>
          <div className="link-row">
            {school.officialWebsite && <a href={school.officialWebsite} target="_blank" rel="noreferrer">学校官网<Icon name="external" size={13} /></a>}
            {recruitmentEvidence[0] && <a href={recruitmentEvidence[0].url} target="_blank" rel="noreferrer">招聘入口<Icon name="external" size={13} /></a>}
            {poolEvidence[0] && <a href={poolEvidence[0].url} target="_blank" rel="noreferrer">学校池依据<Icon name="external" size={13} /></a>}
          </div>
          {school.recruitmentContacts.length > 0 && (
            <ul className="contacts">
              {school.recruitmentContacts.map((contact) => {
                const source = evidenceById.get(contact.evidenceId);
                const href = contactHref(contact.channel, contact.value);
                return (
                  <li key={contact.id}>
                    <span className="muted">{contact.purpose} · {contact.validity}</span>
                    {href ? <a href={href}>{contact.value}</a> : <strong>{contact.value}</strong>}
                    <small>{source ? `${sourceLevelLabel(source.sourceLevel)} · ${source.title}` : "来源待确认"}</small>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

export function privateSchoolPool(records: SchoolRecord[]) {
  return records.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school));
}

// ---- 公办招考 ----

export function PublicExamsView({ positions, schoolRecords, assessments, onSelect }: { positions: PositionRecord[]; schoolRecords: SchoolRecord[]; assessments: Map<string, Assessment>; onSelect: (id: string) => void }) {
  return (
    <section className="view" aria-labelledby="public-heading">
      <ViewHead id="public-heading" title="公办招考" count={`${positions.length} 个岗位 · ${schoolRecords.length} 所目标校`}
        copy="事业编制只在政府或人社部门公告明确说明时显示。目标校列表不是排名。" />
      <div className="public-layout">
        <div>
          <h2 className="subhead">相关招考岗位</h2>
          <ul className="exam-list">
            {positions.map((position) => {
              const result = assessments.get(position.id)?.eligibility;
              const batch = batchById.get(position.batchId);
              return (
                <li key={position.id} className="exam">
                  <div className="exam-main">
                    <small>{position.city} · {batch?.employmentType}</small>
                    <strong>{positionName(position)}｜{position.title}</strong>
                    <p>{position.sourceSummary}</p>
                    <small>报名截止：{formatDate(batch?.deadline)} · 流程：{position.selectionStages.map((item) => item.name).join(" → ")}</small>
                  </div>
                  <span className={`eligibility${result?.state === "明确不满足" ? " is-no" : result?.state === "满足公开条件" ? " is-ok" : ""}`}>{result?.state}</span>
                  <button type="button" className="button" onClick={() => onSelect(position.id)}>条件与证据</button>
                </li>
              );
            })}
          </ul>
          {positions.length === 0 && <div className="empty-state"><strong>当前条件下没有结构化公办岗位</strong><p>目标校仍会列在右侧；没有恢复岗位表时，不推测专业目录或编制性质。</p></div>}
        </div>
        <aside className="target-list" aria-label="关注目标校">
          <h2 className="subhead">关注目标校</h2>
          <ul>
            {schoolRecords.map((school) => (
              <li key={school.id}>
                <small>{school.city} · {school.district}</small>
                <strong>{school.officialName}</strong>
                <p>{school.publicTargetReason ?? "关注目标，依据待补"}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

// ---- 录用结果 ----

export function OutcomesView({ outcomes }: { outcomes: CityDataset["outcomes"] }) {
  return (
    <section className="view" aria-labelledby="outcomes-heading">
      <ViewHead id="outcomes-heading" title="录用结果" count={`${outcomes.length} 条`}
        copy="只保留岗位、学校、学历、毕业院校与专业。姓名、性别、成绩和排名不进入本地数据。" />
      {outcomes.length ? (
        <div className="table-wrap">
          <table className="ledger">
            <thead><tr><th>年份 / 城市</th><th>学校与岗位</th><th>学历</th><th>毕业院校</th><th>专业</th><th>阶段</th><th>证据</th></tr></thead>
            <tbody>
              {outcomes.map((item) => {
                const school = item.schoolId ? schoolById.get(item.schoolId) : undefined;
                const source = evidenceById.get(item.evidenceId);
                return (
                  <tr key={item.id}>
                    <td>{item.recruitmentYear}<br /><small>{item.city}</small></td>
                    <td><strong>{school?.officialName ?? "统招未分配学校"}</strong><br /><small>{item.subject}</small></td>
                    <td>{item.degree ?? "未公开"}</td>
                    <td>{item.graduateInstitution ?? "未公开"}</td>
                    <td>{item.majorAsPublished ?? "未公开"}</td>
                    <td>{item.stage}</td>
                    <td>{source && <a href={source.url} target="_blank" rel="noreferrer">A1 公示</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><strong>当前城市还没有匿名录用样本</strong><p>只在官方公示同时公开学历、院校或专业时录入；没有这些字段的公示只记为覆盖缺口。</p></div>
      )}
    </section>
  );
}

// ---- 覆盖与来源 ----

type CoverageStats = { privateSchools: number; publicTargets: number; gaps: number; outcomes: number };

export function CoverageView({ datasets, stats, cityNotes, onCityNote }: { datasets: CityDataset[]; stats: CoverageStats; cityNotes: Record<string, string>; onCityNote: (city: string, value: string) => void }) {
  const foundOutcomes = new Set(["发现27届岗位", "发现招聘入口", "发现常年入口", "发现往届参考", "发现相关岗位"]);
  const rows = datasets.map((dataset) => ({
    dataset,
    privateCount: dataset.schools.filter((school) => school.ownership === "民办" && hasA1PoolEvidence(school)).length,
    publicCount: dataset.schools.filter((school) => school.ownership === "公办").length,
    positionCount: dataset.positions.length,
    websiteCount: dataset.schools.filter((school) => school.officialWebsiteEvidenceId).length,
    searchedCount: dataset.coverage.filter((record) => record.lastSearchedAt).length,
    pendingCount: dataset.coverage.filter((record) => record.currentOutcome === "待检索").length,
    foundCount: dataset.coverage.filter((record) => foundOutcomes.has(record.currentOutcome)).length,
    contactCount: dataset.schools.reduce((sum, school) => sum + school.recruitmentContacts.length, 0),
  }));

  return (
    <section className="view" aria-labelledby="coverage-heading">
      <ViewHead id="coverage-heading" title="覆盖与来源" count={`${datasets.reduce((sum, item) => sum + item.evidence.length, 0)} 条来源`}
        copy="城市状态由正式数据实时计算。学校数为零不代表当地没有学校，只代表完整官方名单尚未恢复。" />

      <dl className="stat-grid">
        <div><dt>正式入池民办校</dt><dd>{stats.privateSchools}</dd></div>
        <div><dt>公办关注目标</dt><dd>{stats.publicTargets}</dd></div>
        <div><dt>公开缺口</dt><dd>{stats.gaps}</dd></div>
        <div><dt>匿名录用样本</dt><dd>{stats.outcomes}</dd></div>
      </dl>
      <p className="muted">覆盖口径：广东、浙江、江苏十四城，不含上海；民办税前年薪底线默认 15 万，薪资未知的岗位保留。</p>

      <div className="table-wrap">
        <table className="ledger numeric">
          <thead><tr><th>城市</th><th>正式民办池</th><th>公办目标</th><th>岗位</th><th>官网已确认</th><th>已检索</th><th>待检索</th><th>招聘发现</th><th>联系方式</th><th>公开缺口</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dataset.cityId}>
                <td><strong>{row.dataset.cityName}</strong><small>{row.dataset.province}</small></td>
                <td>{row.privateCount}</td><td>{row.publicCount}</td><td>{row.positionCount}</td><td>{row.websiteCount}</td>
                <td>{row.searchedCount}</td><td>{row.pendingCount}</td><td>{row.foundCount}</td><td>{row.contactCount}</td>
                <td>{row.dataset.coverageGaps?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">岗位为 0 表示当前数据尚未形成结构化岗位，不表示当地没有招聘。</p>

      <div className="city-cards">
        {rows.map(({ dataset }) => {
          const accessProblems = dataset.evidence.filter((item) => item.accessState !== "ok");
          return (
            <details key={dataset.cityId} className="city-card">
              <summary>
                <strong>{dataset.cityName}</strong>
                <small>{dataset.province} · {dataset.coverage.length} 条学校检索记录 · {dataset.coverageGaps?.length ?? 0} 个缺口 · {accessProblems.length} 个来源访问异常</small>
                <Icon name="chevron" size={16} />
              </summary>
              <div className="city-card-body">
                <div>
                  <h3>主要来源</h3>
                  <ul className="sources">
                    {dataset.evidence.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        <span className="source-level">{sourceLevelLabel(item.sourceLevel)}</span>
                        <a href={item.url} target="_blank" rel="noreferrer">{item.title}<Icon name="external" size={13} /></a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>明确缺口</h3>
                  {(dataset.coverageGaps ?? []).length ? (
                    <ul className="gaps">
                      {dataset.coverageGaps!.map((gap, index) => (
                        <li key={`${dataset.cityId}-gap-${index}`}><p>{gap.description}</p><small>下一步：{gap.nextAction}</small></li>
                      ))}
                    </ul>
                  ) : <p className="muted">本批次没有登记结构性缺口；仍需按招聘季复查岗位。</p>}
                </div>
                <label className="field city-note">
                  <span>我的城市备注（只存在本浏览器）</span>
                  <textarea value={cityNotes[dataset.cityName] ?? ""} onChange={(event) => onCityNote(dataset.cityName, event.target.value)}
                    placeholder="例如：通勤、租房、生活节奏的个人判断" />
                </label>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
