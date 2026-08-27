// 经官方来源逐字段核验的原生 V2 增量；无法证明的城市仍保留为覆盖缺口。
import type {
  CityDataset,
  CoverageRecordV2,
  EvidenceRef,
  HiringOutcome,
  PositionRecord,
  RecruitmentBatch,
  SchoolRecord,
} from "../../lib/recruitment-types.ts";
import { normalizeDatasetIntegrity } from "../../lib/recruitment-integrity.ts";

const verifiedAt = "2026-08-21";

function unknownPositionBenefits() {
  return {
    housing: {
      provision: "未公开" as const,
      utilitiesIncluded: "unknown" as const,
      availableDuringVacation: "unknown" as const,
      familyAllowed: "unknown" as const,
      evidenceScope: "unverified" as const,
    },
    meals: {
      provision: "未公开" as const,
      evidenceScope: "unverified" as const,
    },
    workload: {
      officeHours: "未公开" as const,
      eveningStudy: "unknown" as const,
      residentialDuty: "unknown" as const,
      homeroomTeacher: "未公开" as const,
      weekendDuty: "unknown" as const,
      evidenceIds: [] as string[],
      evidenceScope: "unverified" as const,
    },
  };
}

function publicSchool(args: {
  id: string;
  province: "广东" | "浙江" | "江苏";
  city: string;
  district: string;
  officialName: string;
  evidenceIds: string[];
  tier?: "核心" | "扩展";
  reason: string;
  districtVerified?: boolean;
  activeStateVerified?: boolean;
}): SchoolRecord {
  return {
    id: args.id,
    province: args.province,
    city: args.city,
    district: args.district,
    officialName: args.officialName,
    aliasNames: [],
    institutionType: "公办中学",
    ownership: "公办",
    schoolStages: ["高中"],
    curricula: ["国内课程"],
    boardingSchool: "unknown",
    recruitmentChannelEvidenceIds: [],
    recruitmentContacts: [],
    officialPoolEvidenceIds: args.evidenceIds,
    publicTargetTier: args.tier ?? "扩展",
    publicTargetReason: args.reason,
    activeState: args.activeStateVerified === false ? "待确认" : "正常办学",
    lastVerified: verifiedAt,
    fieldEvidence: {
      officialName: args.evidenceIds,
      ownership: args.evidenceIds,
      schoolStages: args.evidenceIds,
      district: args.districtVerified === false ? [] : args.evidenceIds,
      activeState: args.activeStateVerified === false ? [] : args.evidenceIds,
    },
  };
}

function privateSchool(args: {
  id: string;
  province: "浙江" | "江苏";
  city: string;
  district: string;
  officialName: string;
  evidenceId: string;
}): SchoolRecord {
  return {
    id: args.id,
    province: args.province,
    city: args.city,
    district: args.district,
    officialName: args.officialName,
    aliasNames: [],
    institutionType: "民办中学",
    ownership: "民办",
    schoolStages: ["高中"],
    curricula: ["国内课程"],
    boardingSchool: "unknown",
    recruitmentChannelEvidenceIds: [],
    recruitmentContacts: [],
    officialPoolEvidenceIds: [args.evidenceId],
    activeState: "正常办学",
    lastVerified: verifiedAt,
    fieldEvidence: {
      officialName: [args.evidenceId],
      ownership: [args.evidenceId],
      schoolStages: [args.evidenceId],
      district: [args.evidenceId],
      activeState: [args.evidenceId],
    },
  };
}

function listedPrivateSchool(args: {
  id: string;
  province: "广东" | "浙江" | "江苏";
  city: string;
  district: string;
  officialName: string;
  stages: Array<"初中" | "高中">;
  evidenceIds: string[];
  aliasNames?: string[];
  districtVerified?: boolean;
}): SchoolRecord {
  return {
    id: args.id,
    province: args.province,
    city: args.city,
    district: args.district,
    officialName: args.officialName,
    aliasNames: args.aliasNames ?? [],
    institutionType: "民办中学",
    ownership: "民办",
    schoolStages: args.stages,
    curricula: ["国内课程"],
    boardingSchool: "unknown",
    recruitmentChannelEvidenceIds: [],
    recruitmentContacts: [],
    officialPoolEvidenceIds: args.evidenceIds,
    activeState: "正常办学",
    lastVerified: verifiedAt,
    fieldEvidence: {
      officialName: args.evidenceIds,
      ownership: args.evidenceIds,
      schoolStages: args.evidenceIds,
      district: args.districtVerified === false ? [] : args.evidenceIds,
      activeState: args.evidenceIds,
    },
  };
}

function coverageFor(schools: SchoolRecord[], outcome: CoverageRecordV2["currentOutcome"] = "待检索") {
  return schools.map((school): CoverageRecordV2 => ({
    schoolId: school.id,
    city: school.city,
    currentOutcome: outcome,
    relevantPositionIds: [],
    searchEvidenceIds: [],
    recordOrigin: "native_v2",
  }));
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function uniqueCoverage(items: CoverageRecordV2[]) {
  return [...new Map(items.map((item) => [item.schoolId, item])).values()];
}

const guangzhouPublicEvidence: EvidenceRef = {
  id: "src-guangzhou-2026-high-school-guide-public",
  title: "2026年广州市高中阶段学校招生报考指南",
  url: "https://jyj.gz.gov.cn/attachment/8/8024/8024498/10818252.pdf",
  publisher: "广州市招生考试委员会办公室",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2026-05-19",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "指南逐校列出学校性质、普通高中类别、校址所在区和招生计划；目标池表示求职关注范围，不表示排名。",
};

const guangzhouPublicSchools = [
  ["public-gz-huafu", "华南师范大学附属中学", "天河区"],
  ["public-gz-gd-experimental", "广东实验中学", "荔湾区"],
  ["public-gz-guangya", "广东广雅中学", "荔湾区"],
  ["public-gz-zhixin", "广州市执信中学", "越秀区"],
  ["public-gz-no2", "广州市第二中学", "黄埔区"],
  ["public-gz-no6", "广州市第六中学", "海珠区"],
  ["public-gz-foreign", "广州外国语学校", "南沙区"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "广东", city: "广州", district, officialName,
  evidenceIds: [guangzhouPublicEvidence.id], tier: "核心",
  reason: "广州市2026年高中阶段学校招生报考指南列明的公办普通高中候选校",
}));

const shenzhenPublicEvidence: EvidenceRef = {
  id: "src-shenzhen-2026-public-high-school-quota",
  title: "深圳市2026年公办普通高中名额分配招生计划表",
  url: "https://szeb.sz.gov.cn/attachment/1/1714/1714582/12794780.pdf",
  publisher: "深圳市教育局",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2026-05-01",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "计划表明确学校属于公办普通高中并列出2026年招生名额；表内未逐校提供区县，区县字段暂不引用本证据。",
};

const shenzhenPublicSchools = [
  ["public-sz-shenzhen-middle", "深圳中学", "待确认"],
  ["public-sz-experimental", "深圳实验学校（高中部）", "待确认"],
  ["public-sz-foreign", "深圳外国语学校", "待确认"],
  ["public-sz-senior", "深圳市高级中学中心校区", "待确认"],
  ["public-sz-hongling", "红岭中学", "待确认"],
  ["public-sz-baoan", "宝安中学（集团）高中部", "待确认"],
  ["public-sz-yucai", "育才中学", "待确认"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "广东", city: "深圳", district, officialName,
  evidenceIds: [shenzhenPublicEvidence.id], tier: "核心", districtVerified: false,
  reason: "深圳市教育局2026年公办普通高中名额分配计划所列候选校",
}));

