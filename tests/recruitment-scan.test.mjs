// DSH 招聘扫描资料校验器：来源语义、隐私、时效和宁波目标完整性。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { targetManifestPathForCity, validateRecruitmentScan } from "../scripts/validate-recruitment-scan.mjs";

function validScan() {
  return {
    schemaVersion: 1,
    isTemplate: false,
    batchId: "ningbo-dsh-b1",
    province: "浙江",
    city: "宁波",
    researchedAt: "2026-08-21",
    researcher: "DSH",
    sources: [
      {
        id: "src-school-home",
        title: "学校官网",
        url: "https://school.example.edu.cn/",
        publisher: "示例学校",
        sourceLevel: "A2_school_official",
        sourceType: "学校主页",
        publishedAt: null,
        accessedAt: "2026-08-21",
        accessState: "ok",
        recruitmentCycle: "",
        note: "官网首页可访问",
      },
      {
        id: "src-school-job",
        title: "教师招聘公告",
        url: "https://school.example.edu.cn/jobs",
        publisher: "示例学校",
        sourceLevel: "A2_school_official",
        sourceType: "招聘公告",
        publishedAt: "2026-08-20",
        accessedAt: "2026-08-21",
        accessState: "ok",
        recruitmentCycle: "2027届",
        note: "公告正文可访问",
      },
    ],
    schoolScans: [{
      schoolId: "private-nb-example",
      officialName: "宁波示例学校",
      website: { outcome: "found", url: "https://school.example.edu.cn/", evidenceId: "src-school-home", note: "域名归属明确" },
      recruitmentOutcome: "current_2027_found",
      recruitmentChannelEvidenceIds: ["src-school-job"],
      contacts: [{
        id: "contact-nb-example-email",
        channel: "email",
        value: "jobs@example.edu.cn",
        purpose: "简历投递",
        contactIdentity: "机构",
        recruitmentCycle: "2027届",
        validity: "当前届次",
        evidenceId: "src-school-job",
        lastVerified: "2026-08-21",
      }],
      jobLeads: [{
        id: "lead-nb-example-politics",
        title: "高中政治教师",
        subjectTags: ["政治/道法"],
        recruitmentCycle: "2027届",
        status: "2027当前",
        publishedAt: "2026-08-20",
        deadline: null,
        expectedStart: "2027年秋季",
        salaryRaw: "未公开",
        housingRaw: "未公开",
        mealsRaw: "未公开",
        workloadRaw: [],
        requirementsRaw: ["2027届应届毕业生可报", "本科及以上"],
        selectionProcessRaw: [],
        applicationMethod: "email",
        applicationUrl: "https://school.example.edu.cn/jobs",
        sourceEvidenceIds: ["src-school-job"],
        note: "待 Codex 复核，不生成正式岗位",
      }],
      checkedEvidenceIds: ["src-school-home", "src-school-job"],
      searchQueries: ["宁波示例学校 教师招聘 2027"],
      unresolved: [],
    }],
    coverageGaps: [],
    notes: [],
  };
}

test("accepts a structured scan with evidence-backed website, contact and 2027 lead", () => {
  assert.deepEqual(validateRecruitmentScan(validScan()), []);
});

test("a 2027 deadline cannot prove the 2027 graduation cohort", () => {
  const data = validScan();
  const lead = data.schoolScans[0].jobLeads[0];
  lead.recruitmentCycle = "长期招聘，截止2027-01-01";
  lead.deadline = "2027-01-01";
  lead.requirementsRaw = ["本科及以上"];
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /没有明确的 2027 届毕业条件/.test(error)));
});

test("a deadline in the lead text must be copied to the structured field", () => {
  const data = validScan();
  const lead = data.schoolScans[0].jobLeads[0];
  lead.recruitmentCycle = "2027届，简历投递截止2026-09-03";
  lead.deadline = null;
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /必须同步填写 deadline/.test(error)));
});

test("an explicit 2026 cohort cannot remain in the unknown queue", () => {
  const data = validScan();
  const lead = data.schoolScans[0].jobLeads[0];
  lead.recruitmentCycle = "2026届往届公告";
  lead.status = "状态待确认";
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /不得停留在状态待确认/.test(error)));
});

test("target manifests are selected by scan city", () => {
  assert.equal(targetManifestPathForCity("宁波"), "research/handoff/ningbo-targets.json");
  assert.equal(targetManifestPathForCity("苏州"), "research/handoff/suzhou-targets.json");
  assert.equal(targetManifestPathForCity("广州"), undefined);
});

test("rejects a past contact presented as current", () => {
  const data = validScan();
  data.sources[1].recruitmentCycle = "2026届";
  data.schoolScans[0].contacts[0].recruitmentCycle = "2026届";
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /往届来源|未证明 2027/.test(error)));
});

test("not-found recruitment requires pages actually checked and search terms", () => {
  const data = validScan();
  data.schoolScans[0].recruitmentOutcome = "not_found";
  data.schoolScans[0].recruitmentChannelEvidenceIds = [];
  data.schoolScans[0].contacts = [];
  data.schoolScans[0].jobLeads = [];
  data.schoolScans[0].checkedEvidenceIds = [];
  data.schoolScans[0].searchQueries = [];
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /必须记录实际检查页面和搜索词/.test(error)));
});

test("rejects search summaries marked as opened official pages", () => {
  const data = validScan();
  data.sources[0].note = "仅搜索摘要，未实际打开正文";
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /accessState 不能/.test(error)));
});

test("phone and email may appear only in structured recruitment contacts", () => {
  const data = validScan();
  data.notes.push("补充邮箱 somebody@example.com");
  const errors = validateRecruitmentScan(data);
  assert.ok(errors.some((error) => /只能写入 schoolScans\[\]\.contacts/.test(error)));
});

test("Ningbo target manifest contains the approved 12 private and 5 public schools", async () => {
  const manifest = JSON.parse(await readFile(new URL("../research/handoff/ningbo-targets.json", import.meta.url), "utf8"));
  assert.equal(manifest.targetCount, 17);
  assert.equal(manifest.privateSchoolCount, 12);
  assert.equal(manifest.publicTargetCount, 5);
  assert.equal(new Set(manifest.schools.map((school) => school.schoolId)).size, 17);
  assert.equal(manifest.schools.filter((school) => school.ownership === "民办").length, 12);
  assert.equal(manifest.schools.filter((school) => school.ownership === "公办").length, 5);
});

test("formal Ningbo scans cannot omit or add target schools", async () => {
  const manifest = JSON.parse(await readFile(new URL("../research/handoff/ningbo-targets.json", import.meta.url), "utf8"));
  const data = validScan();
  const errors = validateRecruitmentScan(data, { targetManifest: manifest });
  assert.ok(errors.some((error) => /缺少目标学校扫描记录/.test(error)));
  assert.ok(errors.some((error) => /目标清单之外/.test(error)));
});
