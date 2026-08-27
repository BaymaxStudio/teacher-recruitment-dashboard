// 批量检测招聘数据外链；单 URL 判断可注入依赖，单测不会访问外网。
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  jobs,
  officialShenzhenPoolSource,
  officialGuangzhouPoolSource,
  officialDongguanPoolSource,
  officialFoshanPoolSource,
  officialHuizhouPoolSource,
  officialZhuhaiPoolSource,
  cityDatasets,
  multiCityDataset,
} from "../app/recruitment-data.ts";

const execFileAsync = promisify(execFile);
const DEFAULT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

export function parseHttpCode(stdout) {
  const code = Number.parseInt(String(stdout).trim(), 10);
  return Number.isFinite(code) && code > 0 ? code : 0;
}

export function isAcceptableStatus(code) {
  if (code >= 200 && code < 300) return true;
  return code === 301 || code === 308;
}

export function classifyStatus(code) {
  if (code === 0) return "connection_failed";
  if (isAcceptableStatus(code)) return null;
  if (code === 401 || code === 403 || code === 405 || code === 429) return "login_restricted";
  return "http_status";
}

export function classifyFetchError(error) {
  const message = error instanceof Error ? `${error.name} ${error.message} ${String(error.cause?.code ?? "")}` : String(error);
  if (/AbortError|aborted|timeout|ETIMEDOUT|TIMEOUT/i.test(message)) return "timeout";
  if (/ERR_TLS|ERR_SSL|CERT|UNABLE_TO_VERIFY|SELF_SIGNED|DEPTH_ZERO|HANDSHAKE/i.test(message)) return "tls";
  return "connection_failed";
}

export const ANOMALY_LABELS = {
  http_status: "HTTP 状态异常",
  timeout: "超时",
  tls: "TLS/证书异常",
  login_restricted: "登录或反爬限制",
  qr_only: "仅二维码",
  connection_failed: "连接失败",
};