const foshanPublicEvidence: EvidenceRef = {
  id: "src-foshan-2025-high-level-school-admission",
  title: "佛山市2025年中考提前批自主招生信息汇总",
  url: "https://edu.foshan.gov.cn/jyxx/jyxx_jyzc/fsszkw/zsdt/content/post_6575818.html",
  publisher: "佛山市教育局招生办",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2025-05-11",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "官方汇总列出市级高水平特色创建项目学校；目标池表示求职关注范围，不表示排名。",
};

const foshanPublicSchools = [
  ["public-fs-no1", "佛山市第一中学", "待确认", false],
  ["public-fs-shimen", "佛山市南海区石门中学", "南海区", true],
  ["public-fs-shunde-no1", "佛山市顺德区第一中学", "顺德区", true],
  ["public-fs-nanhai", "佛山市南海区南海中学", "南海区", true],
  ["public-fs-lizhaoji", "佛山市顺德区李兆基中学", "顺德区", true],
].map(([id, officialName, district, districtVerified]) => publicSchool({
  id: String(id), province: "广东", city: "佛山", district: String(district), officialName: String(officialName),
  evidenceIds: [foshanPublicEvidence.id], tier: "核心", districtVerified: Boolean(districtVerified),
  reason: "佛山市教育局招生办2025年高水平特色创建项目学校候选校",
}));

const huizhouPublicEvidence: EvidenceRef = {
  id: "src-huizhou-2026-high-school-admission-qa",
  title: "惠州市2026年普通高中招生常见问题答疑",
  url: "https://jyj.huizhou.gov.cn/zmhd/zczx/content/post_5769782.html",
  publisher: "惠州市教育局",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2026-05-14",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "答疑列出第一批次公办高中及招生范围；市直两校所在区县未由正文直接证明，区县暂记待确认。",
};

const huizhouPublicSchools = [
  ["public-hz-no1", "惠州市第一中学", "待确认", false],
  ["public-hz-huizhou", "惠州中学", "待确认", false],
  ["public-hz-huiyang", "惠阳高级中学高中部", "惠阳区", true],
  ["public-hz-boluo", "博罗中学", "博罗县", true],
  ["public-hz-huidong", "惠东高级中学", "惠东县", true],
].map(([id, officialName, district, districtVerified]) => publicSchool({
  id: String(id), province: "广东", city: "惠州", district: String(district), officialName: String(officialName),
  evidenceIds: [huizhouPublicEvidence.id], tier: "核心", districtVerified: Boolean(districtVerified),
  reason: "惠州市教育局2026年普通高中第一批次招生答疑所列候选校",
}));

const dongguanPublicEvidence: EvidenceRef = {
  id: "src-dongguan-2025-public-high-school-quota",
  title: "关于做好2025年高中阶段学校招生填报志愿及录取工作的通知",
  url: "https://edu.dg.gov.cn/jyzx/gsgg/content/post_4388572.html",
  publisher: "东莞市教育局",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2025-05-29",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "通知明确列举优质公办普通高中名额分配学校；正文未逐校提供园区镇街，区县字段暂不引用本证据。",
};

const dongguanPublicSchools = [
  ["public-dg-dongguan", "东莞市东莞中学", "待确认"],
  ["public-dg-no1", "东莞市第一中学", "待确认"],
  ["public-dg-senior", "东莞高级中学", "待确认"],
  ["public-dg-experimental", "东莞实验中学", "待确认"],
  ["public-dg-songshan", "东莞市东莞中学松山湖学校", "待确认"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "广东", city: "东莞", district, officialName,
  evidenceIds: [dongguanPublicEvidence.id], tier: "核心", districtVerified: false,
  reason: "东莞市教育局2025年优质公办普通高中名额分配学校候选校",
}));

const publicTargetIncrements: Record<string, {
  schools: SchoolRecord[];
  evidence: EvidenceRef;
  districtGap?: string;
}> = {
  广州: { schools: guangzhouPublicSchools, evidence: guangzhouPublicEvidence },
  深圳: {
    schools: shenzhenPublicSchools,
    evidence: shenzhenPublicEvidence,
    districtGap: "深圳市2026年公办普通高中名额分配表未逐校列出区县，7所目标校区县待学校官网互证",
  },
  佛山: {
    schools: foshanPublicSchools,
    evidence: foshanPublicEvidence,
    districtGap: "佛山市第一中学所在区县未由本轮招生汇总正文直接证明",
  },
  惠州: {
    schools: huizhouPublicSchools,
    evidence: huizhouPublicEvidence,
    districtGap: "惠州市第一中学、惠州中学所在区县未由本轮招生答疑正文直接证明",
  },
  东莞: {
    schools: dongguanPublicSchools,
    evidence: dongguanPublicEvidence,
    districtGap: "东莞市优质公办普通高中名额分配通知未逐校列出园区镇街，5所目标校区县待学校官网互证",
  },
};

const ningboPublicEvidence: EvidenceRef = {
  id: "src-ningbo-2025-high-school-plan",
  title: "《宁波教育》2025年第5期：2025年宁波市普通高中城区招生计划表",
  url: "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web3505/site/attach/0/2506251359476520.pdf",
  publisher: "宁波市教育局《宁波教育》",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2025-06-25",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "官方教育刊物所附城区普通高中招生计划列出镇海中学、宁波中学、效实中学和鄞州中学；不据此补写未列出的学校。",
};

const ningboPrivateEvidence: EvidenceRef = {
  id: "src-ningbo-2025-urban-private-high-school-plan",
  title: "2025年宁波市普通高中城区招生计划表（民办普高分区）",
  url: ningboPublicEvidence.url,
  publisher: "宁波市教育局《宁波教育》",
  sourceLevel: "A1_government",
  sourceType: "学校名单",
  publishedAt: "2025-06-25",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "人工核读扫描版第29页“民办普高”分区，只证明所列12所学校在2025年城区招生；不代表宁波全市完整民办高中池，也不证明初中学段。",
};

const ningboPrivateSchools = [
  ["private-nb-xingning", "宁波市兴宁中学", "待确认", false],
  ["private-nb-lanqing", "宁波鄞州蓝青高级中学", "鄞州区", true],
  ["private-nb-chengnan", "宁波市城南中学", "待确认", false],
  ["private-nb-huaguang", "宁波市华光学校", "待确认", false],
  ["private-nb-keji", "宁波市科技高级中学", "待确认", false],
  ["private-nb-nottingham", "宁波诺丁汉大学附属中学", "待确认", false],
  ["private-nb-huamao", "宁波华茂高级中学", "待确认", false],
  ["private-nb-rongan", "宁波荣安实验中学", "待确认", false],
  ["private-nb-shenzhou", "宁波神舟学校", "待确认", false],
  ["private-nb-zhicheng", "宁波至诚高级中学", "待确认", false],
  ["private-nb-yongtong", "宁波市甬同书院", "待确认", false],
  ["private-nb-hd", "鄞州赫德实验学校", "鄞州区", true],
].map(([id, officialName, district, districtVerified]) => listedPrivateSchool({
  id: String(id),
  province: "浙江",
  city: "宁波",
  district: String(district),
  officialName: String(officialName),
  stages: ["高中"],
  evidenceIds: [ningboPrivateEvidence.id],
  districtVerified: Boolean(districtVerified),
}));

