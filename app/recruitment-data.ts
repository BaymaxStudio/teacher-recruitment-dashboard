export type RecruitmentStatus =
  | "27届开放"
  | "常年储备"
  | "等待27届"
  | "26届参考"
  | "已截止";

export type RiskLevel = "低" | "中" | "高" | "待确认";
export type LanguageMode = "中文" | "双语" | "全英文" | "未公开";

export type SelectionStage = {
  name: string;
  detail: string;
  certainty: "已明确" | "部分公开" | "未公开";
  cycle?: string;
};

export type SourceLink = {
  label: string;
  url: string;
  level: "A" | "B" | "C" | "D";
};

export type JobRecord = {
  id: string;
  city: string;
  district: string;
  school: string;
  orgType: "全日制学校" | "教育集团/教培";
  schoolType: string;
  curricula: string[];
  roles: string[];
  roleTags: string[];
  status: RecruitmentStatus;
  published?: string;
  deadline?: string;
  start?: string;
  freshGraduate: "明确接受" | "可能接受" | "不接受/经验岗" | "未公开";
  degree: string;
  major: string;
  certificate: string;
  languageMode: LanguageMode;
  language: string;
  experienceYears?: number;
  experience: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryNote: string;
  benefits: string[];
  workload: string[];
  boarding: boolean | null;
  writtenTest: boolean | null;
  demoLesson: boolean | null;
  onlinePossible: boolean | null;
  certificateRisk: RiskLevel;
  majorRisk: RiskLevel;
  languageRisk: RiskLevel;
  experienceRisk: RiskLevel;
  preparationCost: "低" | "中" | "高" | "待确认";
  stages: SelectionStage[];
  materials: string[];
  application: string;
  email?: string;
  applicationNote: string;
  summary: string;
  fitScore: number;
  sources: SourceLink[];
  lastVerified: string;
};

const unknownStages: SelectionStage[] = [
  { name: "投递", detail: "按公开入口提交材料", certainty: "部分公开" },
  { name: "考核", detail: "笔试、试讲和面试形式未公开，需向校方确认", certainty: "未公开" },
  { name: "录用", detail: "Offer 与签约安排未公开", certainty: "未公开" },
];

const school = (record: Partial<JobRecord> & Pick<JobRecord, "id" | "city" | "district" | "school" | "roles" | "status" | "summary" | "sources">): JobRecord => ({
  orgType: "全日制学校",
  schoolType: "民办中学",
  curricula: ["国家课程"],
  roleTags: ["政治/道法"],
  freshGraduate: "未公开",
  degree: "未公开",
  major: "未公开",
  certificate: "未公开",
  languageMode: "未公开",
  language: "未公开",
  experience: "未公开",
  salaryNote: "未公开",
  benefits: [],
  workload: [],
  boarding: null,
  writtenTest: null,
  demoLesson: null,
  onlinePossible: null,
  certificateRisk: "待确认",
  majorRisk: "待确认",
  languageRisk: "待确认",
  experienceRisk: "待确认",
  preparationCost: "待确认",
  stages: unknownStages,
  materials: ["个人简历"],
  application: record.sources[0]?.url ?? "",
  applicationNote: "投递前确认岗位届次、到岗时间和考核流程。",
  fitScore: 50,
  lastVerified: "2026-08-14",
  ...record,
});

