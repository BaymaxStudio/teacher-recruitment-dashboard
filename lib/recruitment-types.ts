// V2 招聘数据类型：学校、批次、岗位、证据、录用结果分开存储。
// 设计原则见 outputs/十四城中学教师招聘决策台_V2交付文档.md 第 5 节。

// “未公开”（没有找到信息）、“没有”（明确不存在）、“不适用”（对该岗位无意义）是三个状态。
export type UnknownState = "yes" | "no" | "unknown" | "not_applicable";

export type SourceLevel =
  | "A1_government"
  | "A2_school_official"
  | "B_university_career"
  | "C_recruitment_platform"
  | "D_aggregator";

// 字段结论与来源之间的关系：V1 迁移只能确认来源与岗位有关，不能假定页面逐字段支持结论。
export type EvidenceScope = "field_exact" | "position_general" | "unverified";

export type EmploymentType =
  | "事业编制"
  | "员额/备案制"
  | "人员控制数"
  | "高层次人才引进"
  | "公费师范生/专项"
  | "学校合同"
  | "劳务派遣"
  | "民办学校劳动合同"
  | "教育集团/教培"
  | "未明确";

// 公告语义是状态判断的第一依据；截止年份本身不能证明毕业届次。
export type StatusBasis =
  | "current_2027"
  | "autumn_2027"
  | "evergreen"
  | "reference_2026"
  | "waiting"
  | "unknown";

export type InstitutionType =
  | "公办中学"
  | "民办中学"
  | "国际课程学校"
  | "教育集团/教培";

export type SubjectTag = "政治/道法" | "经济/商科" | "全球视野/社科" | "历史/人文" | "其他";

export type EvidenceRef = {
  // 阶段 A：补充 id，作为 school.officialPoolEvidenceIds / position.salaryEvidenceId /
  // requirement.evidenceId / batch.evidenceIds / coverage.searchEvidenceIds / outcome.evidenceId 的引用目标。
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceLevel: SourceLevel;
  sourceType:
    | "学校名单"
    | "招聘公告"
    | "岗位表"
    | "资格审查"
    | "考试通知"
    | "拟聘用公示"
    | "录用名单"
    | "学校主页"
    | "学校招聘页"
    | "招聘系统"
    | "联系方式页"
    | "官方公众号"
    | "教育部门说明"
    | "公办目标依据"
    | "第三方岗位";
  publishedAt?: string;
  accessedAt: string;
  recruitmentCycle?: string;
  accessState: "ok" | "qr_only" | "login_required" | "blocked" | "dead";
  note?: string;
};

export type RecruitmentContact = {
  id: string;
  channel: "email" | "phone" | "wechat" | "other";
  value: string;
  purpose: "招聘咨询" | "简历投递" | "学校总机" | "招生咨询" | "未明确";
  contactIdentity: "机构" | "公告中的招聘联系人" | "未明确";
  recruitmentCycle: string;
  validity: "当前届次" | "常年" | "往届" | "时效待确认";
  evidenceId: string;
  lastVerified: string;
};

export type SchoolRecord = {
  id: string;
  province: "广东" | "浙江" | "江苏";
  city: string;
  district: string;
  officialName: string;
  aliasNames: string[];
  institutionType: InstitutionType;
  ownership: "公办" | "民办" | "混合或待确认";
  schoolStages: Array<"初中" | "高中">;
  curricula: string[];
  boardingSchool: UnknownState;
  officialWebsite?: string;
  officialWebsiteEvidenceId?: string;
  recruitmentChannelEvidenceIds: string[];
  recruitmentContacts: RecruitmentContact[];
  officialPoolEvidenceIds: string[];
  publicTargetTier?: "核心" | "扩展" | "未入池";
  publicTargetReason?: string;
  activeState: "正常办学" | "更名" | "停办" | "待确认";
  lastVerified: string;
  fieldEvidence?: Partial<Record<
    "officialName" | "ownership" | "schoolStages" | "district" | "activeState" | "boardingSchool",
    string[]
  >>;
  // 阶段 A 兼容：V1 覆盖池里的住宿口径原文（“全住宿/部分住宿/走读/未公开”）
  legacyBoardingLabel?: string;
};