const yuyaoPublicEvidence: EvidenceRef = {
  id: "src-ningbo-yuyao-2021-school-budget",
  title: "浙江省余姚中学2021年度部门（单位）决算",
  url: "https://www.yy.gov.cn/art/2022/9/16/art_1229563171_4076471.html",
  publisher: "余姚市人民政府",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2022-09-16",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "政府决算页面明确该校为教育局局属事业单位并从事高中学历教育；仅作目标校身份依据，不代表当前招聘。",
};

const ningboPublicSchools = [
  publicSchool({ id: "public-nb-zhenhai", province: "浙江", city: "宁波", district: "待确认", officialName: "镇海中学", evidenceIds: [ningboPublicEvidence.id], tier: "核心", reason: "宁波市官方普通高中城区招生计划候选校", districtVerified: false }),
  publicSchool({ id: "public-nb-xiaoshi", province: "浙江", city: "宁波", district: "多校区", officialName: "宁波市效实中学", evidenceIds: [ningboPublicEvidence.id], tier: "核心", reason: "宁波市官方普通高中城区招生计划候选校", districtVerified: false }),
  publicSchool({ id: "public-nb-ningbo", province: "浙江", city: "宁波", district: "待确认", officialName: "宁波中学", evidenceIds: [ningboPublicEvidence.id], tier: "核心", reason: "宁波市官方普通高中城区招生计划候选校", districtVerified: false }),
  publicSchool({ id: "public-nb-yinzhou", province: "浙江", city: "宁波", district: "鄞州区", officialName: "宁波市鄞州中学", evidenceIds: [ningboPublicEvidence.id], tier: "核心", reason: "宁波市官方普通高中城区招生计划候选校" }),
  publicSchool({
    id: "public-nb-yuyao",
    province: "浙江",
    city: "宁波",
    district: "余姚市",
    officialName: "浙江省余姚中学",
    evidenceIds: [yuyaoPublicEvidence.id],
    tier: "核心",
    reason: "余姚市政府决算确认的教育局局属高中事业单位；当前办学状态待更新证据",
    activeStateVerified: false,
  }),
];

const jiaxingPublicEvidence: EvidenceRef[] = [
  {
    id: "src-jiaxing-no1-2025-budget",
    title: "嘉兴市教育局2025年市本级部门预算",
    url: "https://jyj.jiaxing.gov.cn/module/download/downfile.jsp?classid=0&filename=6ad2e53bb47a42cf8d914866f97e0a7e.pdf",
    publisher: "嘉兴市教育局",
    sourceLevel: "A1_government",
    sourceType: "公办目标依据",
    publishedAt: "2025-03-01",
    accessedAt: verifiedAt,
    accessState: "blocked",
    note: "市级部门预算列出嘉兴市第一中学；只作公办目标校身份依据。2026-08-21链接检查返回HTTP异常，需从教育局预算入口重新定位附件。",
  },
  {
    id: "src-jiaxing-jiashan-2025-school",
    title: "嘉善高级中学柳洲书院启用",
    url: "https://www.jiashan.gov.cn/art/2025/3/19/art_1229250583_59056024.html",
    publisher: "嘉善县人民政府",
    sourceLevel: "A1_government",
    sourceType: "公办目标依据",
    publishedAt: "2025-03-19",
    accessedAt: verifiedAt,
    accessState: "ok",
    note: "县政府页面确认嘉善高级中学当前办学及高中培养活动；只作目标校身份依据。",
  },
  {
    id: "src-jiaxing-tongxiang-2024-budget",
    title: "浙江省桐乡市高级中学2024年单位预算",
    url: "https://www.tx.gov.cn/module/download/downfile.jsp?classid=0&filename=41043c9fc4014c7e8b6671652ebe8abf.pdf",
    publisher: "桐乡市人民政府",
    sourceLevel: "A1_government",
    sourceType: "公办目标依据",
    publishedAt: "2024-03-01",
    accessedAt: verifiedAt,
    accessState: "blocked",
    note: "预算文件明确学校持有事业单位法人证书并承担高中学历教育；只作目标校身份依据。2026-08-21链接检查返回HTTP异常，需从政府预算入口重新定位附件。",
  },
  {
    id: "src-jiaxing-pinghu-2025-public-unit",
    title: "平湖市教育局校园招聘2025学年教师公告（第三批）",
    url: "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web3087/site/attach/0/6dd90353a8214246b8d8c8185ac0ef11.pdf",
    publisher: "平湖市教育局",
    sourceLevel: "A1_government",
    sourceType: "招聘公告",
    publishedAt: "2024-10-24",
    accessedAt: verifiedAt,
    recruitmentCycle: "2025届",
    accessState: "ok",
    note: "公告明确招聘人员列入事业编制，并在岗位表列出浙江省平湖中学高中政治岗位；只作2025届往届参考，不代表当前开放。",
  },
];

const jiaxingPublicSchools = [
  publicSchool({ id: "public-jx-no1", province: "浙江", city: "嘉兴", district: "南湖区", officialName: "嘉兴市第一中学", evidenceIds: [jiaxingPublicEvidence[0].id], tier: "核心", reason: "用户指定候选校；嘉兴市教育局预算资料确认单位身份；当前办学状态待恢复可访问证据", activeStateVerified: false }),
  publicSchool({ id: "public-jx-jiashan", province: "浙江", city: "嘉兴", district: "嘉善县", officialName: "嘉善高级中学", evidenceIds: [jiaxingPublicEvidence[1].id], tier: "核心", reason: "用户指定候选校；嘉善县政府资料确认当前高中办学活动" }),
  publicSchool({ id: "public-jx-tongxiang", province: "浙江", city: "嘉兴", district: "桐乡市", officialName: "浙江省桐乡市高级中学", evidenceIds: [jiaxingPublicEvidence[2].id], tier: "核心", reason: "用户指定候选校；政府预算确认事业单位和高中学历教育职责；当前办学状态待更新证据", activeStateVerified: false }),
  publicSchool({ id: "public-jx-pinghu", province: "浙江", city: "嘉兴", district: "平湖市", officialName: "浙江省平湖中学", evidenceIds: [jiaxingPublicEvidence[3].id], tier: "核心", reason: "平湖市教育局2025届事业编教师招聘公告所列招聘学校；当前办学状态待更新证据", activeStateVerified: false }),
];

const pinghuBatch: RecruitmentBatch = {
  id: "batch-jiaxing-pinghu-2025-campus",
  employerName: "平湖市教育局",
  recruitingAuthority: "平湖市教育局",
  schoolIds: ["public-jx-pinghu"],
  title: "平湖市教育局校园招聘2025学年教师（第三批）",
  recruitmentCycle: "2025届",
  statusBasis: "reference_2026",
  publishedAt: "2024-10-24",
  applicationStart: "2024-10-24",
  deadline: "2024-10-29",
  expectedStart: "2025-08-01",
  accepts2027: "no",
  employmentType: "事业编制",
  employmentEvidenceId: jiaxingPublicEvidence[3].id,
  applicationMethod: "web",
  applicationUrl: "http://zp.phedu.net",
  evidenceIds: [jiaxingPublicEvidence[3].id],
  lastVerified: verifiedAt,
};