export function createCurlStatus({ execFileImpl = execFileAsync, timeoutMs, userAgent = DEFAULT_UA }) {
  return async (url, insecure = false) => {
    const args = ["-sL", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", String(timeoutMs / 1000), "-A", userAgent];
    if (insecure) args.splice(1, 0, "-k");
    const { stdout } = await execFileImpl("curl", args, { timeout: timeoutMs + 5000 });
    return parseHttpCode(stdout);
  };
}

async function tryCurl(curlStatusImpl, url, insecure) {
  try {
    return { ok: true, code: await curlStatusImpl(url, insecure) };
  } catch {
    return { ok: false, code: 0 };
  }
}

export async function checkUrl(url, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    curlStatusImpl,
    timeoutMs = 12000,
    userAgent = DEFAULT_UA,
    accessState = "ok",
  } = options;

  if (accessState === "qr_only") {
    return { code: 0, anomaly: "qr_only", detail: "（公告可保留，但投递需要手动扫码）" };
  }
  if (typeof fetchImpl !== "function" || typeof curlStatusImpl !== "function") {
    throw new TypeError("checkUrl 需要 fetchImpl 与 curlStatusImpl");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
    });
    const responseStatus = response.status;
    // 链接检查只需要状态码。主动释放正文，避免批量 GET 后连接池句柄阻止进程退出。
    await response.body?.cancel?.().catch(() => undefined);
    if (responseStatus === 401 || responseStatus === 403) {
      const curl = await tryCurl(curlStatusImpl, url, false);
      if (curl.ok && isAcceptableStatus(curl.code)) {
        return { code: curl.code, anomaly: null, detail: "（fetch 受限，curl 可访问）" };
      }
      return {
        code: curl.code || responseStatus,
        anomaly: "login_restricted",
        detail: curl.ok ? `（curl 复核状态：${curl.code || "无法解析"}）` : "（curl 复核失败）",
      };
    }
    return { code: responseStatus, anomaly: classifyStatus(responseStatus), detail: "" };
  } catch (error) {
    const failure = classifyFetchError(error);
    const normalCurl = await tryCurl(curlStatusImpl, url, false);

    if (failure === "tls") {
      const insecureCurl = await tryCurl(curlStatusImpl, url, true);
      const code = insecureCurl.code || normalCurl.code;
      return {
        code,
        anomaly: "tls",
        detail: insecureCurl.ok
          ? `（证书异常；curl -k 状态 ${code || "无法解析"}）`
          : "（证书异常且 curl -k 复核失败）",
      };
    }

    if (normalCurl.ok && isAcceptableStatus(normalCurl.code)) {
      return { code: normalCurl.code, anomaly: null, detail: "（fetch 失败，curl 可访问）" };
    }
    if (failure === "timeout") {
      if (normalCurl.ok && normalCurl.code > 0) {
        return {
          code: normalCurl.code,
          anomaly: classifyStatus(normalCurl.code),
          detail: `（fetch 超时；curl 复核状态：${normalCurl.code}）`,
        };
      }
      return { code: normalCurl.code, anomaly: "timeout", detail: "（fetch 与 curl 未在时限内确认可用）" };
    }
    return {
      code: normalCurl.code,
      anomaly: normalCurl.ok ? classifyStatus(normalCurl.code) : "connection_failed",
      detail: normalCurl.ok ? `（curl 复核状态：${normalCurl.code || "无法解析"}）` : "（curl 亦无法访问）",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function collectLinks() {
  const links = new Map();
  const addLink = (url, meta) => {
    if (!url) return;
    const current = links.get(url);
    if (!current) {
      links.set(url, meta);
      return;
    }
    links.set(url, {
      ...current,
      ...meta,
      accessState: current.accessState === "qr_only" || meta.accessState === "qr_only" ? "qr_only" : (meta.accessState ?? current.accessState),
    });
  };

  for (const job of jobs) {
    for (const source of job.sources) {
      addLink(source.url, { jobId: job.id, label: source.label, level: source.level, accessState: "ok" });
    }
    if (job.application && job.application !== job.sources[0]?.url) {
      addLink(job.application, { jobId: job.id, label: "投递入口", level: "-", accessState: "ok" });
    }
  }

  const poolSources = [
    ["深圳", officialShenzhenPoolSource],
    ["广州", officialGuangzhouPoolSource],
    ["东莞", officialDongguanPoolSource],
    ["佛山", officialFoshanPoolSource],
    ["惠州", officialHuizhouPoolSource],
    ["珠海", officialZhuhaiPoolSource],
  ];
  for (const [city, url] of poolSources) {
    addLink(url, { jobId: "coverage", label: `${city}官方名单`, level: "-", accessState: "ok" });
  }

  for (const dataset of [...cityDatasets, multiCityDataset]) {
    for (const item of dataset.evidence) {
      addLink(item.url, {
        jobId: `v2:${dataset.cityId}`,
        label: item.sourceLevel,
        level: "-",
        accessState: item.accessState,
      });
    }
    for (const batch of dataset.batches) {
      if (batch.applicationUrl && batch.applicationMethod === "qr") {
        addLink(batch.applicationUrl, {
          jobId: batch.id,
          label: "扫码投递入口",
          level: "-",
          accessState: "qr_only",
        });
      }
    }
  }
  return links;
}

async function main() {
  const timeoutSeconds = Number(process.argv.includes("--timeout") ? process.argv[process.argv.indexOf("--timeout") + 1] : 12);
  const timeoutMs = Number.isFinite(timeoutSeconds) && timeoutSeconds > 0 ? timeoutSeconds * 1000 : 12000;
  const curlStatusImpl = createCurlStatus({ timeoutMs });
  const links = collectLinks();
  const results = [];
  const queue = [...links.keys()];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const meta = links.get(url);
      const checked = await checkUrl(url, { curlStatusImpl, timeoutMs, accessState: meta.accessState });
      results.push({ ...checked, url, ...meta });
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => (a.anomaly ? 1 : 0) - (b.anomaly ? 1 : 0) || a.url.localeCompare(b.url));

  let failed = 0;
  for (const result of results) {
    const mark = result.anomaly ? "FAIL" : "OK  ";
    if (result.anomaly) failed += 1;
    const anomalyText = result.anomaly ? `[${ANOMALY_LABELS[result.anomaly]}] ` : "";
    console.log(`${mark}  ${anomalyText}[${result.level}] ${result.jobId.padEnd(26)} ${result.label.padEnd(14)} ${result.url}${result.detail}`);
  }
  console.log(`\n共检测 ${results.length} 条链接，${results.length - failed} 条正常，${failed} 条异常。`);
  const byAnomaly = {};
  for (const result of results) {
    if (result.anomaly) byAnomaly[result.anomaly] = (byAnomaly[result.anomaly] ?? 0) + 1;
  }
  if (Object.keys(byAnomaly).length) {
    console.log("异常分布：" + Object.entries(byAnomaly).map(([key, count]) => `${ANOMALY_LABELS[key]}×${count}`).join("，"));
  }
  // 外部站点异常属于数据健康度结果，默认不让本地验收命令失败；CI 可用 --strict 提升为非零退出。
  process.exitCode = process.argv.includes("--strict") && failed > 0 ? 1 : 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
