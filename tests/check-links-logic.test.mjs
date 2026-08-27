// 阶段 A.1：check-links 状态解析与异常分类的纯函数单测（不访问外网）。
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseHttpCode,
  isAcceptableStatus,
  classifyStatus,
  classifyFetchError,
  checkUrl,
  collectLinks,
  ANOMALY_LABELS,
} from "../scripts/check-links.mjs";

test("parseHttpCode reads real curl status output", () => {
  assert.equal(parseHttpCode("200"), 200);
  assert.equal(parseHttpCode("200\n"), 200);
  assert.equal(parseHttpCode(" 404 "), 404);
  assert.equal(parseHttpCode("301"), 301);
  // curl 无法连接时输出 000 或空串，必须解析为 0（连接失败），不能误当正常。
  assert.equal(parseHttpCode("000"), 0);
  assert.equal(parseHttpCode(""), 0);
  assert.equal(parseHttpCode("abc"), 0);
  assert.equal(parseHttpCode(null), 0);
  assert.equal(parseHttpCode(undefined), 0);
});

test("only 2xx (and explicitly accepted codes) pass", () => {
  assert.equal(isAcceptableStatus(200), true);
  assert.equal(isAcceptableStatus(204), true);
  assert.equal(isAcceptableStatus(299), true);
  assert.equal(isAcceptableStatus(301), true, "项目明确接受 301 永久跳转");
  assert.equal(isAcceptableStatus(308), true, "项目明确接受 308 永久跳转");
  assert.equal(isAcceptableStatus(404), false, "404 不得因 curl 退出码为 0 而误报正常");
  assert.equal(isAcceptableStatus(403), false);
  assert.equal(isAcceptableStatus(500), false);
  assert.equal(isAcceptableStatus(0), false);
});

test("classifyStatus maps codes to anomaly types", () => {
  assert.equal(classifyStatus(200), null);
  assert.equal(classifyStatus(404), "http_status");
  assert.equal(classifyStatus(500), "http_status");
  assert.equal(classifyStatus(403), "login_restricted");
  assert.equal(classifyStatus(401), "login_restricted");
  assert.equal(classifyStatus(429), "login_restricted");
  assert.equal(classifyStatus(0), "connection_failed");
});

test("classifyFetchError distinguishes timeout, TLS and connection failures", () => {
  const abortError = new Error("This operation was aborted");
  abortError.name = "AbortError";
  assert.equal(classifyFetchError(abortError), "timeout");

  const tlsError = new Error("unable to verify the first certificate");
  tlsError.cause = { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" };
  assert.equal(classifyFetchError(tlsError), "tls");

  const altNameError = new Error("request to https://example.com failed");
  altNameError.cause = { code: "ERR_TLS_CERT_ALTNAME_INVALID" };
  assert.equal(classifyFetchError(altNameError), "tls");

  const dnsError = new Error("fetch failed");
  dnsError.cause = { code: "ENOTFOUND" };
  assert.equal(classifyFetchError(dnsError), "connection_failed");

  const refusedError = new Error("fetch failed");
  refusedError.cause = { code: "ECONNREFUSED" };
  assert.equal(classifyFetchError(refusedError), "connection_failed");
});

test("anomaly labels cover all documented anomaly types", () => {
  for (const key of ["http_status", "timeout", "tls", "login_restricted", "qr_only", "connection_failed"]) {
    assert.ok(ANOMALY_LABELS[key], `缺少异常类型 ${key} 的标签`);
  }
});

test("checkUrl returns HTTP and login classifications without real network access", async () => {
  const notFound = await checkUrl("https://example.invalid/missing", {
    fetchImpl: async () => ({ status: 404 }),
    curlStatusImpl: async () => 0,
  });
  assert.equal(notFound.anomaly, "http_status");
  assert.equal(notFound.code, 404);

  const restrictedButReachable = await checkUrl("https://example.invalid/restricted", {
    fetchImpl: async () => ({ status: 403 }),
    curlStatusImpl: async () => 200,
  });
  assert.equal(restrictedButReachable.anomaly, null);
  assert.equal(restrictedButReachable.code, 200);

  const restricted = await checkUrl("https://example.invalid/login", {
    fetchImpl: async () => ({ status: 401 }),
    curlStatusImpl: async () => 403,
  });
  assert.equal(restricted.anomaly, "login_restricted");
});

test("checkUrl releases successful response bodies", async () => {
  let cancelled = 0;
  const result = await checkUrl("https://example.invalid/ok", {
    fetchImpl: async () => ({
      status: 200,
      body: { cancel: async () => { cancelled += 1; } },
    }),
    curlStatusImpl: async () => 0,
  });
  assert.equal(result.anomaly, null);
  assert.equal(cancelled, 1, "只读状态检查结束后应释放响应正文");
});

test("TLS failures still run insecure curl when ordinary curl throws", async () => {
  const calls = [];
  const tlsError = new Error("unable to verify the first certificate");
  tlsError.cause = { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" };
  const result = await checkUrl("https://example.invalid/tls", {
    fetchImpl: async () => { throw tlsError; },
    curlStatusImpl: async (_url, insecure) => {
      calls.push(insecure);
      if (!insecure) throw new Error("curl certificate error");
      return 200;
    },
  });
  assert.deepEqual(calls, [false, true]);
  assert.equal(result.code, 200);
  assert.equal(result.anomaly, "tls", "-k 成功也不能把证书异常标成正常");
});

test("checkUrl keeps timeout and connection failures separate", async () => {
  const abortError = new Error("This operation was aborted");
  abortError.name = "AbortError";
  const timeout = await checkUrl("https://example.invalid/timeout", {
    fetchImpl: async () => { throw abortError; },
    curlStatusImpl: async () => { throw new Error("curl timeout"); },
  });
  assert.equal(timeout.anomaly, "timeout");

  const timeoutWithHttp = await checkUrl("https://example.invalid/http-after-timeout", {
    fetchImpl: async () => { throw abortError; },
    curlStatusImpl: async () => 500,
  });
  assert.equal(timeoutWithHttp.anomaly, "http_status");
  assert.equal(timeoutWithHttp.code, 500);

  const connectionError = new Error("fetch failed");
  connectionError.cause = { code: "ENOTFOUND" };
  const connection = await checkUrl("https://example.invalid/dns", {
    fetchImpl: async () => { throw connectionError; },
    curlStatusImpl: async () => 0,
  });
  assert.equal(connection.anomaly, "connection_failed");
});

test("QR-only records do not make a network request", async () => {
  let called = false;
  const result = await checkUrl("https://example.invalid/qr", {
    accessState: "qr_only",
    fetchImpl: async () => { called = true; return { status: 200 }; },
    curlStatusImpl: async () => { called = true; return 200; },
  });
  assert.equal(called, false);
  assert.equal(result.anomaly, "qr_only");
});

test("collected V2 QR batches keep qr_only access metadata", () => {
  const links = collectLinks();
  const qrRecords = [...links.values()].filter((record) => record.accessState === "qr_only");
  assert.ok(qrRecords.length > 0, "V2 扫码批次应进入链接检查集合");
  assert.ok(qrRecords.some((record) => record.jobId === "batch-edu-skled-27"));
});