const pinghuPoliticsPosition: PositionRecord = {
  id: "pos-jiaxing-pinghu-2025-politics",
  batchId: pinghuBatch.id,
  schoolId: "public-jx-pinghu",
  city: "嘉兴",
  district: "平湖市",
  stage: "高中",
  subjects: ["政治/道法"],
  title: "高中政治教师",
  vacancyCount: 1,
  salaryBasis: "工资政策",
  salaryEvidenceScope: "unverified",
  languageMode: "中文",
  requirements: [
    { field: "graduate_year", text: "面向2025年全日制普通高校应届毕业生", hardness: "hard", evidenceId: jiaxingPublicEvidence[3].id, evidenceScope: "field_exact" },
    { field: "degree", text: "硕士研究生及以上学历、学位", hardness: "hard", evidenceId: jiaxingPublicEvidence[3].id, evidenceScope: "field_exact" },
    { field: "major", text: "法学、政治学、马克思主义理论；中学岗位另含马克思主义哲学、学科教学（思政）", hardness: "hard", evidenceId: jiaxingPublicEvidence[3].id, evidenceScope: "field_exact" },
    { field: "teacher_certificate", text: "须在2026年7月31日前取得相应教师资格证", hardness: "hard", evidenceId: jiaxingPublicEvidence[3].id, evidenceScope: "field_exact" },
  ],
  ...unknownPositionBenefits(),
  selectionStages: [
    { order: 1, name: "网上报名", certainty: "confirmed", cycle: "2025届", format: "线上", evidenceId: jiaxingPublicEvidence[3].id, materials: ["报名表", "身份证", "学历学位材料", "成绩单", "教师资格材料"] },
    { order: 2, name: "现场资格确认", certainty: "confirmed", cycle: "2025届", format: "线下", detail: "公告安排在浙江师范大学进行现场确认", evidenceId: jiaxingPublicEvidence[3].id },
    { order: 3, name: "教育综合知识笔试", certainty: "confirmed", cycle: "2025届", format: "线下", detail: "同一岗位资格确认人数超过招聘计划1:6时组织", evidenceId: jiaxingPublicEvidence[3].id },
    { order: 4, name: "试讲", certainty: "confirmed", cycle: "2025届", format: "线下", evidenceId: jiaxingPublicEvidence[3].id },
    { order: 5, name: "结构化面试", certainty: "confirmed", cycle: "2025届", format: "线下", evidenceId: jiaxingPublicEvidence[3].id },
    { order: 6, name: "签约、体检和考察", certainty: "confirmed", cycle: "2025届", format: "线下", evidenceId: jiaxingPublicEvidence[3].id },
    { order: 7, name: "公示与聘用", certainty: "confirmed", cycle: "2025届", detail: "公告明确聘用人员列入事业编制", evidenceId: jiaxingPublicEvidence[3].id },
  ],
  sourceSummary: "平湖市教育局官方2025届招聘公告；岗位早已截止，只作为公办政治岗资格与考试流程参考。",
  lastVerified: verifiedAt,
};

const shaoxingEvidence: EvidenceRef = {
  id: "src-shaoxing-2025-high-school-admission",
  title: "绍兴市教育局关于做好2025年普通高中招生工作的通知",
  url: "https://jyj.sx.gov.cn/art/2025/6/24/art_1229558610_1910007.html",
  publisher: "绍兴市教育局",
  sourceLevel: "A1_government",
  sourceType: "教育部门说明",
  publishedAt: "2025-06-24",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "招生文件明确区分并列出2025年公办、民办普通高中；不据此推断2026年招生状态、初中学段或寄宿条件。",
};

const shaoxingPublicSchools = [
  ["public-sx-no1", "绍兴一中", "越城区"],
  ["public-sx-yangming", "阳明中学", "越城区"],
  ["public-sx-senior", "绍兴市高级中学", "越城区"],
  ["public-sx-yuezhou", "越州中学", "越城区"],
  ["public-sx-keqiao", "柯桥中学", "柯桥区"],
  ["public-sx-luxun", "鲁迅中学", "柯桥区"],
  ["public-sx-chunhui", "春晖中学", "上虞区"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "浙江", city: "绍兴", district, officialName,
  evidenceIds: [shaoxingEvidence.id], tier: "核心",
  reason: "绍兴市教育局2025年普通高中招生文件所列公办高中候选校",
}));

const shaoxingPrivateSchools = [
  ["private-sx-longshan", "绍兴龙山书院", "越城区"],
  ["private-sx-jishan", "绍兴蕺山外国语学校", "越城区"],
  ["private-sx-yonghe", "绍兴市永和高级中学", "越城区"],
  ["private-sx-boya", "绍兴市博雅学校", "越城区"],
  ["private-sx-guojie", "绍兴市柯桥区国杰高级中学", "柯桥区"],
  ["private-sx-financial-street", "绍兴市上虞区金融街杭州湾高级中学", "上虞区"],
].map(([id, officialName, district]) => privateSchool({
  id, province: "浙江", city: "绍兴", district, officialName, evidenceId: shaoxingEvidence.id,
}));

const wuxiJuniorDirectoryEvidence: EvidenceRef = {
  id: "src-wuxi-2025-junior-directory",
  title: "无锡市初中一览表（2025年）",
  url: "https://jy.wuxi.gov.cn/uploadfiles/202508/14/2025081411142441054575.xlsx",
  publisher: "无锡市教育局",
  sourceLevel: "A1_government",
  sourceType: "学校名单",
  publishedAt: "2025-08-14",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "官方名录逐校列出名称、性质、地址和主管部门；本地仅保存学校、区县、学段和民办性质，不保存联系电话。",
};

const wuxiHighDirectoryEvidence: EvidenceRef = {
  id: "src-wuxi-2025-high-school-directory",
  title: "无锡市普通高中一览表（2025年）",
  url: "https://jy.wuxi.gov.cn/uploadfiles/202508/14/2025081411143673821960.xlsx",
  publisher: "无锡市教育局",
  sourceLevel: "A1_government",
  sourceType: "学校名单",
  publishedAt: "2025-08-14",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "官方名录逐校列出名称、性质、地址和主管部门；本地仅保存学校、区县、学段和民办性质，不保存联系电话。",
};

