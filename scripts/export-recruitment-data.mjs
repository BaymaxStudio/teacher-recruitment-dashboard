// 将网站数据导出为便于后续人工更新的 JSON。
import { mkdir, writeFile } from "node:fs/promises";
import {
  jobs,
  guangzhouCoverage,
  officialGuangzhouPoolSource,
  officialShenzhenPoolSource,
  shenzhenCoverage,
  sourceLegend,
} from "../app/recruitment-data.ts";

const outputDirectory = new URL("../outputs/", import.meta.url);
const outputFile = new URL("广东民办中学教师_2027秋招数据.json", outputDirectory);

const exportData = {
  metadata: {
    title: "广东民办中学教师 2027 秋招结构化数据",
    lastVerified: "2026-08-14",
    salaryUnit: "税前年薪万元",
    defaultSalaryFloor: 15,
    notes: [
      "26届流程只作参考，不代表27届采用相同流程。",
      "未公开与没有要求是不同状态。",
      "公开月薪只乘12，不加入未确认奖金或课时费。",
    ],
    sourceLegend,
    officialShenzhenPoolSource,
    officialGuangzhouPoolSource,
  },
  jobs: jobs.map(({ stages, ...job }) => ({ ...job, selectionStages: stages })),
  shenzhenCoverage,
  guangzhouCoverage,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(exportData, null, 2)}\n`, "utf8");
console.log(`已导出 ${jobs.length} 条岗位记录、${shenzhenCoverage.length} 条深圳覆盖记录和 ${guangzhouCoverage.length} 条广州覆盖记录。`);