export type RecruitmentBatch = {
  id: string;
  employerName: string;
  recruitingAuthority?: string;
  schoolIds: string[];
  title: string;
  recruitmentCycle: string;
  statusBasis: StatusBasis;
  publishedAt?: string;
  applicationStart?: string;
  deadline?: string;
  expectedStart?: string;
  accepts2027: "yes" | "no" | "possible" | "unknown";
  employmentType: EmploymentType;
  employmentEvidenceId?: string;
  applicationMethod: "web" | "email" | "platform" | "qr" | "onsite" | "unknown";
  applicationUrl?: string;
  applicationEmail?: string;
  evidenceIds: string[];
  lastVerified: string;
};

export type RequirementRule = {
  field:
    | "graduate_year"
    | "degree"
    | "major"
    | "teacher_certificate"
    | "mandarin"
    | "english"
    | "age"
    | "hukou"
    | "party_membership"
    | "experience"
    | "overseas_degree_authentication"
    | "other";
  text: string;
  hardness: "hard" | "preferred" | "unknown";
  evidenceId?: string;
  evidenceScope: EvidenceScope;
};

// provision 相比交付文档多两个状态：
// “免费（房型未公开）”：V1 数据里“免费教师公寓”“免费食宿”能确认免费，但无法确认单间还是合住。
// “提供（费用未公开）”：仅写“提供食宿/提供住宿/校方住宿”，是否免费未确认，不得归入免费或教师公寓。
export type HousingBenefit = {
  provision:
    | "免费单间"
    | "免费合住"
    | "免费（房型未公开）"
    | "教师公寓"
    | "收费宿舍"
    | "人才公寓"
    | "人才公寓或住房补贴"
    | "住房补贴"
    | "提供（费用未公开）"
    | "无住宿"
    | "未公开";
  roomType?: string;
  monthlyCost?: number;
  utilitiesIncluded: UnknownState;
  campusLocation?: "校内" | "校外" | "未公开";
  availableDuringVacation: UnknownState;
  familyAllowed: UnknownState;
  evidenceId?: string;
  evidenceScope: EvidenceScope;
  note?: string;
};

export type MealBenefit = {
  provision:
    | "免费三餐"
    | "免费工作餐"
    | "免费（餐次未公开）"
    | "提供餐食（费用未公开）"
    | "部分免费"
    | "餐费补贴"
    | "食堂自费"
    | "无食堂"
    | "未公开";
  coveredMeals?: string[];
  coveredDays?: string;
  subsidyMonthly?: number;
  evidenceId?: string;
  evidenceScope: EvidenceScope;
  note?: string;
};

export type Workload = {
  officeHours: "明确坐班" | "非坐班" | "未公开";
  eveningStudy: UnknownState;
  residentialDuty: UnknownState;
  homeroomTeacher: "必须" | "优先" | "可能" | "不要求" | "未公开";
  weekendDuty: UnknownState;
  teachingHours?: string;
  evidenceIds: string[];
  evidenceScope: EvidenceScope;
};

// name 保留 string：V1 迁移来的环节名（网申、Offer、云端面试等）不在固定枚举内，
// 阶段 B/E 补充公办流程时再收敛到文档建议的标准环节名。
export type SelectionStageV2 = {
  order: number;
  name: string;
  certainty: "confirmed" | "partial" | "unknown";
  cycle: string;
  format?: "线上" | "线下" | "混合" | "未公开";
  detail?: string;
  durationMinutes?: number;
  scoreWeight?: number;
  evidenceId?: string;
  materials?: string[];
};

export type PositionRecord = {
  id: string;
  batchId: string;
  schoolId?: string;
  city: string | null; // 14 城之一；教培“多城市”岗位为 null
  district: string;
  stage: "初中" | "高中" | "初高中" | "未公开";
  subjects: SubjectTag[];
  title: string;
  vacancyCount?: number;
  salaryAnnualMin?: number;
  salaryAnnualMax?: number;
  salaryBasis: "税前年薪" | "月薪乘12" | "工资政策" | "未公开";
  salaryEvidenceId?: string;
  salaryEvidenceScope: EvidenceScope;
  languageMode: "中文" | "双语" | "全英文" | "未公开";
  requirements: RequirementRule[];
  housing: HousingBenefit;
  meals: MealBenefit;
  workload: Workload;
  selectionStages: SelectionStageV2[];
  sourceSummary: string;
  lastVerified: string;
  // 阶段 A 迁移层：V1 静态匹配分，用户资料就绪前作为兼容回退值
  legacyFitScore?: number;
  // 阶段 A 迁移层：尚未结构化的 V1 文本字段（摘要、风险、投递说明等），原样保留，不静默丢失
  legacy?: {
    city: string;
    orgType: "全日制学校" | "教育集团/教培";
    schoolType: string;
    curricula: string[];
    roles: string[];
    freshGraduate: string;
    degree: string;
    major: string;
    certificate: string;
    language: string;
    experienceYears?: number;
    experience: string;
    salaryNote: string;
    benefits: string[];
    workloadNotes: string[];
    boarding: boolean | null;
    writtenTest: boolean | null;
    demoLesson: boolean | null;
    onlinePossible: boolean | null;
    certificateRisk: string;
    majorRisk: string;
    languageRisk: string;
    experienceRisk: string;
    preparationCost: string;
    materials: string[];
    application: string;
    email?: string;
    applicationNote: string;
    summary: string;
    reviewHint?: string;
    status: string;
    published?: string;
    deadline?: string;
    start?: string;
  };
};