const wuxiPrivateRows: Array<{
  id: string;
  officialName: string;
  district: string;
  stages: Array<"初中" | "高中">;
  aliasNames?: string[];
}> = [
  { id: "private-wx-daqiao", officialName: "无锡市大桥实验学校", district: "多校区", stages: ["初中", "高中"] },
  { id: "private-wx-fucheng", officialName: "无锡市辅成实验学校", district: "梁溪区", stages: ["初中"] },
  { id: "private-wx-guanghua", officialName: "无锡光华学校", district: "滨湖区", stages: ["初中", "高中"] },
  { id: "private-wx-yucai", officialName: "无锡育才中学", district: "梁溪区", stages: ["初中"] },
  { id: "private-wx-foreign", officialName: "无锡外国语学校", district: "多校区", stages: ["初中", "高中"] },
  { id: "private-wx-wufeng", officialName: "无锡市吴风实验学校", district: "新吴区", stages: ["初中"] },
  { id: "private-wx-dipont", officialName: "无锡狄邦文理学校", district: "滨湖区", stages: ["初中", "高中"] },
  { id: "private-wx-dipont-huishan", officialName: "无锡狄邦文理学校（惠山校区）", district: "惠山区", stages: ["初中", "高中"] },
  { id: "private-wx-huatian", officialName: "无锡市华天双语学校", district: "锡山区", stages: ["初中", "高中"] },
  { id: "private-wx-kuangyuan", officialName: "无锡市匡园双语学校", district: "惠山区", stages: ["初中", "高中"] },
  { id: "private-wx-jiangyin-tianhua", officialName: "江阴市天华艺术学校", district: "江阴市", stages: ["初中", "高中"] },
  { id: "private-wx-jiangyin-linkang", officialName: "江阴临港科创实验学校", district: "江阴市", stages: ["初中", "高中"], aliasNames: ["江阴临港新城科创实验学校"] },
  { id: "private-wx-jiangyin-qingyang-jinqiao", officialName: "江阴青阳金桥实验学校", district: "江阴市", stages: ["初中"] },
  { id: "private-wx-jiangyin-taibo", officialName: "江阴市泰博实验学校", district: "江阴市", stages: ["初中"] },
  { id: "private-wx-jiangyin-foreign", officialName: "江阴外国语学校", district: "江阴市", stages: ["初中", "高中"] },
  { id: "private-wx-yixing-lingxia", officialName: "宜兴市凌霞实验中学", district: "宜兴市", stages: ["初中"] },
  { id: "private-wx-yixing-changqing", officialName: "宜兴市常青外国语学校", district: "宜兴市", stages: ["初中", "高中"] },
  { id: "private-wx-liangxi-lianyuanyinghe", officialName: "无锡市梁溪区连元英禾双语学校分校", district: "梁溪区", stages: ["初中"] },
  { id: "private-wx-liangxi-jinqiao", officialName: "无锡市梁溪区金桥双语实验学校", district: "梁溪区", stages: ["初中"] },
  { id: "private-wx-xieshuang", officialName: "无锡市协和双语学校", district: "锡山区", stages: ["初中"] },
  { id: "private-wx-xishan-chunlei", officialName: "无锡市锡山区春蕾学校", district: "锡山区", stages: ["初中"] },
  { id: "private-wx-huishan-xinkaihe", officialName: "无锡市惠山区洛社新开河实验学校", district: "惠山区", stages: ["初中"] },
  { id: "private-wx-huishan-jinqiao", officialName: "无锡市惠山金桥实验学校", district: "惠山区", stages: ["初中"] },
  { id: "private-wx-huishan-huarui", officialName: "无锡市惠山区华锐实验学校", district: "惠山区", stages: ["初中"] },
  { id: "private-wx-xinwu-jinqiao", officialName: "无锡高新区金桥外国语学校", district: "新吴区", stages: ["初中"] },
  { id: "private-wx-jingkai-jinqiao", officialName: "无锡金桥双语实验学校", district: "经开区", stages: ["初中"] },
  { id: "private-wx-yunhe", officialName: "无锡市运河实验中学", district: "梁溪区", stages: ["高中"] },
  { id: "private-wx-xinan", officialName: "无锡市锡南实验中学", district: "惠山区", stages: ["高中"] },
  { id: "private-wx-xianfeng", officialName: "无锡先锋高级中学", district: "新吴区", stages: ["高中"] },
  { id: "private-wx-jinbang", officialName: "无锡金榜高级中学", district: "新吴区", stages: ["高中"] },
];

const wuxiPrivateSchools = wuxiPrivateRows.map((row) => listedPrivateSchool({
  ...row,
  province: "江苏",
  city: "无锡",
  evidenceIds: [
    ...(row.stages.includes("初中") ? [wuxiJuniorDirectoryEvidence.id] : []),
    ...(row.stages.includes("高中") ? [wuxiHighDirectoryEvidence.id] : []),
  ],
}));

const wuxiEvidence: EvidenceRef = {
  id: "src-wuxi-2026-high-school-admission",
  title: "无锡市教育局关于做好2026年市区高级中等学校招生工作的意见",
  url: "https://jy.wuxi.gov.cn/doc/2026/05/08/4772335.shtml",
  publisher: "无锡市教育局",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2026-05-08",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "文件列出六所市区重点招生高中。目标池表示求职关注范围，不表示排名。",
};

const wuxiPublicSchools = [
  ["public-wx-no1", "无锡市第一中学", "梁溪区"],
  ["public-wx-furen", "无锡市辅仁高级中学", "滨湖区"],
  ["public-wx-meicun", "江苏省梅村高级中学", "新吴区"],
  ["public-wx-tianyi", "江苏省天一中学", "锡山区"],
  ["public-wx-xishan", "江苏省锡山高级中学", "惠山区"],
  ["public-wx-taihu", "江苏省太湖高级中学", "滨湖区"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "江苏", city: "无锡", district, officialName,
  evidenceIds: [wuxiEvidence.id], tier: "核心", reason: "列入无锡市教育局2026年市区高中重点招生学校范围",
}));

const wenzhouPublicEvidence: EvidenceRef = {
  id: "src-wenzhou-2025-direct-school-budget",
  title: "温州市教育局直属学校单位预算范围",
  url: "https://edu.wenzhou.gov.cn/module/download/downfile.jsp?classid=0&filename=1d682737d57c480b850b72b3db8ea141.pdf",
  publisher: "温州市教育局",
  sourceLevel: "A1_government",
  sourceType: "公办目标依据",
  publishedAt: "2025-03-01",
  accessedAt: verifiedAt,
  accessState: "blocked",
  note: "预算文件列出市教育局直属学校；目标池只表示求职关注范围。2026-08-21链接检查返回HTTP异常，需从教育局入口重新确认附件。",
};

const wenzhouRecruitmentEvidence: EvidenceRef = {
  id: "src-wenzhou-2026-graduate-selection",
  title: "温州市教育局直属公办学校2026年公开选聘优秀高校毕业生公告",
  url: "https://rczp.edu.wenzhou.gov.cn/View.aspx?id=516",
  publisher: "温州市教育局",
  sourceLevel: "A1_government",
  sourceType: "招聘公告",
  publishedAt: "2025-10-24",
  accessedAt: verifiedAt,
  recruitmentCycle: "2026届",
  accessState: "blocked",
  note: "公告确认70名事业编制教师及毕业年份、学历、教师资格等条件；相关学科岗位仍须核对附件岗位表。2026-08-21链接检查发现TLS异常。",
};

const wenzhouPublicSchools = [
  ["public-wz-wenzhou", "浙江省温州中学", "瓯海区"],
  ["public-wz-no2", "温州第二高级中学", "鹿城区"],
  ["public-wz-no14", "温州市第十四高级中学", "鹿城区"],
  ["public-wz-no22", "温州市第二十二中学", "龙湾区"],
  ["public-wz-no2-foreign", "温州市第二外国语学校", "瓯海区"],
  ["public-wz-ouhai", "浙江省瓯海中学", "瓯海区"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "浙江", city: "温州", district, officialName,
  evidenceIds: [wenzhouPublicEvidence.id], tier: "扩展", reason: "温州市教育局直属公办高中求职关注目标",
}));

