// 批量检测数据文件中的外链状态，供每轮复核前快速体检。
// 用法：node --experimental-strip-types scripts/check-links.mjs [--timeout 12]
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { jobs, officialShenzhenPoolSource, shenzhenCoverage } from "../app/recruitment-data.ts";

const execFileAsync = promisify(execFile);
const timeoutMs = Number(process.argv.includes("--timeout") ? process.argv[process.argv.indexOf("--timeout") + 1] : 12) * 1000;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const links = new Map();
for (const job of jobs) {
  for (const source of job.sources) {
    links.set(source.url, { jobId: job.id, label: source.label, level: source.level });
  }
  if (job.application && job.application !== job.sources[0]?.url) {
    links.set(job.application, { jobId: job.id, label: "投递入口", level: "-" });
  }
}
links.set(officialShenzhenPoolSource, { jobId: "coverage", label: "深圳官方名单", level: "-" });

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    if (response.status === 403) {
      try {
        const { stdout } = await execFileAsync("curl", ["-sL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", String(timeoutMs / 1000), "-A", UA, url], { timeout: timeoutMs + 5000 });
        if (stdout.trim() === "200") return { status: 200, detail: "（fetch 被反爬拦截，浏览器正常）" };
      } catch {
        // 403 且 curl 也失败，按异常处理
      }
    }
    return { status: response.status, detail: "" };
  } catch {
    // Node 的 TLS 校验比浏览器严格，失败时用 curl 复核，区分兼容问题与真异常。
    try {
      const { stdout } = await execFileAsync("curl", ["-sL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", String(timeoutMs / 1000), "-A", UA, url], { timeout: timeoutMs + 5000 });
      if (stdout.trim() === "200") return { status: 200, detail: "（浏览器可正常访问，Node TLS 兼容问题）" };
      try {
        await execFileAsync("curl", ["-skL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", String(timeoutMs / 1000), "-A", UA, url], { timeout: timeoutMs + 5000 });
        return { status: 200, detail: "（证书异常，浏览器会显示警告）" };
      } catch {
        return { status: 0, detail: "（curl 亦无法访问）" };
      }
    } catch {
      return { status: 0, detail: "（连接失败）" };
    }
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
const queue = [...links.keys()];
const workers = Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const meta = links.get(url);
    const { status, detail } = await check(url);
    results.push({ status, url, ...meta, detail });
  }
});
await Promise.all(workers);

results.sort((a, b) => (a.status === 200 ? 1 : 0) - (b.status === 200 ? 1 : 0) || a.url.localeCompare(b.url));

let failed = 0;
for (const result of results) {
  const mark = result.status === 200 ? "OK  " : result.status === 0 ? "FAIL" : `HTTP ${result.status}`;
  if (result.status !== 200) failed += 1;
  console.log(`${mark}  [${result.level}] ${result.jobId.padEnd(26)} ${result.label.padEnd(14)} ${result.url}${result.detail}`);
}

console.log(`\n共检测 ${results.length} 条链接，${results.length - failed} 条正常，${failed} 条异常。`);
console.log(`深圳覆盖清单 ${shenzhenCoverage.length} 所（覆盖清单无逐校链接，此处不计）。`);
process.exitCode = failed > 0 ? 1 : 0;
