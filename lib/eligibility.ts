// 公办岗位资格判断：硬门槛逐条返回，不用总分掩盖不满足项。
import type { CandidateProfile, EligibilityState, PositionRecord } from "./recruitment-types.ts";

export type EligibilityResult = {
  state: EligibilityState;
  reasons: string[];
  unresolved: string[];
};

export function evaluatePublicEligibility(position: PositionRecord, profile?: CandidateProfile): EligibilityResult {
  if (!profile) return { state: "信息不足", reasons: [], unresolved: ["请先填写我的资料"] };
  const reasons: string[] = [];
  const unresolved: string[] = [];
  let failed = false;
  for (const rule of position.requirements) {
    if (rule.hardness !== "hard") {
      if (rule.hardness === "unknown") unresolved.push(rule.text);
      continue;
    }
    if (rule.field === "graduate_year") {
      if (!profile.graduationYear) unresolved.push(`毕业年份待填写：${rule.text}`);
      else if (!rule.text.includes(String(profile.graduationYear))) {
        failed = true;
        reasons.push(`毕业年份：${rule.text}`);
      }
    } else if (rule.field === "teacher_certificate") {
      if (!profile.teacherCertificateStage || profile.teacherCertificateStage === "中学未确认") {
        unresolved.push(`教师资格学段待确认：${rule.text}`);
      } else if (/高中|高级中学/.test(rule.text) && profile.teacherCertificateStage !== "高中") {
        failed = true;
        reasons.push(`教师资格：${rule.text}`);
      } else if (profile.teacherCertificateSubject && position.subjects.includes("政治/道法") && !/政治|道法|思想品德/.test(profile.teacherCertificateSubject)) {
        failed = true;
        reasons.push(`教师资格学科：${rule.text}`);
      }
    } else if (rule.field === "major") {
      const majors = `${profile.bachelorMajor ?? ""} ${profile.masterMajor ?? ""}`.trim();
      if (!majors) {
        unresolved.push(`学历专业待填写：${rule.text}`);
      } else {
        const broadMatch = (/政治|马克思|思政|哲学|学科教学/.test(majors) && /政治|思政|马克思|哲学/.test(rule.text))
          || (/经济|贸易|商科/.test(majors) && /经济|贸易|商科/.test(rule.text))
          || (/历史|文博|考古/.test(majors) && /历史|文博|考古/.test(rule.text));
        const explicit = rule.text.split(/[、，,；;/]/).map((item) => item.trim()).filter((item) => item.length >= 4);
        if (!broadMatch && !explicit.some((item) => majors.includes(item) || item.includes(majors))) unresolved.push(`专业目录需招考单位审核：${rule.text}`);
      }
    } else if (rule.field === "degree") {
      if (/硕士|研究生/.test(rule.text) && !profile.masterMajor) unresolved.push(`硕士学历信息待填写：${rule.text}`);
    } else if (rule.field === "experience") {
      const years = Number.parseInt(rule.text.match(/(\d+)\s*年/)?.[1] ?? "0", 10);
      if (years > 0 && profile.teachingExperienceYears == null) unresolved.push(`教学经验待填写：${rule.text}`);
      else if (years > 0 && (profile.teachingExperienceYears ?? 0) < years) {
        failed = true;
        reasons.push(`教学经验：${rule.text}`);
      }
    } else if (rule.field === "overseas_degree_authentication") {
      if (profile.overseasAuthentication !== "已完成" && profile.overseasAuthentication !== "不适用") unresolved.push(`海外学历认证：${rule.text}`);
    } else if (rule.field === "mandarin") {
      if (!profile.mandarinLevel) unresolved.push(`普通话等级待填写：${rule.text}`);
    } else if (rule.field === "english") {
      if (!profile.cet6 && !profile.ielts && !profile.toefl) unresolved.push(`语言成绩待填写：${rule.text}`);
    } else {
      unresolved.push(rule.text);
    }
  }
  if (failed) return { state: "明确不满足", reasons, unresolved };
  if (unresolved.length) return { state: "可能满足，需要确认", reasons, unresolved };
  return { state: "满足公开条件", reasons, unresolved };
}