export const jobs: JobRecord[] = [
  school({
    id: "gz-ligong-politics",
    city: "广州", district: "增城", school: "广州理工实验学校",
    schoolType: "民办十二年一贯制寄宿学校", curricula: ["国家课程", "国际方向"],
    roles: ["初中政治", "高中政治"], roleTags: ["政治/道法"], status: "等待27届",
    published: "2025-11-27", freshGraduate: "明确接受", degree: "本科及以上",
    major: "学科相关；经济与贸易类报国内政治存在筛选风险",
    certificate: "对应学段学科教师资格证，可在到岗前取得",
    languageMode: "中文", language: "未公开普通话等级",
    experience: "应届生可报", salaryMin: 15, salaryMax: 18,
    salaryNote: "26届应届生参考年薪15万—18万元",
    benefits: ["免费教师公寓", "工作日餐食"], workload: ["晚修、坐班、班主任未公开"], boarding: true,
    writtenTest: null, demoLesson: true, certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低",
    preparationCost: "中", fitScore: 78,
    stages: [
      { name: "网申", detail: "按公告入口或邮箱提交简历", certainty: "已明确", cycle: "26届参考" },
      { name: "试讲", detail: "公告确认设有试讲，具体形式未完整公开", certainty: "部分公开", cycle: "26届参考" },
      { name: "Offer", detail: "试讲结束后5—7个工作日内发放", certainty: "已明确", cycle: "26届参考" },
    ],
    materials: ["个人简历", "教师资格证或取得计划", "政治课试讲教案"],
    application: "https://jy.gzhu.edu.cn/index.php/web/Index/jobs-brief-detail?id=SVUXSTN", email: "gwzcsy@126.com",
    applicationNote: "旧公告不可直接当作27届入口；建议在2026年11月下旬复查。",
    summary: "上一届明确招政治并接受应届生，薪资达到默认门槛，是广州秋季重点观察对象。",
    sources: [
      { label: "26届高校就业网公告", url: "https://jy.gzhu.edu.cn/index.php/web/Index/jobs-brief-detail?id=SVUXSTN", level: "B" },
      { label: "学校官网", url: "https://www.gzlgsyxx.com/", level: "A" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-tianxing-politics", city: "广州", district: "天河", school: "广州市天省实验学校",
    schoolType: "民办十二年一贯制学校", roles: ["初中政治", "高中政治"], status: "等待27届",
    published: "2025-12-17", freshGraduate: "明确接受", degree: "本科及以上", major: "相关专业，目录未公开",
    certificate: "相应教师资格证", languageMode: "中文", language: "未公开普通话等级", experience: "应届生与在职教师均可",
    salaryMin: 15, salaryMax: 35, salaryNote: "官方长期页总区间，不代表应届生待遇",
    benefits: ["提供食宿"], workload: ["晚修、坐班、班主任未公开"], certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低",
    preparationCost: "待确认", fitScore: 75,
    application: "https://www.gdems.cn/list/16.html", email: "txsyzp@126.com",
    applicationNote: "27届公告尚未发布；2026年12月重点复查。",
    summary: "上一轮全科招聘含初高中政治，长期页接受应届生。",
    sources: [
      { label: "官方人才页", url: "https://www.gdems.cn/list/16.html", level: "A" },
      { label: "26届参考", url: "https://www.gaoxiaojob.com/company/detail/7173.html", level: "C" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-yuanya-politics", city: "广州", district: "白云", school: "广州市源雅学校",
    schoolType: "民办非营利十二年一贯制学校", roles: ["初中政治"], status: "等待27届",
    freshGraduate: "可能接受", degree: "本科及以上", major: "相关专业", certificate: "相应教师资格证",
    languageMode: "中文", language: "未公开普通话等级", salaryMin: 14, salaryMax: 25, salaryNote: "旧平台区间，需校方确认",
    certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", fitScore: 65,
    application: "https://www.yuanyaedu.com/", email: "gzyyxx2021@163.com",
    applicationNote: "未发现27届公告；旧岗位页只作线索。",
    summary: "有初中政治历史岗位线索，但专业对口风险和当前状态都需确认。",
    sources: [
      { label: "学校官网", url: "https://www.yuanyaedu.com/", level: "A" },
      { label: "旧岗位线索", url: "https://www.gaoxiaojob.com/hotword/rkna841372", level: "C" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-experimental-fl-politics", city: "广州", district: "白云", school: "广州市实验外语学校",
    schoolType: "民办十二年一贯制学校", curricula: ["国家课程", "国际课程"], roles: ["初中政治", "高中政治"], status: "常年储备",
    freshGraduate: "可能接受", degree: "高中岗位旧要求偏硕士", major: "哲学、政治学、马克思主义理论、学科教育等方向",
    certificate: "相关学科教师资格", languageMode: "中文", language: "国际课程另行确认", experience: "旧公告曾接受毕业一年内应届生",
    salaryMin: 19, salaryMax: 40, salaryNote: "第三方初中政治岗区间，不是校方应届生承诺",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 64,
    application: "https://eg.gdufs.edu.cn/index/rczp.htm",
    applicationNote: "以广外教育集团官方人才页为入口，第三方只补充薪资。",
    summary: "薪资区间较高，但国内政治岗对学历专业的限制明显。",
    sources: [
      { label: "集团官方人才页", url: "https://eg.gdufs.edu.cn/index/rczp.htm", level: "A" },
      { label: "旧官方政治要求", url: "https://www.gwdwx.com/job/Headlineshow.aspx?i=100004395985283&m=137003", level: "A" },
      { label: "第三方岗位", url: "https://www.lipind.com/position/detail/1014269.html", level: "C" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-weiming-politics", city: "广州", district: "海珠", school: "广州市为明学校",
    schoolType: "民办十二年一贯制学校", roles: ["高中政治"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "专业匹配", certificate: "高中政治教师资格证",
    languageMode: "中文", language: "未公开普通话等级", experienceYears: 5, experience: "约5年高中政治；毕业班、班主任经历优先",
    salaryMin: 18, salaryMax: 30, salaryNote: "当前成熟岗月薪1.5万—2.5万元折算",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "高", fitScore: 42,
    application: "https://www.job910.com/jobs_view_912794.html",
    applicationNote: "当前入口是2026年到岗成熟教师职位，不是27届校招。",
    summary: "薪资达标但经验门槛高，适合作为市场薪资参考。",
    sources: [{ label: "当前高中政治岗", url: "https://www.job910.com/jobs_view_912794.html", level: "C" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-huamei-reserve", city: "广州", district: "天河", school: "广州华美英语实验学校",
    schoolType: "民办全寄宿K12", curricula: ["国家课程", "国际课程"], roles: ["政治/经济/人文岗位待确认"], roleTags: ["政治/道法", "经济/商科", "历史/人文"], status: "常年储备",
    freshGraduate: "未公开", degree: "按岗位审核", major: "按岗位审核", certificate: "按岗位审核",
    languageMode: "未公开", language: "国际课程岗位需确认英语要求", experience: "未公开", salaryNote: "未公开",
    benefits: ["免费食宿", "带薪寒暑假", "社保公积金"], workload: ["全寄宿；晚修、坐班、班主任未公开"], boarding: true,
    application: "https://www.hm163.com/col134/index", email: "hm123@huamei163.com", fitScore: 55,
    applicationNote: "先邮件询问2027年秋季政治、经济或人文岗位。",
    summary: "官方人才页长期开放，但尚未检出27届相关学科公告。",
    sources: [{ label: "官方招聘页", url: "https://www.hm163.com/col134/index", level: "A" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-gis-economics", city: "广州", district: "白云", school: "广外国际学校（广州）",
    schoolType: "非营利十二年一贯制国际化学校", curricula: ["HKDSE", "IBDP", "国际课程"], roles: ["Economics"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "相关专业硕士", major: "经济、商科等相关专业", certificate: "教师资格",
    languageMode: "双语", language: "偏好全英文/双语教学能力，未给统一考试分数", experienceYears: 3, experience: "偏好3—5年、国际课程及班主任经验",
    salaryMin: 25, salaryMax: 40, salaryNote: "官方税前年薪区间，不代表应届生待遇",
    benefits: [], workload: ["班主任经验为偏好项", "住宿、坐班未公开"],
    certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "高", fitScore: 70,
    application: "https://gisen.gdufs.edu.cn/Recruitment.htm", email: "GIS_GZ@163.com",
    applicationNote: "先邮件确认能否接受2027年秋季到岗的应届生。",
    summary: "专业方向匹配度高，但英语授课和经验要求是主要门槛。",
    sources: [{ label: "官方招聘页", url: "https://gisen.gdufs.edu.cn/Recruitment.htm", level: "A" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-hfi-business", city: "广州", district: "天河", school: "华附国际部 HFI",
    schoolType: "国际高中", curricula: ["AP", "国际课程"], roles: ["AP商科", "历史"], roleTags: ["经济/商科", "历史/人文"], status: "26届参考",
    published: "2025-11-12", start: "2026-08", freshGraduate: "不接受/经验岗", degree: "相关专业硕士",
    major: "经济、商科、历史等相关专业", certificate: "教师资格", languageMode: "全英文", language: "全英文授课能力",
    experienceYears: 2, experience: "约2年相关经验", salaryNote: "未公开", certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "高",
    preparationCost: "高", fitScore: 58, application: "https://www.gdhfi.com/jobs/index.html", email: "gzhr@gdhfi.com",
    applicationNote: "页面对应2026—2027学年，不是27届入口。",
    summary: "商科方向匹配，但全英文授课与国际课程经验要求较高。",
    sources: [
      { label: "官方公告", url: "https://www.gdhfi.com/news/1455.html", level: "A" },
      { label: "官方职位页", url: "https://www.gdhfi.com/jobs/index.html", level: "A" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-zhonghuang-dse", city: "广州", district: "多校区", school: "中黄教育旗下广州学校",
    schoolType: "民办教育集团旗下学校", curricula: ["DSE", "IB", "国家课程"], roles: ["DSE历史", "DSE经济"], roleTags: ["经济/商科", "历史/人文"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "相关专业", certificate: "教师资格或岗位认可资质",
    languageMode: "双语", language: "双语能力需逐岗确认", experienceYears: 2, experience: "第三方岗位多要求约2年经验", salaryNote: "未公开",
    certificateRisk: "中", majorRisk: "低", languageRisk: "中", experienceRisk: "高", fitScore: 62,
    application: "https://www.czwie.com/zwie/talent", applicationNote: "以集团官方人才页为正式入口。",
    summary: "DSE经济专业方向较匹配，经验与双语要求需确认。",
    sources: [
      { label: "集团官方人才页", url: "https://www.czwie.com/zwie/talent", level: "A" },
      { label: "第三方岗位汇总", url: "https://50750.zp.job910.com/?at=1207", level: "C" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "gz-chaohui-politics", city: "广州", district: "南沙", school: "广州南沙朝晖学校",
    schoolType: "民办全日制寄宿高中", roles: ["高中政治"], status: "已截止", published: "2026-06-10", deadline: "2026-06-25", start: "2026-08",
    freshGraduate: "明确接受", degree: "硕士及以上", major: "学科相关", certificate: "按公告期限取得教师资格",
    languageMode: "中文", language: "未公开普通话等级", experience: "应届生可报", salaryMin: 10, salaryMax: 18, salaryNote: "上一轮应届生参考",
    benefits: [], workload: ["寄宿；晚修、坐班、班主任未公开"], boarding: true,
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 55,
    application: "https://www.nsrcup.com/notice/596", applicationNote: "已过截止日期，仅作春夏季补录参考。",
    summary: "明确接受应届硕士，但薪资下限低于默认门槛且本轮已截止。",
    sources: [{ label: "南沙人才招聘公告", url: "https://www.nsrcup.com/notice/596", level: "B" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-bgy-economics", city: "顺德", district: "北滘", school: "广东碧桂园学校",
    schoolType: "民办寄宿K12", curricula: ["国家课程", "MYP/DP", "IGCSE/A-Level", "AP"],
    roles: ["Economics", "Global Perspectives", "Critical Thinking"], roleTags: ["经济/商科", "全球视野/社科"], status: "常年储备",
    freshGraduate: "明确接受", degree: "本科或硕士", major: "经济、贸易、社科等相关背景", certificate: "相应教师资格或课程资质",
    languageMode: "双语", language: "CET-6及英语表达能力，具体分数按岗位", experience: "官方人才库接受优秀应届生", salaryNote: "27届未公开",
    benefits: ["集团学校体系福利"], workload: ["寄宿；晚修、坐班、班主任未公开"], boarding: true,
    writtenTest: null, demoLesson: true, certificateRisk: "中", majorRisk: "低", languageRisk: "中", experienceRisk: "低", preparationCost: "中", fitScore: 89,
    stages: [
      { name: "简历筛选", detail: "邮箱或人才库投递后电话通知", certainty: "已明确", cycle: "旧流程参考" },
      { name: "现场试教", detail: "旧公开流程设现场试教", certainty: "已明确", cycle: "旧流程参考" },
      { name: "面谈", detail: "试教后面谈", certainty: "已明确", cycle: "旧流程参考" },
      { name: "Offer", detail: "通过后发放", certainty: "已明确", cycle: "旧流程参考" },
    ],
    materials: ["中英文简历", "成绩单", "教师资格证", "双语试讲教案"],
    application: "https://www.cg-schools.com/join_us.html", email: "wenyuanru@bgyschools.cn",
    applicationNote: "投人才库前先确认2027年秋季到岗与具体课程岗位。",
    summary: "经济与社科背景匹配、接受优秀应届生，是当前优先询问对象。",
    sources: [
      { label: "集团官方人才页", url: "https://www.cg-schools.com/join_us.html", level: "A" },
      { label: "学校官方招聘页", url: "https://bgy.gd.cn/zpxq.html", level: "A" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-desheng-politics-econ", city: "顺德", district: "大良", school: "广东顺德德胜学校",
    schoolType: "民办十二年一贯制学校", curricula: ["国家课程", "IGCSE/IBDP"], roles: ["高中政治", "IGCSE/IBDP Economics"], roleTags: ["政治/道法", "经济/商科"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "专业匹配", certificate: "对应学科教师资格",
    languageMode: "双语", language: "经济岗需确认双语/英语要求", experienceYears: 3, experience: "公开岗位约3年经验",
    salaryMin: 23, salaryMax: 46, salaryNote: "政治岗总区间；经济岗约1.6万—2.3万元/月",
    certificateRisk: "中", majorRisk: "中", languageRisk: "中", experienceRisk: "高", fitScore: 67,
    application: "https://www.job910.com/jobs_view_841585.html", email: "deshengschool@desheng-school.com",
    applicationNote: "当前为储备经验岗，不标作27届校招。",
    summary: "岗位和薪资均有吸引力，但三年经验是明确障碍。",
    sources: [
      { label: "高中政治储备岗", url: "https://www.job910.com/jobs_view_841585.html", level: "C" },
      { label: "26届高校参考", url: "https://ste.nuist.edu.cn/2025/1222/c5510a293403/page.htm", level: "B" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-meichen-politics", city: "顺德", district: "大良", school: "顺德区美辰学校",
    schoolType: "民办九年一贯制学校", roles: ["初中政治"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上，硕士优先", major: "偏好重点师范院校相关专业", certificate: "初中政治教师资格",
    languageMode: "中文", language: "未公开普通话等级", experience: "优秀应届生可报", salaryNote: "未公开",
    benefits: ["五险一金"], workload: ["明确希望承担班主任"], certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 72,
    application: "https://www.job910.com/school_view_31817.html", email: "sdmcschool@163.com",
    applicationNote: "页面未写27届和截止时间，先邮件询问。",
    summary: "初中政治证书匹配较好，但非师范或非思政专业存在风险。",
    sources: [{ label: "学校岗位页", url: "https://www.job910.com/school_view_31817.html", level: "C" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-dongyiwan-politics", city: "顺德", district: "容桂", school: "广东实验中学顺德学校（东逸湾实验学校）",
    schoolType: "民办K12", roles: ["政治"], status: "等待27届", published: "2025-10-10",
    freshGraduate: "未公开", degree: "未公开", major: "未公开", certificate: "按学段核验", languageMode: "中文", language: "未公开",
    salaryNote: "未公开", certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", fitScore: 69,
    application: "https://scdc.jnu.edu.cn/campus/view/id/1035627", email: "gdsysd@126.com",
    applicationNote: "上一轮10月出现政治岗，建议2026年10月复查。",
    summary: "上一轮发布时间较早，是顺德秋招观察重点。",
    sources: [
      { label: "上一轮岗位参考", url: "https://www.gaoxiaojob.com/company/detail/123271.html", level: "C" },
      { label: "2026学校招聘参考", url: "https://scdc.jnu.edu.cn/campus/view/id/1035627", level: "B" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-yangzheng-civics", city: "顺德", district: "北滘", school: "顺德养正学校",
    schoolType: "民办九年一贯制寄宿学校", roles: ["初中道法"], status: "26届参考", published: "2026-07-14",
    freshGraduate: "可能接受", degree: "本科及以上", major: "偏好对口及重点师范院校", certificate: "初中政治/道法教师资格",
    languageMode: "中文", language: "未公开普通话等级", experience: "整体偏成熟教师，特别优秀应届生可能放宽",
    salaryMin: 25, salaryMax: 40, salaryNote: "第三方岗位总区间，不代表应届生待遇", boarding: true,
    certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 61,
    application: "https://www.gaoxiaojob.com/announcement/detail/25007.html",
    applicationNote: "投递前核实页面是否仍收简历及应届生标准。",
    summary: "证书方向较匹配，但专业与师范背景要求偏严。",
    sources: [{ label: "招聘参考公告", url: "https://www.gaoxiaojob.com/announcement/detail/25007.html", level: "C" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-asj-economics", city: "佛山", district: "南海", school: "佛山暨大港澳子弟学校 ASJ",
    schoolType: "民办港澳子弟学校", curricula: ["DSE", "国际课程"], roles: ["国际经济", "DSE经济"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "经济相关专业", certificate: "教师资格或岗位认可资质",
    languageMode: "双语", language: "双语或全英文授课", experienceYears: 2, experience: "约2年经验",
    salaryMin: 15.6, salaryMax: 30, salaryNote: "平台月薪1.3万—2.5万元折算", certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "高", fitScore: 65,
    application: "https://asjfoshan.org.cn/sys-index/", applicationNote: "官方页未展示27届入口，第三方职位需校方确认。",
    summary: "经济专业匹配度较好，主要门槛是双语教学和经验。",
    sources: [
      { label: "学校官网", url: "https://asjfoshan.org.cn/sys-index/", level: "A" },
      { label: "第三方岗位页", url: "https://www.job910.com/school_view_131444.html", level: "C" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "fs-zhonghuang-econ", city: "顺德", district: "乐从", school: "中黄星瑜港澳子弟学校",
    schoolType: "民办港澳子弟学校", curricula: ["DSE"], roles: ["DSE经济"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "未公开", degree: "本科及以上", major: "经济相关专业", certificate: "教师资格或岗位认可资质",
    languageMode: "双语", language: "双语要求需确认", experience: "应届生能否放宽需确认", salaryNote: "未公开",
    certificateRisk: "中", majorRisk: "低", languageRisk: "中", experienceRisk: "待确认", fitScore: 71,
    application: "https://www.fszwss.com/zwss/contact", applicationNote: "通过官方联系页确认招聘邮箱与2027到岗计划。",
    summary: "经济专业方向较匹配，但当前只有长期联系入口。",
    sources: [
      { label: "学校官方联系页", url: "https://www.fszwss.com/zwss/contact", level: "A" },
      { label: "集团人才页", url: "https://www.czwie.com/zwie/talent", level: "A" },
    ], lastVerified: "2026-08-13",
  }),
  school({
    id: "dg-hanlin-politics", city: "东莞", district: "南城", school: "东莞市翰林实验学校",
    schoolType: "民办K12寄宿学校", roles: ["高中政治"], status: "已截止", published: "2026-04-14", deadline: "2026-04-27",
    freshGraduate: "明确接受", degree: "硕士及以上，优秀本科可放宽", major: "学科专业功底", certificate: "未公开取得期限",
    languageMode: "中文", language: "英语能力突出者优先", experience: "2026届应届生", salaryMin: 20, salaryMax: 45, salaryNote: "公告总区间",
    benefits: ["五险一金", "企业年金", "人才公寓或住房补贴", "工作餐"], boarding: true,
    writtenTest: false, demoLesson: true, onlinePossible: true, certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", preparationCost: "高", fitScore: 76,
    stages: [
      { name: "网申", detail: "简历与个人陈述", certainty: "已明确", cycle: "26届参考" },
      { name: "线上评估", detail: "简历综合潜能测评", certainty: "已明确", cycle: "26届参考" },
      { name: "教学展示", detail: "提交微课视频与教学设计", certainty: "已明确", cycle: "26届参考" },
      { name: "云端面试", detail: "校长、学部主任及未来同事线上交流", certainty: "已明确", cycle: "26届参考" },
      { name: "签约", detail: "发放录用通知并签订三方协议", certainty: "已明确", cycle: "26届参考" },
    ],
    materials: ["个人简历", "个人陈述", "微课视频", "教学设计"],
    application: "https://comm.ecnu.edu.cn/87/fc/c51755a755708/page.htm", email: "3684240289@qq.com",
    applicationNote: "26届已截止，可按流程提前准备27届材料。",
    summary: "应届生友好且流程公开完整，是春招准备样本。",
    sources: [{ label: "高校就业网公告", url: "https://comm.ecnu.edu.cn/87/fc/c51755a755708/page.htm", level: "B" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "dg-yuhuayuan-politics", city: "东莞", district: "凤岗", school: "南城御花苑外国语学校高中部",
    schoolType: "民办高中", roles: ["高中政治", "历史"], roleTags: ["政治/道法", "历史/人文"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上", major: "相应师范类专业", certificate: "2026-08-31前取得对应学段学科教师资格",
    languageMode: "中文", language: "未公开普通话等级", experience: "应届生可报", salaryMin: 12, salaryMax: 30, salaryNote: "公告年薪区间",
    benefits: ["免费食宿", "五险一金"], workload: ["明确坐班制"], boarding: true,
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 62,
    application: "https://job.gzus.edu.cn/detail/jobfair_apply?apply_id=1676523&company_id=682517", email: "YHYWGYXX@163.com",
    applicationNote: "2026年到岗参考，不是27届入口。",
    summary: "应届生友好，但师范对口专业要求严格，薪资下限低于默认门槛。",
    sources: [{ label: "高校就业网招聘页", url: "https://job.gzus.edu.cn/detail/jobfair_apply?apply_id=1676523&company_id=682517", level: "B" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "hz-honghua-politics", city: "惠州", district: "仲恺", school: "惠州宏华中学",
    schoolType: "民办寄宿高中", roles: ["高中政治"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上，偏好重点师范或双一流", major: "学科相关要求需确认", certificate: "未公开期限",
    languageMode: "中文", language: "未公开", experience: "优秀应届生可报", salaryMin: 16, salaryMax: 25, salaryNote: "教龄2年以下及优秀应届生区间",
    benefits: ["教师公寓", "用餐补贴", "五险一金"], workload: ["班主任经验优先"], boarding: true,
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 72,
    application: "https://www.hip.edu.cn/jyzx/info/1018/2363.htm", applicationNote: "表单是否仍接收需先确认。",
    summary: "薪资下限达标且明确考虑优秀应届生。",
    sources: [{ label: "高校就业中心公告", url: "https://www.hip.edu.cn/jyzx/info/1018/2363.htm", level: "B" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "hz-guangzheng-politics", city: "惠州", district: "惠城", school: "惠州广正实验学校",
    schoolType: "民办寄宿K12", roles: ["初中政治"], status: "常年储备",
    freshGraduate: "可能接受", degree: "本科及以上", major: "偏好优秀师范院校", certificate: "初中政治教师资格",
    languageMode: "中文", language: "未公开", experience: "优秀应届生可能接受", salaryMin: 12, salaryMax: 25, salaryNote: "平台初中教师总区间",
    boarding: true, certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 58,
    application: "https://77260.zp.job910.com/", applicationNote: "通过微信hzgzhr向校方确认职位。",
    summary: "证书方向较匹配，但薪资下限和专业要求需确认。",
    sources: [{ label: "教师招聘平台学校页", url: "https://77260.zp.job910.com/", level: "C" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "zh-yifu-politics", city: "珠海", district: "香洲", school: "珠海一附实验中学",
    schoolType: "民办全寄宿中学", roles: ["政治"], status: "26届参考",
    freshGraduate: "未公开", degree: "待校方确认", major: "待校方确认", certificate: "待校方确认", languageMode: "中文", language: "未公开",
    salaryNote: "未可靠提取", boarding: true, fitScore: 48,
    application: "https://www.liuxueyoupin.com/nd.jsp?fromColId=2&id=5002", applicationNote: "转载页偶发超时，只作线索。",
    summary: "有政治岗转载线索，但要求、薪资和流程均需校方二次确认。",
    sources: [{ label: "招聘转载线索", url: "https://www.liuxueyoupin.com/nd.jsp?fromColId=2&id=5002", level: "D" }], lastVerified: "2026-08-13",
  }),
  school({
    id: "sz-scie-social-science", city: "深圳", district: "福田", school: "深圳国际交流书院 SCIE",
    schoolType: "民办国际高中", curricula: ["IGCSE", "A-Level", "AP"], roles: ["Economics", "Global Perspectives"], roleTags: ["经济/商科", "全球视野/社科"], status: "26届参考",
    start: "2026-08-01", freshGraduate: "不接受/经验岗", degree: "任教学科相关学位", major: "经济或人文社科相关专业",
    certificate: "PGCE、QTS或同等教学资质", languageMode: "全英文", language: "全英文工作与授课；未公布IELTS分数",
    experienceYears: 2, experience: "至少2年A-Level/IGCSE/AP相关经验", salaryNote: "固定薪级但未公开数值",
    benefits: ["校方住宿", "国际医疗", "机票津贴"], workload: ["周一至周五", "约50%课表", "每周1小时课外活动", "多数教师承担约20人导师组", "无宿舍夜间值班"], boarding: true,
    writtenTest: null, demoLesson: null, onlinePossible: null, certificateRisk: "高", majorRisk: "低", languageRisk: "高", experienceRisk: "高", preparationCost: "高", fitScore: 72,
    stages: [
      { name: "邮件申请", detail: "求职信与CV发送至jobs@scie.com.cn", certainty: "已明确", cycle: "2026—2027学年" },
      { name: "面试/教学考核", detail: "具体轮次与试讲形式未在职位页公开", certainty: "未公开", cycle: "2026—2027学年" },
      { name: "推荐人核查", detail: "联系现任或最近雇主，进行儿童保护推荐核查并确认合同状态", certainty: "已明确", cycle: "2026—2027学年" },
    ],
    materials: ["英文求职信", "英文CV", "推荐人信息", "国际课程教学证明"],
    application: "https://www.scie.com.cn/vacancies/", email: "jobs@scie.com.cn",
    applicationNote: "职位为2026年8月到岗，保留作27届国际课程门槛参考。",
    summary: "课程方向高度匹配，但国际教师资质、全英文和两年课程经验门槛高。",
    sources: [
      { label: "官方Economics职位", url: "https://www.scie.com.cn/jobs-economics/", level: "A" },
      { label: "官方Global Perspectives职位", url: "https://www.scie.com.cn/jobs-global-perspectives/", level: "A" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-vma-economics", city: "深圳", district: "盐田", school: "万科梅沙书院",
    schoolType: "民办国际化寄宿高中", curricula: ["IGCSE", "A-Level", "AP", "中英融合课程"], roles: ["Business Studies & Economics"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "经济、商科相关专业", certificate: "专业教学认证或教育领域同等资质",
    languageMode: "全英文", language: "IELTS 7.0", experienceYears: 2, experience: "2年以上国际学校；IB/AP/A-Level/IGCSE优先",
    salaryNote: "未公开", benefits: ["住房补贴", "补充商业保险", "带薪寒暑假", "子女学费减免"], workload: ["寄宿学校；晚间职责未公开"], boarding: true,
    certificateRisk: "高", majorRisk: "低", languageRisk: "高", experienceRisk: "高", preparationCost: "高", fitScore: 74,
    application: "https://www.vma.edu.cn/job/", email: "vma_hr@vma.edu.cn",
    applicationNote: "简历进入人才库，岗位开放时优先联系；未标27届。",
    summary: "官方经济商科入口明确，IELTS 7.0和两年国际校经验是硬门槛。",
    sources: [{ label: "官方加入我们", url: "https://www.vma.edu.cn/job/", level: "A" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-sendelta-econ", city: "深圳", district: "宝安", school: "深圳新哲文院",
    schoolType: "民办国际课程学校", curricula: ["AP", "A-Level", "IGCSE"], roles: ["历史", "经济商务"], roleTags: ["经济/商科", "历史/人文"], status: "常年储备",
    freshGraduate: "可能接受", degree: "本科及以上", major: "相关专业背景", certificate: "未公开教师资格硬性要求",
    languageMode: "双语", language: "可双语教学；海外留学优先", experience: "熟悉AP/A-Level，经验年限未写死", salaryNote: "未公开",
    certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "中", preparationCost: "中", fitScore: 79,
    application: "https://www.siasz.cn/zhaopin", email: "hrjobs@sendelta.com",
    applicationNote: "邮件主题为姓名+岗位+区域（深圳或广州）。",
    summary: "专业方向匹配，经验表述比深国交、万科梅沙更宽，但薪资和流程未公开。",
    sources: [{ label: "官方全球招聘", url: "https://www.siasz.cn/zhaopin", level: "A" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-taoyuan-politics", city: "深圳", district: "宝安", school: "桃源居中澳实验学校",
    schoolType: "民办十二年一贯制寄宿学校", curricula: ["国家课程", "国际方向"], roles: ["高中政治"], status: "26届参考", published: "2026-02-06",
    freshGraduate: "未公开", degree: "本轮公开摘要未完整披露", major: "待校方确认", certificate: "待校方确认",
    languageMode: "中文", language: "未公开", experience: "未公开", salaryNote: "未公开", boarding: true,
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", fitScore: 68,
    application: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_12635476.html",
    applicationNote: "政府页确认2026年2月招高中政治，27届尚未开放。",
    summary: "深圳官方渠道可验证的高中政治招聘样本，适合观察下一轮时间。",
    sources: [{ label: "宝安区教育局招聘页", url: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_12635476.html", level: "B" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-songgang-politics", city: "深圳", district: "宝安", school: "松岗中英文实验学校",
    schoolType: "民办十二年一贯制寄宿学校", roles: ["高中政治"], status: "26届参考",
    freshGraduate: "明确接受", degree: "师范类本科及以上", major: "专业对口", certificate: "对应教师资格；面试携带原件",
    languageMode: "中文", language: "需普通话证，等级未写", experience: "欢迎优秀应届生", salaryMin: 14.4, salaryMax: 16.8, salaryNote: "高中月薪1.2万—1.4万元折算，不含从教津贴",
    benefits: ["免费食宿", "五险一金", "政府从教津贴"], workload: ["寄宿；班主任能力被列为要求"], boarding: true,
    writtenTest: true, demoLesson: true, onlinePossible: false, certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", preparationCost: "高", fitScore: 66,
    stages: [
      { name: "材料初审", detail: "Word简历、全身彩照等邮件投递", certainty: "已明确", cycle: "旧流程参考" },
      { name: "模拟讲课", detail: "资料审核后进行模拟讲课", certainty: "已明确", cycle: "旧流程参考" },
      { name: "复试", detail: "教师视情况加笔试，专业教师加技能考核", certainty: "已明确", cycle: "旧流程参考" },
      { name: "考核组面谈", detail: "现场面谈后择优录用", certainty: "已明确", cycle: "旧流程参考" },
      { name: "背景核查", detail: "学校按程序核实无犯罪记录", certainty: "已明确", cycle: "旧流程参考" },
    ],
    materials: ["Word简历", "近期全身彩照", "身份证", "学历学位证", "职称证", "教师资格证", "普通话证", "荣誉证书", "试讲教案"],
    application: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_11931122.html", email: "sgzywsyxx_gzb@baoan.gov.cn",
    applicationNote: "公开完整流程属于旧周期；2026年7月仍有学校招聘动态，但学科需另核。",
    summary: "流程信息最完整，应届生可报；薪资下限略低于默认门槛。",
    sources: [{ label: "宝安区教育局招聘页", url: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_11931122.html", level: "B" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-jianwen-politics", city: "深圳", district: "龙岗", school: "深圳市建文外国语学校",
    schoolType: "民办十二年一贯制寄宿学校", roles: ["高中政治", "历史"], roleTags: ["政治/道法", "历史/人文"], status: "26届参考", published: "2026-06-29",
    freshGraduate: "未公开", degree: "未公开", major: "待校方确认", certificate: "待校方确认", languageMode: "中文", language: "未公开", experience: "未公开", salaryNote: "未公开",
    boarding: true, writtenTest: null, demoLesson: null, certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", fitScore: 66,
    stages: [
      { name: "邮件投递", detail: "简历以应聘岗位+毕业院校命名并附全身照片", certainty: "已明确", cycle: "26届参考" },
      { name: "简历初审", detail: "通过后电话或短信通知", certainty: "已明确", cycle: "26届参考" },
      { name: "面试", detail: "具体是否笔试或试讲未公开", certainty: "部分公开", cycle: "26届参考" },
    ],
    materials: ["个人简历", "全身照片"], application: "https://www.fenbi.com/page/fenxiaozhaokaodetail/2/0/463792638281728", email: "szsjwwgyxx@163.com",
    applicationNote: "第三方转载显示2026年高中政治招聘；需向学校确认27届。",
    summary: "有较新的高中政治线索，但薪资、资质和试讲形式未公开。",
    sources: [
      { label: "2026招聘转载", url: "https://www.fenbi.com/page/fenxiaozhaokaodetail/2/0/463792638281728", level: "C" },
      { label: "龙岗招聘索引", url: "https://www.shenzhenjiaoshi.com/zhaopin/longgangqu/", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-hualang-politics", city: "深圳", district: "坪山", school: "深圳市华朗学校",
    schoolType: "民办非营利十二年一贯制寄宿学校", roles: ["高中政治"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上", major: "师范或相关专业优先", certificate: "按校方期限取得教师资格",
    languageMode: "中文", language: "未公开", experience: "2026届春招管培生", salaryMin: 17, salaryMax: 30, salaryNote: "旧公告参考区间",
    benefits: ["坪山区民办教师从教津贴"], boarding: true, certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 78,
    application: "https://scdc.jnu.edu.cn/campus/view/id/1034250",
    applicationNote: "2026届春招参考，27届尚未发现。",
    summary: "深圳应届生政治岗的重要参考，薪资下限达到默认门槛。",
    sources: [
      { label: "高校就业网公告", url: "https://scdc.jnu.edu.cn/campus/view/id/1034250", level: "B" },
      { label: "第三方岗位页", url: "https://www.zhaopin.com/jobdetail/CCL1431222830J40753731406.htm", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-maple-all", city: "深圳", district: "龙岗", school: "深圳市枫叶学校",
    schoolType: "民办寄宿学校", curricula: ["国家课程", "国际融合课程"], roles: ["小初高各科（政治岗位需确认）"], roleTags: ["政治/道法", "历史/人文"], status: "常年储备",
    freshGraduate: "未公开", degree: "本科及以上", major: "任教学科相关专业", certificate: "相应专业教师资格证",
    languageMode: "未公开", language: "国际方向需确认", experience: "未公开", salaryMin: 14.4, salaryNote: "官方写明教师月薪1.2万元以上",
    benefits: ["子女入学优惠", "继续教育培训"], boarding: true, certificateRisk: "中", majorRisk: "高", languageRisk: "待确认", experienceRisk: "待确认", fitScore: 59,
    application: "https://shenzhen.mapleleaf.cn/Content/index/catid/501.html",
    applicationNote: "官方快速申请长期存在，先确认政治/人文岗位与薪资。",
    summary: "官方入口和薪资下限明确，但当前相关学科岗位未单列。",
    sources: [{ label: "学校官方招聘页", url: "https://shenzhen.mapleleaf.cn/Content/index/catid/501.html", level: "A" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-grit-history", city: "深圳", district: "龙华", school: "深圳市格睿特高级中学",
    schoolType: "民办寄宿高中", curricula: ["国家课程", "国际融合课程"], roles: ["高中历史"], roleTags: ["历史/人文"], status: "常年储备",
    freshGraduate: "可能接受", degree: "本科及以上，研究生优先", major: "历史相关专业", certificate: "对应教师资格",
    languageMode: "中文", language: "国际方向另行确认", experienceYears: 3, experience: "职位页显示3年以上，但薪资说明单列优秀应届生",
    salaryMin: 15, salaryMax: 30, salaryNote: "应届生15万—20万元，其他教师按层级",
    benefits: ["五险一金", "提供住宿", "带薪休假"], boarding: true,
    certificateRisk: "高", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 48,
    application: "https://www.gritedu.cn/", email: "gritgrit2021@163.com",
    applicationNote: "目前是历史岗，不是政治/经济；作为人文方向备选。",
    summary: "薪资达到门槛并提及优秀应届生，但学科和专业匹配较弱。",
    sources: [
      { label: "学校官网", url: "https://www.gritedu.cn/", level: "A" },
      { label: "高中历史岗位", url: "https://www.job910.com/jobs_view_334621.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "edu-xdf-27", city: "多城市", district: "广州/佛山/东莞/珠海/深圳", school: "新东方",
    orgType: "教育集团/教培", schoolType: "教育培训机构", curricula: ["非义务教育培训"], roles: ["27届中学教师", "高中班课", "一对一"], roleTags: ["政治/道法", "经济/商科", "历史/人文"], status: "27届开放",
    freshGraduate: "明确接受", degree: "本科及以上", major: "目录含经济与贸易、经济学、政治学、社会学等", certificate: "教师资格可按岗位培训考取",
    languageMode: "中文", language: "具体学科另核", experience: "2026—2027届毕业生", salaryMin: 14.4, salaryMax: 28.8, salaryNote: "高潜岗位月薪1.2万—2.4万元折算",
    benefits: ["五险一金"], workload: ["晚班、周末授课、课时绩效需确认"], boarding: false,
    writtenTest: null, demoLesson: true, onlinePossible: true, certificateRisk: "低", majorRisk: "低", languageRisk: "低", experienceRisk: "低", preparationCost: "中", fitScore: 83,
    stages: [
      { name: "网申", detail: "在联合校招职位列表选择城市和岗位", certainty: "已明确", cycle: "27届" },
      { name: "教学考核", detail: "磨课、教学展示或试讲，具体由城市岗位通知", certainty: "部分公开", cycle: "27届" },
      { name: "面试", detail: "轮次未统一公开", certainty: "未公开", cycle: "27届" },
    ],
    materials: ["个人简历", "试讲内容", "教师资格证或考取计划"],
    application: "https://www.91wllm.cn/campusUnion/view/id/1000612", applicationNote: "提交前核对实际城市、学科和签约主体。",
    summary: "当前少数明确开放的27届入口，但属于教培而非全日制学校。",
    sources: [
      { label: "27届联合校招", url: "https://www.91wllm.cn/campusUnion/view/id/1000612", level: "B" },
      { label: "27届高潜教师", url: "https://www.zhaopin.com/jobdetail/CC120002360J40995579002.htm", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "edu-zhuoyue-27", city: "广州", district: "各校区", school: "卓越教育",
    orgType: "教育集团/教培", schoolType: "教育培训机构", curricula: ["学科培训"], roles: ["小学语数英", "初中语数英", "高中数理化英"], roleTags: ["其他"], status: "27届开放",
    published: "2026-06-26", deadline: "2026-08-31", freshGraduate: "明确接受", degree: "本科及以上", major: "目录含国际经济与贸易，但无政治/经济岗位",
    certificate: "按职位核验", languageMode: "中文", language: "英语岗另核", experience: "27届提前批",
    salaryMin: 9.6, salaryMax: 13.2, salaryNote: "月薪8000—11000元折算", boarding: false,
    certificateRisk: "待确认", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 28,
    application: "https://career.xtu.edu.cn/campus/view/id/936100", applicationNote: "薪资上限低于默认门槛且无相关学科，默认隐藏。",
    summary: "27届仍开放，但岗位和薪资均不符合当前优先条件。",
    sources: [{ label: "27届提前批公告", url: "https://career.xtu.edu.cn/campus/view/id/936100", level: "B" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "edu-skled-27", city: "多城市", district: "深圳/广州/东莞/佛山", school: "思考乐教育",
    orgType: "教育集团/教培", schoolType: "教育培训机构", curricula: ["素养与高中培训"], roles: ["高中语数英物化", "小学初中素养"], roleTags: ["其他"], status: "已截止",
    published: "2026-07-20", deadline: "2026-07-27", freshGraduate: "明确接受", degree: "统招一本及以上", major: "无政治或经济岗位", certificate: "未公开",
    languageMode: "中文", language: "未公开", experience: "2027届", salaryNote: "未公开统一月薪", boarding: false,
    writtenTest: true, demoLesson: true, onlinePossible: true, certificateRisk: "待确认", majorRisk: "高", languageRisk: "低", experienceRisk: "低", preparationCost: "中", fitScore: 30,
    stages: [
      { name: "扫码网申", detail: "原公告二维码入口", certainty: "已明确", cycle: "27届首轮" },
      { name: "在线笔试", detail: "公告明确有线上笔试", certainty: "已明确", cycle: "27届首轮" },
      { name: "在线试讲", detail: "公告明确有在线试讲", certainty: "已明确", cycle: "27届首轮" },
      { name: "HR面谈", detail: "试讲后HR面谈并签约", certainty: "已明确", cycle: "27届首轮" },
    ],
    materials: ["个人简历", "线上笔试准备", "试讲内容"],
    application: "https://www.fenbi.com/page/exam-information-detail/467845654270977", email: "recruiting@skledu.com",
    applicationNote: "首轮已截止，只宜询问后续批次。",
    summary: "流程公开但无相关学科，首轮也已截止。",
    sources: [{ label: "27届秋招公告", url: "https://www.fenbi.com/page/exam-information-detail/467845654270977", level: "C" }], lastVerified: "2026-08-14",
  }),
];

export type CoverageRecord = {
  name: string;
  district: string;
  boarding: "全住宿" | "部分住宿" | "走读" | "未公开";
  outcome: "发现相关岗位" | "发现教师入口" | "本轮未发现相关岗位";
};

const coverage = (district: string, boarding: CoverageRecord["boarding"], entries: Array<[string, CoverageRecord["outcome"]]>): CoverageRecord[] =>
  entries.map(([name, outcome]) => ({ name, district, boarding, outcome }));

export const shenzhenCoverage: CoverageRecord[] = [
  ...coverage("罗湖", "全住宿", [["深圳市罗湖区华美外国语学校", "本轮未发现相关岗位"]]),
  ...coverage("盐田", "全住宿", [["深圳市万科梅沙书院", "发现相关岗位"], ["深圳市盐田区梅沙双语学校", "本轮未发现相关岗位"]]),
  ...coverage("南山", "全住宿", [["深圳（南山）中加学校", "发现教师入口"], ["深圳市南山中英文学校", "发现教师入口"]]),
  ...coverage("宝安", "全住宿", [
    ["深圳东方英文书院", "发现教师入口"], ["深圳市崛起实验中学", "本轮未发现相关岗位"], ["深圳市桃源居中澳实验学校", "发现相关岗位"],
    ["深圳市华胜实验学校", "本轮未发现相关岗位"], ["深圳市富源学校", "发现教师入口"], ["深圳市华侨（康桥）书院", "本轮未发现相关岗位"],
    ["深圳市明德外语实验学校", "本轮未发现相关岗位"], ["深圳市宝安区中英公学", "发现教师入口"], ["深圳市松岗中英文实验学校", "发现相关岗位"],
    ["深圳市宝安区翻身实验学校（西校区）", "本轮未发现相关岗位"], ["深圳市华一实验学校", "本轮未发现相关岗位"], ["深圳市福桥高级中学", "发现相关岗位"],
    ["深圳市滨海高级中学", "本轮未发现相关岗位"], ["深圳市弘毅高级中学", "本轮未发现相关岗位"],
  ]),
  ...coverage("龙岗", "全住宿", [
    ["深圳市龙岗区东升学校", "发现教师入口"], ["深圳市建文外国语学校", "发现相关岗位"], ["深圳市承翰学校", "发现教师入口"],
    ["深圳市坤翔高级中学", "本轮未发现相关岗位"], ["深圳市龙岗区珊蒂泉外国语学校", "本轮未发现相关岗位"], ["深圳市枫叶学校", "发现教师入口"],
    ["深圳市龙岗区德琳学校", "本轮未发现相关岗位"], ["深圳市鹏达高级中学", "本轮未发现相关岗位"], ["深圳菁华中英文实验中学", "本轮未发现相关岗位"],
    ["深圳市晟才高级中学", "本轮未发现相关岗位"], ["深圳市中荟高级中学", "发现相关岗位"],
  ]),
  { name: "深圳市龙岗区科城实验学校", district: "龙岗", boarding: "走读", outcome: "本轮未发现相关岗位" },
  ...coverage("龙华", "全住宿", [
    ["深圳市龙华中英文实验学校", "发现相关岗位"], ["深圳市美中学校", "发现教师入口"], ["深圳市展华实验学校", "本轮未发现相关岗位"],
    ["深圳市格睿特高级中学", "发现相关岗位"], ["深圳市龙华区博恒实验学校", "本轮未发现相关岗位"], ["深圳市汉开数理高中", "本轮未发现相关岗位"],
    ["深圳市育华高级中学", "发现教师入口"],
  ]),
  ...coverage("坪山", "全住宿", [
    ["深圳市龙翔学校", "本轮未发现相关岗位"], ["深圳市中新中学", "本轮未发现相关岗位"], ["深圳市立人高级中学", "发现相关岗位"],
    ["深圳市华朗学校", "发现相关岗位"], ["深圳市知源高级中学", "本轮未发现相关岗位"], ["深圳市华文高级中学", "发现教师入口"],
  ]),
  ...coverage("光明", "全住宿", [
    ["深圳市光明书院", "发现教师入口"], ["深圳杰仁高级中学", "本轮未发现相关岗位"], ["深圳市耀华外国语学校", "本轮未发现相关岗位"],
    ["深圳市光明区贝赛思外国语学校", "发现教师入口"],
  ]),
  ...coverage("大鹏", "全住宿", [["深圳市正德高级中学", "发现教师入口"]]),
];

export const officialShenzhenPoolSource = "https://szeb.sz.gov.cn/attachment/1/1714/1714584/12794780.pdf";

export const sourceLegend = {
  A: "学校或集团官网、官方招聘系统",
  B: "政府部门、公共招聘平台、高校就业网",
  C: "教师或综合招聘平台，需校方确认",
  D: "聚合或转载，只作线索",
} as const;