const suzhouRecruitmentEvidence: EvidenceRef = {
  id: "src-suzhou-xiangcheng-2026-teacher-recruitment",
  title: "2026年苏州市相城区教育系统公开招聘教师公告",
  url: "https://hrss.suzhou.gov.cn/jsszhrss/gsgg/202607/50860c1421554200be1b955bbee37deb.shtml",
  publisher: "苏州市人力资源和社会保障局",
  sourceLevel: "A1_government",
  sourceType: "招聘公告",
  publishedAt: "2026-07-03",
  accessedAt: verifiedAt,
  recruitmentCycle: "2026届/社会招聘",
  accessState: "ok",
  note: "公告明确47名事业编制、报名时间、资格与笔试面试流程。",
};

const suzhouJobTableEvidence: EvidenceRef = {
  id: "src-suzhou-xiangcheng-2026-job-table",
  title: "2026年苏州市相城区教育系统公开招聘教师岗位简介表",
  url: "https://hrss.suzhou.gov.cn/jsszhrss/gsgg/202607/50860c1421554200be1b955bbee37deb/files/18d4219932974f13b35869c015d82e11.xlsx",
  publisher: "苏州市相城区教育局",
  sourceLevel: "A1_government",
  sourceType: "岗位表",
  publishedAt: "2026-07-03",
  accessedAt: verifiedAt,
  recruitmentCycle: "2026届/社会招聘",
  accessState: "ok",
  note: "岗位表明确高中政治教师岗位、人数、学校、学历、专业和教师资格要求。",
};

const suzhouOutcomeEvidence: EvidenceRef = {
  id: "src-suzhou-xiangcheng-2025-hiring-outcome",
  title: "2025年苏州市相城区教育系统面向高校公开招聘教师拟录用人员名单（第一批）",
  url: "https://hrss.suzhou.gov.cn/jsszhrss/gsgg/202506/3cae543699ef40cf8f1e3a9270d7aaaa/files/6fe1f7b455514421af6b55088fbb75b0.pdf",
  publisher: "苏州市人力资源和社会保障局",
  sourceLevel: "A1_government",
  sourceType: "拟聘用公示",
  publishedAt: "2025-06-01",
  accessedAt: verifiedAt,
  recruitmentCycle: "2025届",
  accessState: "ok",
  note: "本地只保存学科、学校、学历、毕业院校和专业，不保存姓名、性别、成绩、排名或其他个人字段。",
};

const suzhouPrivateSchoolEvidence: EvidenceRef = {
  id: "src-suzhou-2026-admission-fair-private-school",
  title: "苏州中考招生咨询会“热力全开” 高中学段“新面孔”集中亮相",
  url: "https://www.suzhou.gov.cn/szsrmzf/szyw/202606/b9ca2dcd30de4c20b8079fd29139be35.shtml",
  publisher: "苏州市人民政府",
  sourceLevel: "A1_government",
  sourceType: "教育部门说明",
  publishedAt: "2026-06-22",
  accessedAt: verifiedAt,
  accessState: "ok",
  note: "市政府文章明确苏州工业园区德元新融学校2026年首次开设高中学段，并称其为民办高中选择；只证明该校，不视为苏州民办高中完整名单。",
};

const suzhouPrivateSchools = [privateSchool({
  id: "private-sz-deyuan-xinrong",
  province: "江苏",
  city: "苏州",
  district: "工业园区",
  officialName: "苏州工业园区德元新融学校",
  evidenceId: suzhouPrivateSchoolEvidence.id,
})];

const suzhouAddedSchools = [
  ["public-sz-xiangcheng", "相城中学（高中）", "相城区"],
  ["public-sz-suda-experimental", "苏州大学实验学校（高中）", "相城区"],
  ["public-sz-lumu", "苏州市相城区陆慕高级中学", "相城区"],
  ["public-sz-huangdai", "江苏省黄埭中学", "相城区"],
].map(([id, officialName, district]) => publicSchool({
  id, province: "江苏", city: "苏州", district, officialName,
  evidenceIds: [suzhouRecruitmentEvidence.id, suzhouJobTableEvidence.id], tier: "扩展",
  reason: "相城区事业编教师招聘公告及岗位表中的招聘学校",
}));

const suzhouBatch: RecruitmentBatch = {
  id: "batch-suzhou-xiangcheng-2026-july",
  employerName: "苏州市相城区教育系统",
  recruitingAuthority: "苏州市相城区教育局",
  schoolIds: suzhouAddedSchools.map((school) => school.id),
  title: "2026年苏州市相城区教育系统公开招聘教师",
  recruitmentCycle: "2026届/社会招聘",
  statusBasis: "reference_2026",
  publishedAt: "2026-07-03",
  applicationStart: "2026-07-07",
  deadline: "2026-07-13",
  expectedStart: "2026-08-31",
  accepts2027: "no",
  employmentType: "事业编制",
  employmentEvidenceId: suzhouRecruitmentEvidence.id,
  applicationMethod: "web",
  applicationUrl: "http://www.xcjyxx.com/",
  evidenceIds: [suzhouRecruitmentEvidence.id, suzhouJobTableEvidence.id],
  lastVerified: verifiedAt,
};

function suzhouPoliticsPosition(id: string, schoolId: string, title: string, acceptsGraduates: boolean): PositionRecord {
  const benefits = unknownPositionBenefits();
  return {
    id,
    batchId: suzhouBatch.id,
    schoolId,
    city: "苏州",
    district: "相城区",
    stage: "高中",
    subjects: ["政治/道法"],
    title,
    vacancyCount: 1,
    salaryBasis: "工资政策",
    salaryEvidenceScope: "unverified",
    languageMode: "中文",
    requirements: [
      { field: "degree", text: "硕士研究生及以上，具有相应学位", hardness: "hard", evidenceId: suzhouJobTableEvidence.id, evidenceScope: "field_exact" },
      { field: "major", text: "政治类", hardness: "hard", evidenceId: suzhouJobTableEvidence.id, evidenceScope: "field_exact" },
      { field: "teacher_certificate", text: "高中政治教师资格证，须于2026年8月31日前取得", hardness: "hard", evidenceId: suzhouJobTableEvidence.id, evidenceScope: "field_exact" },
      ...(acceptsGraduates ? [{ field: "graduate_year" as const, text: "面向2026年毕业生", hardness: "hard" as const, evidenceId: suzhouJobTableEvidence.id, evidenceScope: "field_exact" as const }] : []),
    ],
    ...benefits,
    selectionStages: [
      { order: 1, name: "网上报名与材料上传", certainty: "confirmed", cycle: "2026届/社会招聘", format: "线上", evidenceId: suzhouRecruitmentEvidence.id, materials: ["身份证", "学历或学籍证明", "就业推荐表/协议书（适用时）", "教师资格证", "课程成绩单"] },
      { order: 2, name: "资格初审", certainty: "confirmed", cycle: "2026届/社会招聘", format: "线上", evidenceId: suzhouRecruitmentEvidence.id },
      { order: 3, name: "闭卷笔试", certainty: "confirmed", cycle: "2026届/社会招聘", format: "线下", detail: "专业理念、专业知识和专业能力；60分合格，按1:3入围，笔试占40%", scoreWeight: 40, evidenceId: suzhouRecruitmentEvidence.id },
      { order: 4, name: "资格复审", certainty: "confirmed", cycle: "2026届/社会招聘", format: "线下", evidenceId: suzhouRecruitmentEvidence.id },
      { order: 5, name: "面试", certainty: "partial", cycle: "2026届/社会招聘", format: "线下", detail: "具体形式另行公告；60分合格，面试占60%", scoreWeight: 60, evidenceId: suzhouRecruitmentEvidence.id },
      { order: 6, name: "体检、选岗、考察", certainty: "confirmed", cycle: "2026届/社会招聘", format: "线下", evidenceId: suzhouRecruitmentEvidence.id },
      { order: 7, name: "公示与聘用", certainty: "confirmed", cycle: "2026届/社会招聘", detail: "列入事业编制管理，最低服务5年", evidenceId: suzhouRecruitmentEvidence.id },
    ],
    sourceSummary: "相城区官方公告与岗位表；报名已截止，仅作为2026年公办招考参考。",
    lastVerified: verifiedAt,
  };
}

