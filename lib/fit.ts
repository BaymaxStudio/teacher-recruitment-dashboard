// 民办岗位匹配分：只按公开条件与用户已填写资料计分，未知字段保持中性。
import type { CandidateProfile, PositionRecord, RequirementRule } from "./recruitment-types.ts";

function ruleFor(position: PositionRecord, field: RequirementRule["field"]) {
  return position.requirements.find((rule) => rule.field === field);
}

function includesAny(text: string, values: Array<string | undefined>) {
  return values.some((value) => typeof value === "string" && value.length > 0 && text.includes(value));
}

function housingScore(position: PositionRecord, profile: CandidateProfile) {
  const positive = !["无住宿", "未公开"].includes(position.housing.provision);
  if (profile.housingPreference === "不要求住宿") return 3;
  if (positive) {
    if (position.housing.provision === "免费合住" && profile.acceptsSharedHousing === false) return 1;
    return 5;
  }
  if (position.housing.provision === "未公开" && profile.housingPreference !== "必须提供住宿") return 2;
  return 0;
}

function majorScore(position: PositionRecord, profile: CandidateProfile) {
  const rule = ruleFor(position, "major");
  if (!rule || /未公开|待确认|按岗位审核/.test(rule.text)) return 5;
  const majors = [profile.bachelorMajor, profile.masterMajor].filter(Boolean) as string[];
  if (!majors.length) return 5;
  if (includesAny(rule.text, majors) || majors.some((major) => /经济|贸易/.test(major) && /经济|商科|贸易/.test(rule.text))) return 10;
  return rule.hardness === "hard" ? 0 : 4;
}

function certificateScore(position: PositionRecord, profile: CandidateProfile) {
  const rule = ruleFor(position, "teacher_certificate");
  if (!rule || /未公开|待确认|按岗位审核/.test(rule.text)) return 5;
  let score = 0;
  if (profile.teacherCertificateSubject && (rule.text.includes(profile.teacherCertificateSubject) || position.subjects.some((subject) => subject.includes(profile.teacherCertificateSubject ?? "")))) score += 6;
  if (profile.teacherCertificateStage === "高中" || (profile.teacherCertificateStage === "初中" && position.stage === "初中")) score += 4;
  if (profile.teacherCertificateStage === "中学未确认") score += 2;
  return Math.min(10, score);
}

function languageScore(position: PositionRecord, profile: CandidateProfile) {
  if (position.languageMode === "中文") return 10;
  if (position.languageMode === "未公开") return 5;
  const qualified = (profile.ielts ?? 0) >= 6.5 || (profile.toefl ?? 0) >= 90 || profile.cet6 === true;
  if (qualified && profile.internationalCurriculumExperience) return 10;
  if (qualified) return 8;
  return profile.internationalCurriculumExperience ? 5 : 2;
}

function experienceScore(position: PositionRecord, profile: CandidateProfile) {
  const rule = ruleFor(position, "experience");
  if (!rule || /未公开|待确认|不限|应届|无经验/.test(rule.text)) return 5;
  const years = Number.parseInt(rule.text.match(/(\d+)\s*年/)?.[1] ?? "0", 10);
  if (years > 0 && profile.teachingExperienceYears != null) return profile.teachingExperienceYears >= years ? 10 : 0;
  return rule.hardness === "hard" ? 3 : 6;
}

export function computePrivateFit(position: PositionRecord, profile?: CandidateProfile): number {
  if (!profile) return position.legacyFitScore ?? 50;
  let score = 10;
  if (position.subjects.some((subject) => ["政治/道法", "经济/商科", "全球视野/社科", "历史/人文"].includes(subject))) score += 20;

  const graduate = ruleFor(position, "graduate_year");
  if (!graduate || graduate.hardness !== "hard") score += 7;
  else if (profile.graduationYear && graduate.text.includes(String(profile.graduationYear))) score += 10;

  score += majorScore(position, profile);
  score += certificateScore(position, profile);
  score += languageScore(position, profile);
  score += experienceScore(position, profile);

  const salaryFloor = profile.minimumSalaryAnnual ?? 15;
  if (position.salaryAnnualMin == null && position.salaryAnnualMax == null) score += 5;
  else if ((position.salaryAnnualMin ?? 0) >= salaryFloor) score += 10;
  else if ((position.salaryAnnualMax ?? 0) >= salaryFloor) score += 5;

  score += housingScore(position, profile);
  if (["免费三餐", "免费工作餐", "免费（餐次未公开）", "部分免费", "餐费补贴"].includes(position.meals.provision)) score += 3;
  if (profile.preferredCities?.includes(position.city ?? "")) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}
