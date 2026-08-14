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
    application: "https://jy.gzhu.edu.cn/index.php/web/Index/jobs-brief-detail?id=SVUXSTN", email: "gzlgsyhr@126.com",
    applicationNote: "旧公告不可直接当作27届入口；建议在2026年11月下旬复查。",
    summary: "上一届明确招政治并接受应届生，薪资达到默认门槛，是广州秋季重点观察对象。",
    sources: [
      { label: "26届高校就业网公告", url: "https://jy.gzhu.edu.cn/index.php/web/Index/jobs-brief-detail?id=SVUXSTN", level: "B" },
      { label: "学校官网", url: "https://www.gzlgsyxx.com/", level: "A" },
    ], lastVerified: "2026-08-14",
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
    applicationNote: "27届公告尚未发布；官方人才页停留在2024版本，2026年12月重点复查。",
    summary: "上一轮全科招聘含初高中政治，长期页接受应届生。",
    sources: [
      { label: "官方人才页", url: "https://www.gdems.cn/list/16.html", level: "A" },
      { label: "26届参考", url: "https://www.gaoxiaojob.com/company/detail/7173.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "gz-yuanya-politics", city: "广州", district: "白云", school: "广州市源雅学校",
    schoolType: "民办非营利十二年一贯制学校", roles: ["初中道法"], status: "等待27届",
    freshGraduate: "未公开", degree: "本科及以上", major: "相关专业", certificate: "相应教师资格证",
    languageMode: "中文", language: "未公开普通话等级", experienceYears: 3, experience: "当前道法岗要求3年以上经验",
    salaryMin: 20, salaryMax: 40, salaryNote: "第三方道法岗区间（3年经验岗），需校方确认",
    certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "高", fitScore: 55,
    application: "https://www.yuanyaedu.com/", email: "gzyyxx2021@163.com",
    applicationNote: "未发现27届公告；当前在招道法岗为经验岗。",
    summary: "道法岗当前为3年经验岗（20—40万），应届生口径需校方确认。",
    sources: [
      { label: "学校官网", url: "https://www.yuanyaedu.com/", level: "A" },
      { label: "初中道法教师岗位页", url: "https://m.job910.com/jobs_view_755963.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "gz-experimental-fl-politics", city: "广州", district: "白云", school: "广州市实验外语学校",
    schoolType: "民办十二年一贯制学校", curricula: ["国家课程", "国际课程"], roles: ["初中政治", "高中政治"], status: "常年储备",
    freshGraduate: "可能接受", degree: "高中岗位旧要求偏硕士", major: "哲学、政治学、马克思主义理论、学科教育等方向",
    certificate: "相关学科教师资格", languageMode: "中文", language: "国际课程另行确认", experience: "旧公告曾接受毕业一年内应届生",
    salaryMin: 19, salaryMax: 40, salaryNote: "第三方初中政治岗区间，不是校方应届生承诺",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 55,
    application: "https://eg.gdufs.edu.cn/index/rczp.htm",
    applicationNote: "最新官方公告（2026-04-28）已不含政治岗，当前证据均为历史线索。",
    summary: "历史政治岗薪资较高，但最新公告已无政治岗，只作观察。",
    sources: [
      { label: "集团官方人才页", url: "https://eg.gdufs.edu.cn/index/rczp.htm", level: "A" },
      { label: "最新官方公告（2026-04-28）", url: "https://www.gwdwx.com:9999/job/Headlineshow.aspx?m=137003&i=100005364731156", level: "A" },
      { label: "旧官方政治要求", url: "https://www.gwdwx.com/job/Headlineshow.aspx?i=100004395985283&m=137003", level: "A" },
      { label: "第三方岗位", url: "https://www.lipind.com/position/detail/1014269.html", level: "C" },
    ], lastVerified: "2026-08-14",
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
    sources: [{ label: "当前高中政治岗", url: "https://www.job910.com/jobs_view_912794.html", level: "C" }], lastVerified: "2026-08-14",
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
    sources: [{ label: "官方招聘页", url: "https://www.hm163.com/col134/index", level: "A" }], lastVerified: "2026-08-14",
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
    applicationNote: "先邮件确认能否接受2027年秋季到岗的应届生（邮件主题需标注Fresh/Previous graduate）。",
    summary: "专业方向匹配度高，但英语授课和经验要求是主要门槛。",
    sources: [{ label: "官方招聘页", url: "https://gisen.gdufs.edu.cn/Recruitment.htm", level: "A" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "gz-hfi-business", city: "广州", district: "天河", school: "华附国际部 HFI",
    schoolType: "国际高中", curricula: ["AP", "国际课程"], roles: ["AP商科", "历史"], roleTags: ["经济/商科", "历史/人文"], status: "26届参考",
    published: "2025-11-12", start: "2026-08", freshGraduate: "不接受/经验岗", degree: "相关专业硕士",
    major: "经济、商科、历史等相关专业", certificate: "教师资格", languageMode: "全英文", language: "全英文授课能力",
    experienceYears: 2, experience: "约2年相关经验", salaryNote: "未公开", certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "高",
    preparationCost: "高", fitScore: 58, application: "https://www.gdhfi.com/jobs/index.html", email: "gzhr@gdhfi.com",
    stages: [
      { name: "简历筛选", detail: "提交简历、求职信与工作申请表", certainty: "已明确", cycle: "2026—2027学年" },
      { name: "录制试讲", detail: "按通知提交录制试讲", certainty: "已明确", cycle: "2026—2027学年" },
      { name: "笔试面试", detail: "线下或线上面试", certainty: "已明确", cycle: "2026—2027学年" },
      { name: "背景调查", detail: "通过后进行背景调查", certainty: "已明确", cycle: "2026—2027学年" },
      { name: "录用", detail: "发放录用通知", certainty: "已明确", cycle: "2026—2027学年" },
    ],
    applicationNote: "页面对应2026—2027学年，不是27届入口。",
    summary: "商科方向匹配，但全英文授课与国际课程经验要求较高。",
    sources: [
      { label: "官方公告", url: "https://www.gdhfi.com/news/1455.html", level: "A" },
      { label: "官方职位页", url: "https://www.gdhfi.com/jobs/index.html", level: "A" },
    ], lastVerified: "2026-08-14",
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
    ], lastVerified: "2026-08-14",
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
    sources: [{ label: "南沙人才招聘公告", url: "https://www.nsrcup.com/notice/596", level: "B" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-bgy-economics", city: "顺德", district: "北滘", school: "广东碧桂园学校",
    schoolType: "民办寄宿K12", curricula: ["国家课程", "MYP/DP", "IGCSE/A-Level", "AP"],
    roles: ["Economics", "Global Perspectives", "Critical Thinking"], roleTags: ["经济/商科", "全球视野/社科"], status: "常年储备",
    freshGraduate: "明确接受", degree: "本科或硕士", major: "经济、贸易、社科等相关背景", certificate: "相应教师资格或课程资质",
    languageMode: "双语", language: "CET-6及英语表达能力，具体分数按岗位", experience: "官方人才库接受优秀应届生", salaryNote: "27届未公开；第三方青年教师岗线索约18万—26.4万/年",
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
      { label: "双语经济教师岗（第三方）", url: "http://hz.jrzp.com/main/job/jobDetails.aspx?pid=2255829", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-desheng-politics-econ", city: "顺德", district: "大良", school: "广东顺德德胜学校",
    schoolType: "民办十二年一贯制学校", curricula: ["国家课程", "IGCSE/IBDP"], roles: ["高中政治", "IGCSE/IBDP Economics"], roleTags: ["政治/道法", "经济/商科"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "专业匹配", certificate: "对应学科教师资格",
    languageMode: "双语", language: "经济岗需确认双语/英语要求", experienceYears: 3, experience: "公开岗位约3年经验",
    salaryMin: 23, salaryMax: 46, salaryNote: "政治储备岗总区间；经济岗无活跃来源",
    certificateRisk: "中", majorRisk: "中", languageRisk: "中", experienceRisk: "高", fitScore: 60,
    application: "https://www.job910.com/jobs_view_841585.html", email: "deshengschool@desheng-school.com",
    applicationNote: "政治岗仅存储备岗；官方2026公告高中岗不含政治/经济。",
    summary: "政治储备岗薪资有吸引力，但官方公告暂无政治/经济岗，三年经验是明确障碍。",
    sources: [
      { label: "高中政治储备岗", url: "https://www.job910.com/jobs_view_841585.html", level: "C" },
      { label: "顺德教育信息网官方公告", url: "http://news.sdedu.net/newsFile/newsPage/431778204509140.html", level: "B" },
      { label: "高校人才网转载", url: "https://www.gaoxiaojob.com/announcement/detail/400602.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-meichen-politics", city: "顺德", district: "大良", school: "顺德区美辰学校",
    schoolType: "民办九年一贯制学校", roles: ["初中政治"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上，硕士优先", major: "偏好重点师范院校相关专业", certificate: "初中政治教师资格",
    languageMode: "中文", language: "未公开普通话等级", experience: "优秀应届生可报", salaryNote: "未公开",
    benefits: ["五险一金"], workload: ["明确希望承担班主任"], certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 72,
    application: "https://www.job910.com/school_view_31817.html", email: "sdmcschool@163.com",
    applicationNote: "页面未写27届和截止时间，先邮件询问；电话0757-22367193（陆老师·初中）。",
    summary: "初中政治证书匹配较好，但非师范或非思政专业存在风险。",
    sources: [
      { label: "学校岗位页", url: "https://www.job910.com/school_view_31817.html", level: "C" },
      { label: "2026初中部招聘公告转载", url: "http://foshan.offcn.com/html/2026/06/70706.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-dongyiwan-politics", city: "顺德", district: "容桂", school: "广东实验中学顺德学校（东逸湾实验学校）",
    schoolType: "民办K12", roles: ["初中政治", "高中政治"], status: "等待27届", published: "2026-08-13",
    freshGraduate: "明确接受", degree: "未公开", major: "未公开", certificate: "按学段核验", languageMode: "中文", language: "未公开",
    experience: "2025/2026届应届毕业生及社会人员", salaryMin: 20, salaryMax: 35, salaryNote: "教师综合年薪区间（2026-08-13公告）",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 75,
    application: "https://www.gaoxiaojob.com/announcement/detail/422920.html", email: "gdsysd@126.com",
    applicationNote: "新公告2026-08-13发布但转载页已标下线，投递前先邮件确认是否仍接收。",
    summary: "政治岗2026-08-13重新出现，综合年薪20—35万，27届尚未开放。",
    sources: [
      { label: "学校官方公众号公告", url: "https://mp.weixin.qq.com/s/I3p5GSaKQUhfj5dpxTPB_w", level: "A" },
      { label: "高校人才网新公告", url: "https://www.gaoxiaojob.com/announcement/detail/422920.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-yangzheng-civics", city: "顺德", district: "北滘", school: "顺德养正学校",
    schoolType: "民办九年一贯制寄宿学校", roles: ["初中道法"], status: "26届参考", published: "2026-07-14",
    freshGraduate: "可能接受", degree: "本科及以上", major: "偏好对口及重点师范院校", certificate: "初中政治/道法教师资格",
    languageMode: "中文", language: "未公开普通话等级", experience: "整体偏成熟教师，特别优秀应届生可能放宽",
    salaryMin: 25, salaryMax: 40, salaryNote: "第三方岗位总区间，不代表应届生待遇", boarding: true,
    certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 61,
    application: "https://www.gaoxiaojob.com/announcement/detail/25007.html", email: "gdsdyzxx@163.com",
    applicationNote: "投递前核实页面是否仍收简历及应届生标准；电话0757-22683281（廖老师）。",
    summary: "证书方向较匹配，但专业与师范背景要求偏严。",
    sources: [{ label: "招聘参考公告", url: "https://www.gaoxiaojob.com/announcement/detail/25007.html", level: "C" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-asj-economics", city: "佛山", district: "南海", school: "佛山暨大港澳子弟学校 ASJ",
    schoolType: "民办港澳子弟学校", curricula: ["DSE", "国际课程"], roles: ["国际经济", "DSE经济"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "不接受/经验岗", degree: "本科及以上", major: "经济相关专业", certificate: "教师资格或岗位认可资质",
    languageMode: "双语", language: "双语或全英文授课", experienceYears: 2, experience: "第三方经济岗约2年；官方师资招募口径3年及以上",
    salaryMin: 15.6, salaryMax: 30, salaryNote: "平台月薪1.3万—2.5万元折算", certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "高", fitScore: 58,
    application: "https://asjfoshan.org.cn/sys-index/", email: "hr@asjfoshan.org.cn",
    applicationNote: "经济岗当前仅第三方平台在招，官方2026招募未列经济岗；先邮件确认。",
    summary: "经济岗当前仅第三方在招（约2年经验），官方招募口径3年以上且未列经济岗。",
    sources: [
      { label: "学校官网", url: "https://asjfoshan.org.cn/sys-index/", level: "A" },
      { label: "官方公众号师资招募", url: "https://mp.weixin.qq.com/s/QfIAtTcMxNQc9nuZtfeosA", level: "A" },
      { label: "第三方岗位页", url: "https://www.job910.com/school_view_131444.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "fs-zhonghuang-econ", city: "顺德", district: "乐从", school: "中黄星瑜港澳子弟学校",
    schoolType: "民办港澳子弟学校", curricula: ["DSE"], roles: ["DSE经济"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "未公开", degree: "本科及以上", major: "经济相关专业", certificate: "教师资格或岗位认可资质",
    languageMode: "双语", language: "双语要求需确认", experience: "应届生能否放宽需确认", salaryNote: "未公开",
    certificateRisk: "中", majorRisk: "低", languageRisk: "中", experienceRisk: "待确认", fitScore: 60,
    application: "https://www.fszwss.com/zwss/contact", applicationNote: "官方页仅泛化DSE课程老师，无DSE经济专岗；邮件确认2027到岗计划。",
    summary: "经济专业方向较匹配，但当前两处官方入口均无DSE经济专岗。",
    sources: [
      { label: "学校官方联系页", url: "https://www.fszwss.com/zwss/contact", level: "A" },
      { label: "集团招聘门户", url: "http://job.czwie.com/", level: "A" },
    ], lastVerified: "2026-08-14",
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
    applicationNote: "26届已截止，可按流程提前准备27届材料；校方另有官方网申系统。",
    summary: "应届生友好且流程公开完整，是春招准备样本。",
    sources: [
      { label: "高校就业网公告", url: "https://comm.ecnu.edu.cn/87/fc/c51755a755708/page.htm", level: "B" },
      { label: "学校官方网申系统", url: "https://hl.dgjy.net/", level: "A" },
    ], lastVerified: "2026-08-14",
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
    sources: [{ label: "高校就业网招聘页", url: "https://job.gzus.edu.cn/detail/jobfair_apply?apply_id=1676523&company_id=682517", level: "B" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "hz-honghua-politics", city: "惠州", district: "仲恺", school: "惠州宏华中学",
    schoolType: "民办寄宿高中", roles: ["高中政治"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上，偏好重点师范或双一流", major: "学科相关要求需确认", certificate: "未公开期限",
    languageMode: "中文", language: "未公开", experience: "优秀应届生可报", salaryMin: 13, salaryMax: 20, salaryNote: "当前简章应届/青年教师区间（旧简章16—25万，骨干另档）",
    benefits: ["教师公寓", "用餐补贴", "五险一金"], workload: ["班主任经验优先"], boarding: true,
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", fitScore: 70,
    application: "https://career.smbu.edu.cn/detail/jobfair_apply?apply_id=1123680&company_id=528310", email: "zhaopin@hzhonyijy.com",
    applicationNote: "表单是否仍接收需先确认；联系人19820020183（李老师，微信同号）。",
    summary: "明确考虑优秀应届生，当前简章应届薪资带13—20万，低于旧口径。",
    sources: [
      { label: "高校就业网更新版简章", url: "https://career.smbu.edu.cn/detail/jobfair_apply?apply_id=1123680&company_id=528310", level: "B" },
      { label: "旧版简章", url: "https://www.hip.edu.cn/jyzx/info/1018/2363.htm", level: "B" },
      { label: "青年教师岗位页", url: "https://m.job910.com/jobs_view_867781.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "hz-guangzheng-politics", city: "惠州", district: "惠城", school: "惠州市光正实验学校",
    schoolType: "民办寄宿K12", roles: ["初中政治"], status: "常年储备",
    freshGraduate: "可能接受", degree: "本科及以上", major: "偏好优秀师范院校", certificate: "初中政治教师资格",
    languageMode: "中文", language: "未公开", experience: "优秀应届生可能接受", salaryMin: 12, salaryMax: 25, salaryNote: "平台初中教师总区间",
    boarding: true, certificateRisk: "低", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 58,
    application: "https://77260.zp.job910.com/", applicationNote: "通过微信hzgzhr向校方确认职位。",
    summary: "证书方向较匹配，但薪资下限和专业要求需确认。",
    sources: [
      { label: "学校官网", url: "https://www.hzgzps.com/", level: "A" },
      { label: "教师招聘平台学校页", url: "https://77260.zp.job910.com/", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "zh-yifu-politics", city: "珠海", district: "香洲", school: "珠海一附实验中学",
    schoolType: "民办全寄宿中学", roles: ["高中政治"], status: "26届参考",
    freshGraduate: "未公开", degree: "全日制本科及以上", major: "待校方确认", certificate: "相应教师资格证", languageMode: "中文", language: "未公开",
    experience: "毕业班、班主任经验优先", salaryMin: 15, salaryMax: 40, salaryNote: "高中部教师年度总收入区间（2026年夏季公告；国际部25万—45万）", boarding: true, fitScore: 64,
    application: "https://job.x3cn.com/notice/2848", email: "zhyzfssy@163.com",
    applicationNote: "2026年夏季公告，常年接收各科简历；高中部邮箱zhyzfssy@163.com。",
    summary: "政治岗与薪资、官方邮箱均可核验，来源为高校就业网与地方招聘平台。",
    sources: [
      { label: "高校就业网公告", url: "https://www.hljbys.org.cn/campus/view/id/59498/mark/jmsu", level: "B" },
      { label: "香山直聘2026夏季公告", url: "https://job.x3cn.com/notice/2848", level: "C" },
    ], lastVerified: "2026-08-14",
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
      { name: "面试", detail: "2轮：系主任/学科组长 → 校长团队；试讲形式未公开", certainty: "部分公开", cycle: "2026—2027学年" },
      { name: "推荐人核查", detail: "联系现任或最近雇主，进行儿童保护推荐核查并确认合同状态", certainty: "已明确", cycle: "2026—2027学年" },
    ],
    materials: ["英文求职信", "英文CV", "推荐人信息", "国际课程教学证明"],
    application: "https://www.scie.com.cn/vacancies/", email: "jobs@scie.com.cn",
    applicationNote: "职位为2026年8月到岗，保留作27届国际课程门槛参考；暂无2027—2028学年新一轮招聘。",
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
    sources: [
      { label: "官方加入我们", url: "https://www.vma.edu.cn/job/", level: "A" },
      { label: "前程无忧AP Economics岗", url: "https://msearch.51job.com/jobs/shenzhen-ytq/170187607.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-sendelta-econ", city: "深圳", district: "宝安", school: "深圳新哲文院",
    schoolType: "民办国际课程学校", curricula: ["AP", "A-Level", "IGCSE"], roles: ["历史", "经济商务"], roleTags: ["经济/商科", "历史/人文"], status: "常年储备",
    freshGraduate: "可能接受", degree: "本科及以上", major: "相关专业背景", certificate: "未公开教师资格硬性要求",
    languageMode: "双语", language: "可双语教学；海外留学优先", experience: "熟悉AP/A-Level，经验年限未写死", salaryMin: 13, salaryMax: 19.5, salaryNote: "第三方岗位线索约13万—19.5万/年，需校方确认",
    certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "中", preparationCost: "中", fitScore: 79,
    application: "https://www.siasz.cn/zhaopin", email: "hrjobs@sendelta.com",
    applicationNote: "邮件主题为姓名+岗位+区域（深圳或广州）。",
    summary: "专业方向匹配，经验表述比深国交、万科梅沙更宽，但官方薪资未公开。",
    sources: [
      { label: "官方全球招聘", url: "https://www.siasz.cn/zhaopin", level: "A" },
      { label: "应届生求职网经济学老师岗", url: "https://m.yingjiesheng.com/jobdetail/156869774", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-taoyuan-politics", city: "深圳", district: "宝安", school: "桃源居中澳实验学校",
    schoolType: "民办十二年一贯制寄宿学校", curricula: ["国家课程", "国际方向"], roles: ["高中政治"], status: "26届参考", published: "2026-02-06",
    freshGraduate: "不接受/经验岗", degree: "本科及以上（第一学历）", major: "政治学专业毕业", certificate: "对应学科教师资格证",
    languageMode: "中文", language: "未公开", experienceYears: 3, experience: "同岗位工作经验三年以上", salaryNote: "高薪面议，无公开数值", boarding: true,
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "高", fitScore: 55,
    application: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_12635476.html",
    applicationNote: "政府页2026年2月招高中政治，为3年经验岗；27届尚未开放。",
    summary: "深圳官方渠道可验证的高中政治样本，但同岗位3年以上经验是硬门槛。",
    sources: [{ label: "宝安区教育局招聘页", url: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_12635476.html", level: "B" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-songgang-politics", city: "深圳", district: "宝安", school: "松岗中英文实验学校",
    schoolType: "民办十二年一贯制寄宿学校", roles: ["初中道法"], status: "26届参考",
    freshGraduate: "明确接受", degree: "师范类本科及以上", major: "专业对口", certificate: "对应教师资格；面试携带原件",
    languageMode: "中文", language: "需普通话证，等级未写", experience: "欢迎优秀应届生", salaryMin: 15.6, salaryMax: 21.6, salaryNote: "2026-07-30公告高中教师月薪1.3万—1.8万元折算，道法岗未单列",
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
    application: "https://www.shenzhenjiaoshi.com/zhaopin/175446.html", email: "sgzywsyxx_gzb@baoan.gov.cn",
    applicationNote: "最新公告（2026-07-30）高中已无政治岗，初中招道法；旧公告流程仍可作参考。",
    summary: "流程信息最完整；当前政治方向岗位为初中道法，高中岗已不招政治。",
    sources: [
      { label: "最新招聘公告（2026-07-30）", url: "https://www.shenzhenjiaoshi.com/zhaopin/175446.html", level: "C" },
      { label: "宝安区教育局旧公告", url: "https://www.baoan.gov.cn/jyj/zwgk/rsxx/ryzp/content/post_11931122.html", level: "B" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-jianwen-politics", city: "深圳", district: "龙岗", school: "深圳市建文外国语学校",
    schoolType: "民办十二年一贯制寄宿学校", roles: ["高中政治", "历史"], roleTags: ["政治/道法", "历史/人文"], status: "26届参考", published: "2026-06-29",
    freshGraduate: "未公开", degree: "本科及以上", major: "专业对口", certificate: "相应教师资格证", languageMode: "中文", language: "未公开", experience: "到岗2026年春季；年龄不超45岁",
    salaryMin: 28, salaryMax: 35, salaryNote: "高中28万—35万元/年；初中小学18万—25万元/年",
    boarding: true, writtenTest: null, demoLesson: null, certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", fitScore: 66,
    stages: [
      { name: "邮件投递", detail: "简历以应聘岗位+毕业院校命名并附全身照片", certainty: "已明确", cycle: "26届参考" },
      { name: "简历初审", detail: "通过后电话或短信通知", certainty: "已明确", cycle: "26届参考" },
      { name: "面试", detail: "具体是否笔试或试讲未公开", certainty: "部分公开", cycle: "26届参考" },
    ],
    materials: ["个人简历", "全身照片"], application: "https://www.fenbi.com/page/fenxiaozhaokaodetail/2/0/463792638281728", email: "szsjwwgyxx@163.com",
    applicationNote: "第三方转载显示2026年春季高中政治招聘；需向学校确认27届。",
    summary: "高中政治薪资28—35万/年，但要求专业对口，应届生政策未披露。",
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
    applicationNote: "2026届春招参考（公告已于2026-06过期），27届尚未发现；zhaopin链接反爬无法机核。",
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
    schoolType: "民办寄宿高中", curricula: ["国家课程", "国际融合课程"], roles: ["高中政治", "高中历史"], roleTags: ["政治/道法", "历史/人文"], status: "常年储备",
    freshGraduate: "可能接受", degree: "本科及以上，研究生优先", major: "政治/历史相关专业", certificate: "对应教师资格",
    languageMode: "中文", language: "国际方向另行确认", experience: "高中政治岗经验不限（招4人，2026-08-13更新）；历史岗3年以上",
    salaryMin: 15, salaryMax: 30, salaryNote: "应届生15万—20万元，其他教师按层级",
    benefits: ["五险一金", "提供住宿", "带薪休假"], boarding: true,
    certificateRisk: "高", majorRisk: "高", languageRisk: "低", experienceRisk: "中", fitScore: 62,
    application: "https://www.job910.com/jobs_view_334620.html", email: "gritgrit2021@163.com",
    applicationNote: "学校官网证书异常且不稳定，以招聘平台岗位页为准；政治岗比历史岗更匹配。",
    summary: "新增高中政治岗（经验不限、15—30万/年），比历史岗更契合政治方向。",
    sources: [
      { label: "高中政治岗位页", url: "https://www.job910.com/jobs_view_334620.html", level: "C" },
      { label: "高中历史岗位页", url: "https://www.job910.com/jobs_view_334621.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "edu-xdf-27", city: "多城市", district: "广州/佛山/东莞/珠海/深圳", school: "新东方",
    orgType: "教育集团/教培", schoolType: "教育培训机构", curricula: ["非义务教育培训"], roles: ["27届中学教师", "高中班课", "一对一"], roleTags: ["政治/道法", "经济/商科", "历史/人文"], status: "27届开放",
    freshGraduate: "明确接受", degree: "本科及以上", major: "目录含经济与贸易、经济学、政治学、社会学等", certificate: "教师资格可按岗位培训考取",
    languageMode: "中文", language: "具体学科另核", experience: "2026—2027届毕业生", salaryMin: 18, salaryMax: 28.8, salaryNote: "联合页各职位15000元/月及以上（≥18万/年）折算",
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
    applicationNote: "首轮已截止；聚合页显示窗口延续至9-19，关注公众号\"思考乐选聘\"。",
    summary: "流程公开但无相关学科，首轮也已截止。",
    sources: [
      { label: "27届秋招公告", url: "https://www.fenbi.com/page/exam-information-detail/467845654270977", level: "C" },
      { label: "27届秋招聚合页", url: "https://campus.niuqizp.com/schedule-7U8Y5M5CL.html", level: "D" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-sifc-social-business", city: "深圳", district: "宝安", school: "深圳国际预科书院（SIFC）",
    schoolType: "民办国际化高中", curricula: ["AP", "IGCSE/A-Level", "国际课程"], roles: ["双语社科/商科教师"], roleTags: ["经济/商科", "全球视野/社科", "历史/人文"], status: "常年储备",
    freshGraduate: "明确接受", degree: "未公开", major: "社科、商科等相关专业", certificate: "按岗位审核",
    languageMode: "双语", language: "双语（中英文），具体证书等级未公开", experience: "青苗人才计划面向优秀应届毕业生",
    salaryNote: "官方称薪酬体系有竞争力，未公开数值",
    benefits: ["五险一金", "意外/医疗保险", "年度体检", "子女入学优惠", "三餐补贴", "带薪寒暑假"], workload: [],
    certificateRisk: "待确认", majorRisk: "低", languageRisk: "中", experienceRisk: "低", preparationCost: "中", fitScore: 81,
    stages: [
      { name: "简历投递", detail: "HR邮箱投递或扫码在线登记", certainty: "已明确" },
      { name: "简历筛选", detail: "校方筛选", certainty: "已明确" },
      { name: "专业面试", detail: "专业面试", certainty: "已明确" },
      { name: "校长面试", detail: "校长面试", certainty: "已明确" },
      { name: "Offer录用", detail: "Offer录用", certainty: "已明确" },
    ],
    materials: ["个人简历"], application: "https://www.sifc.net.cn/page/740628/", email: "hr@sifc.net.cn",
    applicationNote: "邮件标题「深国预＋岗位/学科＋姓名」；建议邮件同时注明27届到岗意向。",
    summary: "官方单列双语社科/商科教师岗，青苗计划面向应届生，专业方向高度匹配；薪资未公开。",
    sources: [{ label: "官方人才招聘页", url: "https://www.sifc.net.cn/page/740628/", level: "A" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-hankai-econ", city: "深圳", district: "龙华", school: "深圳市汉开数理高中（国际部）",
    schoolType: "民办高中（含国际部）", curricula: ["A-Level", "DSE", "国际课程"], roles: ["国际部A-Level经济学教师", "国际部DSE经济学老师"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "明确接受", degree: "本科及以上（985/211或海外名校优先）", major: "经济、商科等相关专业", certificate: "相关教师资格证优先",
    languageMode: "双语", language: "浸润式英语环境，对英语有一定要求", experience: "经验不限，欢迎优秀应届生；3年以上国际课程经验优先",
    salaryMin: 22, salaryMax: 35, salaryNote: "教师岗位年收入22万—35万，卓越者另议",
    benefits: ["带薪寒暑假", "五险一金", "住房津贴", "餐补", "提供住宿", "职称评定"], workload: [], boarding: true,
    certificateRisk: "中", majorRisk: "低", languageRisk: "中", experienceRisk: "低", preparationCost: "中", fitScore: 83,
    application: "https://www.job910.com/jobs_view_625443.html",
    applicationNote: "A-Level与DSE经济两岗均为储备、经验不限并欢迎应届生；通过平台投递，需确认27届到岗时间。",
    summary: "A-Level/DSE经济双岗、欢迎优秀应届生且薪资22—35万，当前匹配度最高的储备岗之一。",
    sources: [
      { label: "国际部A-Level经济学教师", url: "https://www.job910.com/jobs_view_625443.html", level: "C" },
      { label: "国际部DSE经济学老师", url: "https://www.job910.com/jobs_view_830948.html", level: "C" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-weiming-baoan-econ", city: "深圳", district: "宝安", school: "深圳市宝安区为明双语实验学校",
    schoolType: "民办十二年制双语学校", curricula: ["AP", "国际课程"], roles: ["国际部双语经济/商科教师"], roleTags: ["经济/商科"], status: "常年储备",
    freshGraduate: "可能接受", degree: "硕士及以上", major: "经济、商科相关（专业对口）", certificate: "要求英语教学语言能力",
    languageMode: "双语", language: "有英语教学的语言能力", experienceYears: 3, experience: "国际学校相关学科3年以上，班主任经验优先；优秀应届生也可考虑",
    salaryMin: 21.6, salaryMax: 30, salaryNote: "月薪1.8万—2.5万元，储备岗",
    benefits: ["五险", "公积金"], workload: ["国际部10—12年级；可能承担班主任或学术协调职责"],
    certificateRisk: "待确认", majorRisk: "低", languageRisk: "中", experienceRisk: "中", preparationCost: "中", fitScore: 80,
    application: "https://www.job910.com/jobs_view_915315.html",
    applicationNote: "岗位为储备状态；通过平台投递，建议同时联系学校官网入口确认27届到岗。",
    summary: "国际部双语经济/商科岗，硕士且优秀应届生可考虑，薪资达标，专业高度匹配。",
    sources: [
      { label: "万行教师岗位页", url: "https://www.job910.com/jobs_view_915315.html", level: "C" },
      { label: "学校官网", url: "https://www.wmjyszba.com", level: "A" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "gz-basis-reserve", city: "广州", district: "黄埔", school: "广州贝赛思国际学校",
    schoolType: "外籍人员子女国际学校", curricula: ["AP", "国际课程"], roles: ["未来教学机会（人才库）"], roleTags: ["经济/商科", "全球视野/社科", "历史/人文"], status: "常年储备",
    freshGraduate: "可能接受", degree: "任教学科相关学位", major: "任教学科相关", certificate: "未公开",
    languageMode: "全英文", language: "全英文授课", experienceYears: 2, experience: "至少2年lead teacher经验（工作签证要求）；人才库面向2027年8月起岗位",
    salaryNote: "竞争性薪酬，按学历与经验定，未公开数值",
    benefits: ["住房补贴", "全球医疗保险", "退休金", "往返机票", "免费餐食", "子女学费减免"], workload: [], boarding: true,
    certificateRisk: "高", majorRisk: "低", languageRisk: "高", experienceRisk: "高", preparationCost: "高", fitScore: 58,
    stages: [
      { name: "人才库投递", detail: "2026年夏末秋初校方联系符合条件的候选人", certainty: "已明确" },
      { name: "正式面试", detail: "岗位确认后约在2026年秋初开始面试，2027年秋到岗", certainty: "已明确" },
    ],
    materials: ["英文简历", "求职信"],
    application: "https://jobs.basisinternationalschools.com/global/en/job/P-102071/Future-Teaching-Opportunities-with-BASIS-International-Bilingual-Schools-China",
    applicationNote: "外籍人员子女学校，英文授课且要求教学经验，中国籍应届生更现实入口是贝赛思双语/外国语学校。",
    summary: "官方人才库面向2027年8月起岗位，但经验与全英文门槛高，作高门槛参考。",
    sources: [
      { label: "官方人才库职位", url: "https://jobs.basisinternationalschools.com/global/en/job/P-102071/Future-Teaching-Opportunities-with-BASIS-International-Bilingual-Schools-China", level: "A" },
      { label: "官方招聘门户", url: "https://jobs.basisinternationalschools.com/global/en/search-results", level: "A" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "sz-basis-reserve", city: "深圳", district: "南山", school: "深圳贝赛思国际学校",
    schoolType: "外籍人员子女国际学校", curricula: ["AP", "国际课程"], roles: ["未来教学机会（人才库）"], roleTags: ["经济/商科", "全球视野/社科", "历史/人文"], status: "常年储备",
    freshGraduate: "可能接受", degree: "任教学科相关学位", major: "任教学科相关", certificate: "未公开",
    languageMode: "全英文", language: "全英文授课", experienceYears: 2, experience: "至少2年lead teacher经验（工作签证要求）；人才库面向2027年8月起岗位",
    salaryNote: "竞争性薪酬，按学历与经验定，未公开数值",
    benefits: ["住房补贴", "全球医疗保险", "退休金", "往返机票", "免费餐食", "子女学费减免"], workload: [], boarding: true,
    certificateRisk: "高", majorRisk: "低", languageRisk: "高", experienceRisk: "高", preparationCost: "高", fitScore: 58,
    stages: [
      { name: "人才库投递", detail: "2026年夏末秋初校方联系符合条件的候选人", certainty: "已明确" },
      { name: "正式面试", detail: "岗位确认后约在2026年秋初开始面试，2027年秋到岗", certainty: "已明确" },
    ],
    materials: ["英文简历", "求职信"],
    application: "https://jobs.basisinternationalschools.com/global/en/job/P-102071/Future-Teaching-Opportunities-with-BASIS-International-Bilingual-Schools-China",
    applicationNote: "南山校区为外籍人员子女学校，与光明区贝赛思外国语学校（双语）不同；27届入口统一走官方人才库。",
    summary: "官方人才库面向2027年8月起岗位，但经验与全英文门槛高，作高门槛参考。",
    sources: [
      { label: "官方人才库职位", url: "https://jobs.basisinternationalschools.com/global/en/job/P-102071/Future-Teaching-Opportunities-with-BASIS-International-Bilingual-Schools-China", level: "A" },
      { label: "官方招聘门户", url: "https://jobs.basisinternationalschools.com/global/en/search-results", level: "A" },
    ], lastVerified: "2026-08-14",
  }),
  school({
    id: "gz-yinghao-politics", city: "广州", district: "从化", school: "广州英豪学校",
    schoolType: "民办K12（广附集团托管）", curricula: ["国家课程"], roles: ["初中政治", "高中政治"], roleTags: ["政治/道法"], status: "26届参考",
    freshGraduate: "明确接受", degree: "本科及以上", major: "政治学、马克思主义理论等对口专业", certificate: "未公开",
    languageMode: "中文", language: "未公开", experience: "优秀毕业生可报",
    salaryNote: "公告称待遇优厚，未公开数值",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", preparationCost: "待确认", fitScore: 62,
    application: "https://m.gaoxiaojob.com/announcement/detail/283929.html",
    applicationNote: "2026届公告（2025-11发布），站内投递；27届需在2026年11月前后复查。",
    summary: "初高中政治岗并接受应届生，但专业要求政治学/马理论、薪资未公开，作26届参考。",
    sources: [{ label: "高才网2026招聘公告", url: "https://m.gaoxiaojob.com/announcement/detail/283929.html", level: "C" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "zh-xinhui-daofa", city: "珠海", district: "斗门", school: "珠海市斗门区井岸西埔新徽实验学校",
    schoolType: "民办完全中学（含高中部）", roles: ["高中道法"], roleTags: ["政治/道法"], status: "26届参考",
    freshGraduate: "可能接受", degree: "本科", major: "未公开（需高中道法教师资格证）", certificate: "高中道法教师资格证",
    languageMode: "中文", language: "未公开", experience: "平台标注应届毕业生；描述要求有一定高中教学经验",
    salaryMin: 9.6, salaryMax: 14.4, salaryNote: "月薪8000—12000元折算（2026-08-11发布）",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", preparationCost: "待确认", fitScore: 52,
    application: "http://www.cdqyrc.com/job28181745.shtml",
    applicationNote: "平台标注信息待核验；投递前确认是否仍接收简历及应届生口径。",
    summary: "珠海当前少数面向应届的道法/政治方向岗位，高中道法证书是硬门槛，薪资未达默认门槛。",
    sources: [{ label: "高中道法老师(青年教师)岗位页", url: "http://www.cdqyrc.com/job28181745.shtml", level: "C" }], lastVerified: "2026-08-14",
  }),

  school({
    id: "zh-bszf-zhengzhi", city: "珠海", district: "香洲", school: "北京师范大学珠海分校附属外国语学校",
    schoolType: "民办外国语学校（含高中部）", roles: ["初中政治"], roleTags: ["政治/道法"], status: "26届参考",
    freshGraduate: "未公开", degree: "本科及以上", major: "任教学科相关专业", certificate: "中学教师资格证",
    languageMode: "中文", language: "未公开", experience: "青年教师岗，未写明经验年限",
    salaryMin: 10.8, salaryMax: 13.2, salaryNote: "月薪9K—11K折算（2026-08-13更新）",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", preparationCost: "待确认", fitScore: 46,
    application: "https://www.job910.com/jobs_view_388324.html",
    applicationNote: "未写应届口径；任教学科相关专业对经济/社科背景需校方确认。",
    summary: "初中政治青年教师岗，无师范硬性要求，但专业对口与应届口径需确认，薪资未达默认门槛。",
    sources: [{ label: "初中政治老师(青年教师)岗位页", url: "https://www.job910.com/jobs_view_388324.html", level: "C" }], lastVerified: "2026-08-14",
  }),

  school({
    id: "hz-taiya-politics", city: "惠州", district: "惠阳", school: "惠州市惠阳区泰雅实验高中",
    schoolType: "民办高中", roles: ["高中政治"], roleTags: ["政治/道法"], status: "常年储备",
    freshGraduate: "明确接受", degree: "本科及以上", major: "符合高中教师资格条件（对应学科）", certificate: "符合高中教师资格条件",
    languageMode: "中文", language: "未公开", experience: "应届或往届均可，在职或退休教师均可",
    salaryNote: "该岗位页未公开薪资（同校另有骨干/实习生/应届生分级岗位）",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", preparationCost: "待确认", fitScore: 68,
    application: "https://www.job910.com/jobs_view_734912.html",
    applicationNote: "万行教师网投递，更新于2026-08-11，招聘2人；应届往届均可报。",
    summary: "当前在招且明确应届可报，本科及以上、符合高中教师资格即可，是惠州高中政治方向最值得跟进的公开岗位。",
    sources: [{ label: "万行教师网高中政治岗位", url: "https://www.job910.com/jobs_view_734912.html", level: "C" }], lastVerified: "2026-08-14",
  }),

  school({
    id: "hz-zhixing-politics", city: "惠州", district: "惠城", school: "惠州市知行学校",
    schoolType: "民办完全中学（K12）", roles: ["初中政治"], roleTags: ["政治/道法"], status: "26届参考",
    freshGraduate: "明确接受", degree: "全日制普通本科及以上", major: "具备所应聘岗位相应专业知识", certificate: "教师资格证书",
    languageMode: "中文", language: "未公开", experience: "优秀应届本科、硕士、博士",
    salaryMin: 7, salaryMax: 15, salaryNote: "初级教师年薪7万-15万；中级（研究生学历）8万-20万；高级10万-30万",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", preparationCost: "待确认", fitScore: 62,
    application: "https://www.job910.com/jobs_view_346948.html",
    applicationNote: "万行教师网，更新于2026-02-02，标签为应届生岗；27届需在2026年秋复查新批次。",
    summary: "明确的应届生政治岗，初中学段，初级教师年薪7-15万（研究生中级8-20万），专业与薪资下限需留意。",
    sources: [{ label: "万行教师网初中政治岗位", url: "https://www.job910.com/jobs_view_346948.html", level: "C" }], lastVerified: "2026-08-14",
  }),

  school({
    id: "fs-guohua-politics", city: "佛山", district: "顺德", school: "佛山市顺德区国华纪念中学",
    schoolType: "民办寄宿高中（碧桂园集团创办）", roles: ["高中政治", "高中历史"], roleTags: ["政治/道法", "历史/人文"], status: "26届参考",
    freshGraduate: "明确接受（硕士/博士应届；本科需教学经验）", degree: "硕士及以上", major: "政治学、中国史等对口专业", certificate: "相应教师资格证（入职一年内取得）",
    languageMode: "中文", language: "未公开", experience: "全日制优秀硕士/博士应届可报；本科需教学经验",
    salaryMin: 30, salaryMax: 65, salaryNote: "正式聘用教师年收入30万—65万元（含浮动激励），博士另享津贴",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", preparationCost: "待确认", fitScore: 68,
    application: "https://m.gaoxiaojob.com/announcement/detail/389161.html",
    applicationNote: "高校人才网站内投递；2026-05-25发布，政治招2人、历史招2人",
    summary: "政治岗年薪30—65万、硕士应届可报，学校高考特控率近100%；但需求专业为政治学/中国史等，社科硕士需校方确认专业对口",
    sources: [{ label: "2026诚聘优秀教师公告（高校人才网）", url: "https://m.gaoxiaojob.com/announcement/detail/389161.html", level: "C" }, { label: "历史教师职位详情（高校人才网）", url: "https://m.gaoxiaojob.com/job/detail/2094973.html", level: "C" }], lastVerified: "2026-08-14",
  }),

  school({
    id: "fs-jingui-politics", city: "佛山", district: "南海", school: "佛山市金桂实验高级中学",
    schoolType: "民办高中", roles: ["高中政治"], roleTags: ["政治/道法"], status: "常年储备",
    freshGraduate: "明确接受（经验不限，师范/非师范优秀毕业生）", degree: "本科及以上", major: "师范类或相关专业", certificate: "相应教师资格证",
    languageMode: "中文", language: "未公开", experience: "经验不限；市级教坛新秀/骨干/学科带头人优先",
    salaryMin: 19.2, salaryMax: 48, salaryNote: "月薪1.6万—4万元折算（约19.2万—48万/年）",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "待确认", preparationCost: "待确认", fitScore: 64,
    application: "https://www.szdt821.com/wap/index.php?c=job&a=comapply&id=62735",
    applicationNote: "师途平台投递；招2人，2026-05-27更新，招聘负责人邱老师17302658610",
    summary: "高中政治经验不限、应届可报，薪资上限高；但专业是否限政治学需向校方确认，且为26届储备岗、未标27届",
    sources: [{ label: "高中政治教师（师途-教师人才服务网）", url: "https://www.szdt821.com/wap/index.php?c=job&a=comapply&id=62735", level: "C" }], lastVerified: "2026-08-14",
  }),
  school({
    id: "dg-qinglanshan-humanities-econ", city: "东莞", district: "松山湖", school: "东莞市松山湖清澜山学校",
    schoolType: "民办十五年制国际化学校", roles: ["高中人文教师（历史/经济方向）"], roleTags: ["经济/商科", "历史/人文", "全球视野/社科"], status: "26届参考",
    freshGraduate: "明确接受（应届毕业生，本科）", degree: "本科及以上", major: "经济、历史、社科等相关专业（人文课程，职位描述全英文）", certificate: "学科相关教师资格证（国际课程可协商）",
    languageMode: "全英文", language: "英文授课 9-12 年级人文课程", experience: "青年教师岗，经验不限",
    salaryMin: 18, salaryMax: 30, salaryNote: "月薪15000-25000元（约18-30万/年），另有住房补贴、三餐、子女学费减免等",
    certificateRisk: "中", majorRisk: "低", languageRisk: "高", experienceRisk: "低", preparationCost: "待确认", fitScore: 88,
    application: "http://jxnyjob.jdzj.com/job3684983.shtml",
    applicationNote: "招聘平台投递（职位2026-08-06发布）；清澜山官网 tsinglan.cn 招聘页08-12仅列3个非教学岗，本岗以平台为准，投递前建议向校方确认27届到岗时间。",
    summary: "经济/社科方向与国贸+港科大社科背景高度匹配，应届本科可报，是东莞少有的『人文（经济方向）』青年教师岗。",
    sources: [{ label: "高中人文教师（历史/经济方向）青年教师", url: "http://jxnyjob.jdzj.com/job3684983.shtml", level: "D" }, { label: "清澜山官方招聘页", url: "https://www.tsinglan.cn/contact/list/8", level: "A" }], lastVerified: "2026-08-14",
  }),

  school({
    id: "dg-humen-daofa", city: "东莞", district: "虎门", school: "东莞市虎门外语学校",
    schoolType: "民办十二年制寄宿学校", roles: ["初中道德与法治教师"], roleTags: ["政治/道法"], status: "26届参考",
    freshGraduate: "明确接受（应届毕业生：学业优异、学生干部、一等奖学金、英语流利、海外留学经历者优先）", degree: "本科及以上", major: "文科相关（思想政治等优先）", certificate: "相应教师资格证（简历附教资证）",
    languageMode: "中文", language: "中文授课", experience: "经验不限（青年教师岗）",
    salaryMin: 18, salaryMax: 23, salaryNote: "18-23万/年；同校另有高中政治（硕士23-28万/年）、初中历史（18-23万/年）",
    certificateRisk: "中", majorRisk: "高", languageRisk: "低", experienceRisk: "低", preparationCost: "待确认", fitScore: 85,
    application: "https://m.job910.com/jobs_view_748310.html",
    applicationNote: "到岗2026-08-20；万行在线投递或联系张老师；投递前确认27届到岗与教资取得期限。",
    summary: "初中道法岗明确欢迎应届毕业生，海外留学经历者优先（契合港科大社科背景），18-23万/年。",
    sources: [{ label: "万行教师人才网·初中道德与法治教师（青年教师）", url: "https://m.job910.com/jobs_view_748310.html", level: "C" }], lastVerified: "2026-08-14",
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
export const officialGuangzhouPoolSource = "https://jyj.gz.gov.cn/gkmlpt/content/10/10818/mpost_10818250.html";

// 广州民办普通高中名单（市教育局《2026年高中阶段学校报考指南》招生计划篇，共43所）。
// 口径与深圳区块一致：outcome 基于 2026-08-14 公开网页检索；
// “发现相关岗位”部分为历史或平台线索，不代表 27 届当前开放。
export const guangzhouCoverage: CoverageRecord[] = [
  ...coverage("荔湾", "全住宿", [["广州市爱莎文华高中", "发现相关岗位"]]),
  ...coverage("海珠", "部分住宿", [["广州市为明学校", "发现相关岗位"], ["广州市海珠中学", "发现相关岗位"], ["广州市培才高级中学", "发现教师入口"], ["广州市海华高级中学", "本轮未发现相关岗位"]]),
  ...coverage("天河", "全住宿", [["广州思源学校", "本轮未发现相关岗位"], ["广州市天省实验学校", "发现相关岗位"], ["广州市华美英语实验学校", "发现教师入口"]]),
  ...coverage("白云", "全住宿", [["广州市亚加达外国语高级中学", "本轮未发现相关岗位"], ["广州市源雅学校", "发现相关岗位"], ["广州市珠江高级中学", "发现相关岗位"], ["广州市华文高级中学", "发现相关岗位"], ["广州市龙外实验学校", "发现相关岗位"], ["广州市庆丰实验学校", "发现相关岗位"], ["广州市实验外语学校", "发现相关岗位"]]),
  ...coverage("黄埔", "全住宿", [["广州市新侨学校", "发现相关岗位"], ["广州市明珠高级中学", "发现相关岗位"], ["广州市天健学校", "发现相关岗位"]]),
  ...coverage("番禺", "全住宿", [["广州市番禺区祈福英语实验学校", "发现相关岗位"], ["广州南方学院番禺附属中学", "发现相关岗位"], ["广州市衡美高级中学", "发现相关岗位"], ["广州市星执学校", "发现相关岗位"], ["广州市博萃德学校", "发现相关岗位"]]),
  ...coverage("花都", "全住宿", [["广州市华万高中", "发现相关岗位"], ["广州市黄广牛剑高级中学", "发现相关岗位"], ["广州市耀华学校", "发现相关岗位"], ["广州市华德高级中学", "发现相关岗位"], ["广州市黄广中学", "发现相关岗位"]]),
  ...coverage("南沙", "全住宿", [["广州市朝晖高级中学", "发现相关岗位"], ["广州市南外实验学校", "发现相关岗位"], ["广州市南郡高级中学", "发现相关岗位"], ["广州市新亚高级中学", "发现相关岗位"], ["广州市明贤实验高级中学", "发现相关岗位"], ["广州市维港青藤中学", "本轮未发现相关岗位"]]),
  ...coverage("增城", "全住宿", [["广州市香江中学", "本轮未发现相关岗位"], ["广州市黄广附属学校", "本轮未发现相关岗位"], ["广州理工实验学校", "发现相关岗位"], ["广州市华商外语实验高级中学", "发现相关岗位"], ["广州市华汇高级中学", "本轮未发现相关岗位"], ["广州市东江外语实验学校", "发现相关岗位"], ["广州市斐特思学校", "发现相关岗位"]]),
  ...coverage("从化", "全住宿", [["广州龙涛外国语学校", "发现相关岗位"], ["广州英豪学校", "发现相关岗位"]]),
];


export const officialZhuhaiPoolSource = "https://zhjy.zhuhai.gov.cn/gkmlpt/content/3/3896/post_3896701.html";

export const zhuhaiCoverage: CoverageRecord[] = [
  ...coverage("香洲", "全住宿", [["珠海一附实验中学", "发现相关岗位"], ["珠海市香樟中学", "发现相关岗位"], ["北京师范大学珠海分校附属外国语学校", "发现相关岗位"], ["珠海东方外语实验学校", "发现相关岗位"], ["珠海市希望之星实验学校", "发现相关岗位"]]),
  ...coverage("横琴", "未公开", [["广东横琴粤澳深度合作区华发容闳高级中学", "发现相关岗位"], ["珠海市横琴哈罗礼德高级中学", "发现相关岗位"]]),
  ...coverage("斗门", "未公开", [["珠海市斗门区井岸西埔新徽实验学校", "发现相关岗位"]]),
  ...coverage("高新区", "全住宿", [["珠海高新区青鸟北附实验学校", "发现相关岗位"]]),
];

export const officialHuizhouPoolSource = "http://jyj.huizhou.gov.cn/gkmlpt/content/5/5769/mpost_5769733.html";

export const huizhouCoverage: CoverageRecord[] = [
  ...coverage("惠城", "全住宿", [["惠州市知行学校", "发现相关岗位"], ["惠州市综合高级中学", "发现相关岗位"], ["惠州市光正实验学校", "发现相关岗位"], ["惠州市正弘实验学校", "发现相关岗位"]]),
  ...coverage("惠阳", "全住宿", [["惠州市惠阳区丰湖高级中学", "发现相关岗位"], ["惠州市惠阳区南岭高级中学", "发现相关岗位"], ["惠州市惠阳区泰雅实验高中", "发现相关岗位"]]),
  ...coverage("惠东", "全住宿", [["惠东县综合实验学校", "发现相关岗位"], ["惠东燕岭学校", "发现教师入口"], ["惠东县稔山碧桂园十里银滩学校", "发现相关岗位"]]),
  ...coverage("博罗", "全住宿", [["博罗县榕城高级中学", "发现相关岗位"], ["博罗县东江博雅学校", "发现相关岗位"], ["博罗县综合高级中学", "发现相关岗位"], ["博罗县京师荟成学校", "发现相关岗位"]]),
  ...coverage("龙门", "全住宿", [["龙门县臻德高级中学", "发现相关岗位"]]),
  ...coverage("大亚湾", "全住宿", [["惠州大亚湾经济技术开发区博雅培文实验学校", "发现相关岗位"], ["惠州大亚湾经济技术开发区外语实验学校", "发现相关岗位"]]),
  ...coverage("仲恺", "全住宿", [["华实高级中学", "发现相关岗位"], ["惠州宏华中学", "发现相关岗位"]]),
];

export const officialFoshanPoolSource = "https://edu.foshan.gov.cn/zwgk/ghjh/content/post_7198570.html";

export const foshanCoverage: CoverageRecord[] = [
  ...coverage("禅城", "全住宿", [["佛山市岭南美术实验中学", "发现相关岗位"], ["佛山市外国语学校", "发现相关岗位"], ["佛山市文聚实验高级中学", "发现相关岗位"]]),
  ...coverage("南海", "全住宿", [["华南师范大学附属中学南海实验高级中学", "发现教师入口"], ["佛山市南海区南海中学分校", "发现相关岗位"], ["佛山市南海外国语高级中学", "发现相关岗位"], ["佛山市南海区金石实验中学", "发现相关岗位"], ["佛山市南海区南执高级中学", "发现相关岗位"], ["佛山市南山湖实验中学", "发现相关岗位"], ["佛山市听音湖实验中学", "发现相关岗位"], ["佛山市超盈实验中学", "发现相关岗位"], ["佛山市南海区卓远未来实验学校", "发现相关岗位"], ["佛山市金桂实验高级中学", "发现相关岗位"], ["佛山市南海湾实验中学", "发现相关岗位"], ["佛山市美伦外国语高级中学", "发现相关岗位"], ["佛山市黄飞鸿文武学校", "本轮未发现相关岗位"], ["佛山市南海区瀚德外国语学校", "发现相关岗位"], ["佛山暨大港澳子弟学校 ASJ", "发现相关岗位"]]),
  ...coverage("顺德", "全住宿", [["广东顺德德胜学校", "发现相关岗位"], ["佛山市顺德区文德学校", "发现相关岗位"], ["佛山市顺德区东逸湾实验学校", "发现相关岗位"], ["佛山市顺德区国华纪念中学", "发现相关岗位"], ["广东碧桂园学校", "发现相关岗位"], ["佛山市顺德区光正实验学校", "发现相关岗位"], ["佛山市顺德区元培实验中学", "发现相关岗位"], ["佛山市顺德区北滘实验高中", "发现相关岗位"], ["佛山市顺德区英华高级中学", "发现相关岗位"], ["顺德区美辰学校", "发现相关岗位"], ["顺德养正学校", "发现相关岗位"], ["中黄星瑜港澳子弟学校", "发现相关岗位"]]),
  ...coverage("高明", "全住宿", [["佛山市惟德外国语实验学校", "发现相关岗位"]]),
  ...coverage("三水", "全住宿", [["佛山市华大星晖高级中学", "发现相关岗位"], ["佛山市萌茵实验学校", "发现相关岗位"], ["佛山市三水区北博德翰外国语学校", "发现相关岗位"]]),
];

export const officialDongguanPoolSource = "https://edu.dg.gov.cn/flfw/fwxsjc/jcjy/zkzz/content/mpost_4544288.html";

export const dongguanCoverage: CoverageRecord[] = [
  ...coverage("东城", "全住宿", [["东莞市东华高级中学（东城校区）", "发现教师入口"], ["东莞市光明中学", "发现相关岗位"], ["东莞市粤华学校", "发现相关岗位"], ["东莞市东城中坚实验学校", "发现相关岗位"]]),
  ...coverage("松山湖", "全住宿", [["东莞市东华高级中学（生态园校区）", "发现教师入口"], ["东莞市松山湖莞美学校", "发现相关岗位"], ["东莞市松山湖清澜山学校", "发现相关岗位"], ["东莞市东华松山湖高级中学", "发现教师入口"]]),
  ...coverage("凤岗", "全住宿", [["东莞市新世纪英才学校", "发现相关岗位"], ["东莞市南城御花苑外国语学校（凤岗天安校区）", "发现相关岗位"]]),
  ...coverage("沙田", "全住宿", [["东莞市东方明珠学校", "发现相关岗位"]]),
  ...coverage("万江", "全住宿", [["东莞市翰林实验学校", "发现相关岗位"]]),
  ...coverage("茶山", "全住宿", [["东莞市光正实验学校", "发现相关岗位"]]),
  ...coverage("南城", "全住宿", [["东莞市南城开心实验学校", "发现相关岗位"], ["东莞市弘林高级中学", "发现相关岗位"], ["东莞市南城东晖实验学校", "发现相关岗位"]]),
  ...coverage("虎门", "全住宿", [["东莞市虎门外语学校", "发现相关岗位"], ["东莞市丰泰外国语实验高级中学", "发现相关岗位"]]),
  ...coverage("桥头", "全住宿", [["东莞市石竹实验学校", "发现相关岗位"]]),
  ...coverage("塘厦", "全住宿", [["东莞市塘厦水霖学校", "发现相关岗位"]]),
  ...coverage("黄江", "全住宿", [["东莞市礼仁外国语学校", "发现相关岗位"], ["东莞市海德实验学校", "发现相关岗位"]]),
  ...coverage("清溪", "全住宿", [["东莞市海德双语学校", "发现相关岗位"], ["东莞市众美中学", "发现相关岗位"]]),
  ...coverage("望牛墩", "全住宿", [["东莞市北辰高级中学", "发现相关岗位"]]),
  ...coverage("洪梅", "全住宿", [["东莞市翰林高级中学", "发现相关岗位"]]),
  ...coverage("麻涌", "全住宿", [["东莞市嘉荣外国语学校", "发现相关岗位"], ["东莞市嘉荣实验综合高中", "本轮未发现相关岗位"]]),
  ...coverage("厚街", "全住宿", [["东莞市海逸外国语学校", "发现相关岗位"]]),
];

export const sourceLegend = {
  A: "学校或集团官网、官方招聘系统",
  B: "政府部门、公共招聘平台、高校就业网",
  C: "教师或综合招聘平台，需校方确认",
  D: "聚合或转载，只作线索",
} as const;