const suzhouPositions = [
  suzhouPoliticsPosition("pos-sz-xiangcheng-2026-politics-huangdai", "public-sz-huangdai", "高中政治教师1", true),
  suzhouPoliticsPosition("pos-sz-xiangcheng-2026-politics-lumu", "public-sz-lumu", "高中政治教师2", false),
];

const outcomeRows = [
  ["outcome-sz-2025-politics-xiangcheng-scu", "public-sz-xiangcheng", "高中政治教师", "四川大学", "马克思主义理论"],
  ["outcome-sz-2025-politics-suda-suda", "public-sz-suda-experimental", "高中政治教师", "苏州大学", "学科教学（思政）"],
  ["outcome-sz-2025-politics-lumu-sdu", "public-sz-lumu", "高中政治教师", "山东大学", "马克思主义理论"],
  ["outcome-sz-2025-politics-huangdai-suda", "public-sz-huangdai", "高中政治教师", "苏州大学", "学科教学（思政）"],
  ["outcome-sz-2025-history-huangdai-zzu", "public-sz-huangdai", "高中历史教师", "郑州大学", "文物与博物馆"],
];

const suzhouOutcomes: HiringOutcome[] = outcomeRows.map(([id, schoolId, subject, graduateInstitution, majorAsPublished]) => ({
  id,
  schoolId,
  city: "苏州",
  recruitmentYear: 2025,
  stage: "拟聘用",
  subject,
  schoolStage: "高中",
  graduateInstitution,
  degree: "硕士研究生",
  majorAsPublished,
  candidateType: "应届",
  employmentType: "事业编制",
  evidenceId: suzhouOutcomeEvidence.id,
  fieldsAvailable: ["岗位", "学校", "学历", "毕业院校", "专业"],
  note: "隐私清洗后的单条结果；未保存姓名、性别、成绩或排名。",
}));