// 录用结果证据。禁止加入姓名、性别、出生日期、身份证号、电话、邮箱、照片、准考证号。
export type HiringOutcome = {
  id: string;
  recruitmentBatchId?: string;
  positionId?: string;
  schoolId?: string;
  city: string;
  recruitmentYear: number;
  stage: "入围体检" | "考察" | "拟聘用" | "正式录用";
  subject?: string;
  schoolStage?: string;
  graduateInstitution?: string;
  graduateInstitutionCountryOrRegion?: string;
  degree?: string;
  majorAsPublished?: string;
  candidateType?: "应届" | "社会人员" | "未公开";
  employmentType?: EmploymentType;
  evidenceId: string;
  fieldsAvailable: string[];
  note?: string;
};

export type CoverageRecordV2 = {
  schoolId: string;
  city: string;
  lastSearchedAt?: string;
  currentOutcome:
    | "发现27届岗位"
    | "发现招聘入口"
    | "发现常年入口"
    | "发现往届参考"
    | "发现相关岗位"
    | "旧线索待复核"
    | "待检索"
    | "本轮未发现"
    | "页面受阻"
    | "仅二维码";
  relevantPositionIds: string[];
  searchEvidenceIds: string[];
  nextReviewHint?: string;
  // 阶段 A 兼容：V1 覆盖池 outcome 原文（“发现相关岗位/发现教师入口/本轮未发现相关岗位”）
  recordOrigin?: "v1_migration" | "native_v2";
  legacyOutcomeLabel?: string;
};

export type CoverageGap = {
  scope: "private_school_pool" | "public_target_pool" | "district" | "source_access" | "recruitment" | "outcomes";
  description: string;
  evidenceIds: string[];
  nextAction: string;
};

export type UnresolvedAlias = {
  nameA: string;
  nameB: string;
  reasonUnresolved: string;
  evidenceIds: string[];
};

export type RecruitmentStatus =
  | "27届开放"
  | "2027秋季开放"
  | "常年储备"
  | "等待27届"
  | "26届参考"
  | "已截止"
  | "状态待确认";

export type EligibilityState = "满足公开条件" | "可能满足，需要确认" | "明确不满足" | "信息不足";

export type CandidateProfile = {
  targetArrival?: string;
  bachelorMajor?: string;
  masterMajor?: string;
  masterRegion?: string;
  overseasAuthentication?: "已完成" | "办理中" | "未开始" | "不适用";
  teacherCertificateStage?: "初中" | "高中" | "中学未确认";
  teacherCertificateSubject?: string;
  mandarinLevel?: string;
  cet6?: boolean;
  ielts?: number;
  toefl?: number;
  graduationYear?: number;
  teachingExperienceYears?: number;
  internationalCurriculumExperience?: boolean;
  acceptsSharedHousing?: boolean;
  housingPreference?: "必须提供住宿" | "优先提供住宿" | "不要求住宿";
  minimumSalaryAnnual?: number;
  preferredCities?: string[];
};

export type CityDataset = {
  cityId: string;
  cityName: string;
  province: "广东" | "浙江" | "江苏";
  schools: SchoolRecord[];
  coverage: CoverageRecordV2[];
  batches: RecruitmentBatch[];
  positions: PositionRecord[];
  evidence: EvidenceRef[];
  outcomes: HiringOutcome[];
  coverageGaps?: CoverageGap[];
  unresolvedAliases?: UnresolvedAlias[];
  researchBatchId?: string;
  researchedAt?: string;
  poolSourceUrl?: string;
};
