import type { CandidateProfile } from "../../recruitment-data";

// 我的资料：只存在当前浏览器，用于民办匹配分和公办报名资格判断
export function ProfileForm({ profile, onProfile, onDone }: { profile: CandidateProfile; onProfile: (profile: CandidateProfile) => void; onDone: () => void }) {
  const set = (patch: Partial<CandidateProfile>) => onProfile({ ...profile, ...patch });
  return (
    <div className="profile">
      <h2>我的资料</h2>
      <p className="muted">只保存在当前浏览器，用于民办匹配分和公办报名资格判断。改动立即生效。</p>

      <div className="profile-grid">
        <label className="field"><span>毕业年份</span>
          <input type="number" value={profile.graduationYear ?? ""} onChange={(event) => set({ graduationYear: Number(event.target.value) || undefined })} data-autofocus /></label>
        <label className="field"><span>本科专业</span>
          <input value={profile.bachelorMajor ?? ""} onChange={(event) => set({ bachelorMajor: event.target.value })} /></label>
        <label className="field"><span>硕士专业</span>
          <input value={profile.masterMajor ?? ""} onChange={(event) => set({ masterMajor: event.target.value })} /></label>
        <label className="field"><span>教学经验（年）</span>
          <input type="number" min="0" value={profile.teachingExperienceYears ?? ""} onChange={(event) => set({ teachingExperienceYears: Number(event.target.value) || 0 })} /></label>
        <label className="field"><span>教师资格学段</span>
          <select value={profile.teacherCertificateStage ?? "中学未确认"} onChange={(event) => set({ teacherCertificateStage: event.target.value as CandidateProfile["teacherCertificateStage"] })}>
            <option>中学未确认</option><option>初中</option><option>高中</option>
          </select></label>
        <label className="field"><span>教师资格学科</span>
          <input value={profile.teacherCertificateSubject ?? ""} onChange={(event) => set({ teacherCertificateSubject: event.target.value })} /></label>
        <label className="field"><span>普通话等级</span>
          <input value={profile.mandarinLevel ?? ""} onChange={(event) => set({ mandarinLevel: event.target.value })} placeholder="二级甲等" /></label>
        <label className="field"><span>IELTS</span>
          <input type="number" min="0" max="9" step="0.5" value={profile.ielts ?? ""} onChange={(event) => set({ ielts: Number(event.target.value) || undefined })} /></label>
        <label className="field"><span>海外学历认证</span>
          <select value={profile.overseasAuthentication ?? "未开始"} onChange={(event) => set({ overseasAuthentication: event.target.value as CandidateProfile["overseasAuthentication"] })}>
            <option>未开始</option><option>办理中</option><option>已完成</option><option>不适用</option>
          </select></label>
        <label className="field"><span>住宿偏好</span>
          <select value={profile.housingPreference ?? "优先提供住宿"} onChange={(event) => set({ housingPreference: event.target.value as CandidateProfile["housingPreference"] })}>
            <option>必须提供住宿</option><option>优先提供住宿</option><option>不要求住宿</option>
          </select></label>
        <label className="field"><span>最低年薪（万）</span>
          <input type="number" value={profile.minimumSalaryAnnual ?? 15} onChange={(event) => set({ minimumSalaryAnnual: Number(event.target.value) || undefined })} /></label>
        <label className="field"><span>偏好城市（逗号分隔）</span>
          <input value={profile.preferredCities?.join("，") ?? ""} onChange={(event) => set({ preferredCities: event.target.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean) })} /></label>
      </div>

      <div className="profile-checks">
        <label className="check"><input type="checkbox" checked={profile.cet6 ?? false} onChange={(event) => set({ cet6: event.target.checked })} />已通过 CET-6</label>
        <label className="check"><input type="checkbox" checked={profile.internationalCurriculumExperience ?? false} onChange={(event) => set({ internationalCurriculumExperience: event.target.checked })} />有国际课程经验</label>
        <label className="check"><input type="checkbox" checked={profile.acceptsSharedHousing ?? false} onChange={(event) => set({ acceptsSharedHousing: event.target.checked })} />接受合住</label>
      </div>

      <div className="checklists">
        <section>
          <h3>报名材料清单</h3>
          <p>中文简历、成绩单、学历/学籍证明、教师资格证、普通话证书、就业推荐表与协议书；国际课程岗另备英文简历和英文试讲材料；公办岗位按公告核对专业目录及海外学历认证。</p>
        </section>
        <section>
          <h3>食宿询问清单</h3>
          <p>是否免费、房型与室友、校内或校外、寒暑假能否入住、水电费用、教师餐覆盖餐次、晚修和宿舍值班频率。</p>
        </section>
      </div>

      <div className="profile-foot"><button type="button" className="button button-primary" onClick={onDone}>完成</button></div>
    </div>
  );
}