function enrich(dataset: CityDataset): CityDataset {
  const publicIncrement = publicTargetIncrements[dataset.cityName];
  if (publicIncrement) {
    return {
      ...dataset,
      schools: uniqueById([...dataset.schools, ...publicIncrement.schools]),
      coverage: uniqueCoverage([...dataset.coverage, ...coverageFor(publicIncrement.schools, "待检索")]),
      evidence: uniqueById([...dataset.evidence, publicIncrement.evidence]),
      coverageGaps: [
        ...(dataset.coverageGaps ?? []),
        ...(publicIncrement.districtGap ? [{
          scope: "district" as const,
          description: publicIncrement.districtGap,
          evidenceIds: [publicIncrement.evidence.id],
          nextAction: "逐校检查学校官网的校址与组织归属后补入字段级证据",
        }] : []),
      ],
    };
  }
  if (dataset.cityName === "宁波") {
    return {
      ...dataset,
      schools: uniqueById([...dataset.schools, ...ningboPrivateSchools, ...ningboPublicSchools]),
      coverage: uniqueCoverage([
        ...dataset.coverage,
        ...coverageFor(ningboPrivateSchools, "待检索"),
        ...coverageFor(ningboPublicSchools, "待检索"),
      ]),
      evidence: uniqueById([
        ...dataset.evidence,
        ningboPublicEvidence,
        ningboPrivateEvidence,
        yuyaoPublicEvidence,
      ]),
      coverageGaps: [
        ...(dataset.coverageGaps ?? []).map((gap) => {
          if (gap.scope === "private_school_pool") return {
            ...gap,
            description: "已恢复2025年宁波城区招生计划明确列为民办普高的12所学校；民办初中、其他县市民办高中和2026年变化仍未完整恢复",
            evidenceIds: [ningboPrivateEvidence.id],
            nextAction: "继续检查各区县义务教育招生名单和县域普通高中计划，并等待2026年完整名录",
          };
          if (gap.scope === "public_target_pool") return {
            ...gap,
            description: "已确认5所宁波公办高中候选校；慈溪中学及部分学校区县仍缺可直接引用的当前A1资料",
            evidenceIds: [ningboPublicEvidence.id, yuyaoPublicEvidence.id],
            nextAction: "补查慈溪市教育局及各校官网，并为待确认区县增加字段级证据",
          };
          return gap;
        }),
        {
          scope: "district",
          description: "镇海中学、宁波中学、效实中学及10所城区民办高中的区县或多校区信息尚未取得本轮字段级证据",
          evidenceIds: [ningboPublicEvidence.id, ningboPrivateEvidence.id],
          nextAction: "逐校检查学校官网的校址与组织归属",
        },
      ],
    };
  }
  if (dataset.cityName === "嘉兴") {
    const addedCoverage = coverageFor(jiaxingPublicSchools, "待检索").map((record) => record.schoolId === "public-jx-pinghu" ? {
      ...record,
      currentOutcome: "发现往届参考" as const,
      relevantPositionIds: [pinghuPoliticsPosition.id],
      searchEvidenceIds: [jiaxingPublicEvidence[3].id],
    } : record);
    return {
      ...dataset,
      schools: uniqueById([...dataset.schools, ...jiaxingPublicSchools]),
      coverage: uniqueCoverage([...dataset.coverage, ...addedCoverage]),
      evidence: uniqueById([...dataset.evidence, ...jiaxingPublicEvidence]),
      batches: uniqueById([...dataset.batches, pinghuBatch]),
      positions: uniqueById([...dataset.positions, pinghuPoliticsPosition]),
      coverageGaps: (dataset.coverageGaps ?? []).map((gap) => gap.scope === "public_target_pool" ? {
        ...gap,
        description: "已确认嘉兴一中、嘉善高级中学、桐乡高级中学和平湖中学4所候选校；海宁高级中学尚缺可直接引用的当前A1资料",
        evidenceIds: jiaxingPublicEvidence.map((item) => item.id),
        nextAction: "补查海宁市教育局，并为2024年前后资料补充当前办学状态证据",
      } : gap),
    };
  }
  if (dataset.cityName === "绍兴") {
    const schools = [...shaoxingPrivateSchools, ...shaoxingPublicSchools];
    return {
      ...dataset,
      schools: uniqueById([...dataset.schools, ...schools]),
      coverage: uniqueCoverage([
        ...dataset.coverage,
        ...coverageFor(shaoxingPrivateSchools, "本轮未发现"),
        ...coverageFor(shaoxingPublicSchools, "待检索"),
      ]),
      evidence: uniqueById([...dataset.evidence, shaoxingEvidence]),
      coverageGaps: (dataset.coverageGaps ?? [])
        .filter((gap) => gap.scope !== "public_target_pool")
        .map((gap) => gap.scope === "private_school_pool" ? {
          ...gap,
          description: "已恢复2025年绍兴民办普通高中招生名单；民办初中和2026年当前办学状态仍未完整恢复",
          evidenceIds: [shaoxingEvidence.id],
        } : gap),
    };
  }
  if (dataset.cityName === "无锡") {
    return {
      ...dataset,
      schools: uniqueById([...dataset.schools, ...wuxiPrivateSchools, ...wuxiPublicSchools]),
      coverage: uniqueCoverage([
        ...dataset.coverage,
        ...coverageFor(wuxiPrivateSchools, "待检索"),
        ...coverageFor(wuxiPublicSchools, "待检索"),
      ]),
      evidence: uniqueById([
        ...dataset.evidence,
        wuxiJuniorDirectoryEvidence,
        wuxiHighDirectoryEvidence,
        wuxiEvidence,
      ]),
      coverageGaps: (dataset.coverageGaps ?? []).map((gap) => {
        if (gap.scope === "private_school_pool") return {
          ...gap,
          description: "已恢复无锡市教育局2025年初中和普通高中完整名录中的30所民办学校；2026年新增、停办或更名情况仍需复核",
          evidenceIds: [wuxiJuniorDirectoryEvidence.id, wuxiHighDirectoryEvidence.id],
          nextAction: "待2026年度学校名录发布后进行增删和更名差异核对",
        };
        if (gap.scope === "public_target_pool") return {
          ...gap,
          description: "已建立6所无锡公办高中关注目标；仍需逐校补充学校官网互证",
          evidenceIds: [wuxiEvidence.id],
        };
        return gap;
      }),
    };
  }
  if (dataset.cityName === "温州") {
    return {
      ...dataset,
      schools: uniqueById([...dataset.schools, ...wenzhouPublicSchools]),
      coverage: uniqueCoverage([...dataset.coverage, ...coverageFor(wenzhouPublicSchools, "发现往届参考")]),
      evidence: uniqueById([...dataset.evidence, wenzhouPublicEvidence, wenzhouRecruitmentEvidence]),
      batches: uniqueById([...dataset.batches, {
        id: "batch-wenzhou-direct-2026-graduates",
        employerName: "温州市教育局直属公办学校",
        recruitingAuthority: "温州市教育局",
        schoolIds: wenzhouPublicSchools.map((school) => school.id),
        title: "2026年公开选聘优秀高校毕业生（温州专场）",
        recruitmentCycle: "2026届",
        statusBasis: "reference_2026",
        publishedAt: "2025-10-24",
        accepts2027: "no",
        employmentType: "事业编制",
        employmentEvidenceId: wenzhouRecruitmentEvidence.id,
        applicationMethod: "web",
        applicationUrl: "https://rczp.edu.wenzhou.gov.cn/",
        evidenceIds: [wenzhouRecruitmentEvidence.id],
        lastVerified: verifiedAt,
      }]),
      coverageGaps: (dataset.coverageGaps ?? []).map((gap) => gap.scope === "public_target_pool" ? {
        ...gap,
        description: "已建立6所温州市教育局直属公办高中关注目标；具体优先顺序由用户决定",
        evidenceIds: [wenzhouPublicEvidence.id],
      } : gap),
    };
  }
  if (dataset.cityName === "苏州") {
    const schools = uniqueById([...dataset.schools, ...suzhouAddedSchools, ...suzhouPrivateSchools]);
    const addedCoverage = coverageFor(suzhouAddedSchools, "发现往届参考").map((record) => ({
      ...record,
      relevantPositionIds: suzhouPositions.filter((position) => position.schoolId === record.schoolId).map((position) => position.id),
      searchEvidenceIds: [suzhouRecruitmentEvidence.id, suzhouJobTableEvidence.id],
    }));
    return {
      ...dataset,
      schools,
      coverage: uniqueCoverage([
        ...dataset.coverage,
        ...addedCoverage,
        ...coverageFor(suzhouPrivateSchools, "本轮未发现"),
      ]),
      evidence: uniqueById([
        ...dataset.evidence,
        suzhouRecruitmentEvidence,
        suzhouJobTableEvidence,
        suzhouOutcomeEvidence,
        suzhouPrivateSchoolEvidence,
      ]),
      batches: uniqueById([...dataset.batches, suzhouBatch]),
      positions: uniqueById([...dataset.positions, ...suzhouPositions]),
      outcomes: uniqueById([...dataset.outcomes, ...suzhouOutcomes]),
      coverageGaps: [
        ...(dataset.coverageGaps ?? []).map((gap) => gap.scope === "private_school_pool" && /市区民办普通高中/.test(gap.description) ? {
          ...gap,
          description: "已由苏州市政府2026年招生报道确认苏州工业园区德元新融学校的民办高中身份；苏州市区民办普通高中完整名单仍未恢复",
          evidenceIds: uniqueById([
            ...gap.evidenceIds.map((id) => ({ id })),
            { id: suzhouPrivateSchoolEvidence.id },
          ]).map((item) => item.id),
        } : gap),
        { scope: "outcomes", description: "已结构化2025年相城区政治与历史岗位拟聘用结果；其余年度、区县和学校尚未系统回溯", evidenceIds: [suzhouOutcomeEvidence.id], nextAction: "继续按官方公示逐批匿名聚合" },
      ],
    };
  }
  return dataset;
}

function appendExplicitGaps(dataset: CityDataset): CityDataset {
  const gaps = [...(dataset.coverageGaps ?? [])];
  const hasScope = (scope: NonNullable<CityDataset["coverageGaps"]>[number]["scope"]) => gaps.some((gap) => gap.scope === scope);
  const firstA1Id = dataset.evidence.find((item) => item.sourceLevel === "A1_government")?.id;
  if (dataset.province === "广东" && !hasScope("private_school_pool")) {
    gaps.push({
      scope: "private_school_pool",
      description: "当前正式池来源覆盖民办普通高中；民办初中及一贯制学校的完整区县名单尚未恢复",
      evidenceIds: firstA1Id ? [firstA1Id] : [],
      nextAction: "继续按区县教育部门年度招生或年检名单补齐民办初中",
    });
  }
  if (!dataset.schools.some((school) => school.ownership === "公办") && !hasScope("public_target_pool")) {
    gaps.push({
      scope: "public_target_pool",
      description: `${dataset.cityName}公办高中关注目标尚未建立正式池`,
      evidenceIds: [],
      nextAction: "按政府招生文件和学校官网逐校核验后入池",
    });
  }
  const pendingSearchCount = dataset.coverage.filter((record) => record.currentOutcome === "待检索").length;
  if (pendingSearchCount > 0 && !hasScope("recruitment")) {
    gaps.push({
      scope: "recruitment",
      description: `${pendingSearchCount} 所学校尚未完成政治、经济、社科和历史岗位的逐校检索`,
      evidenceIds: [],
      nextAction: "按学校官网、教育部门和招聘系统顺序逐校复查",
    });
  }
  if (dataset.outcomes.length === 0 && !hasScope("outcomes")) {
    gaps.push({
      scope: "outcomes",
      description: `${dataset.cityName}尚未形成2024—2026年可匿名聚合的官方录用结果样本`,
      evidenceIds: [],
      nextAction: "回溯教育部门、人社部门的拟聘用、体检和考察公示",
    });
  }
  return { ...dataset, coverageGaps: gaps };
}

export function enrichNativeV2Datasets(datasets: CityDataset[]) {
  return datasets.map((dataset) => appendExplicitGaps(normalizeDatasetIntegrity(enrich(dataset), verifiedAt)));
}
