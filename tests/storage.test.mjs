// 阶段 A.1：localStorage schemaVersion 迁移链校验。
// 覆盖：V1 三键迁移、V2 正常读取、旧容器版本迁移、未识别新版本不覆盖、
// 损坏数据不破坏有效字段、写入失败可被调用方发现。
import assert from "node:assert/strict";
import test from "node:test";
import { loadStorageState, saveStorageState, STORAGE_SCHEMA_VERSION } from "../lib/storage.ts";

const CONTAINER_KEY = "teacher-job-state";

function installMockStorage(initial = {}, setItemThrows = false, getItemThrows = false) {
  const store = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (key) => {
      if (getItemThrows) throw new Error("SecurityError");
      return store.has(key) ? store.get(key) : null;
    },
    setItem: (key, value) => {
      if (setItemThrows) throw new Error("QuotaExceededError");
      store.set(key, String(value));
    },
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

test("migrates legacy three-key data into the versioned container", () => {
  installMockStorage({
    "teacher-job-favorites": JSON.stringify(["sz-001", "gz-002"]),
    "teacher-job-notes": JSON.stringify({ "sz-001": "重点跟进" }),
    "teacher-job-followups": JSON.stringify({ "gz-002": "已投递" }),
  });

  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.migrated, true);
  assert.equal(result.state.schemaVersion, STORAGE_SCHEMA_VERSION);
  assert.deepEqual(result.state.favorites, ["sz-001", "gz-002"]);
  assert.deepEqual(result.state.notes, { "sz-001": "重点跟进" });
  assert.deepEqual(result.state.followups, { "gz-002": "已投递" });
  assert.ok(globalThis.localStorage.getItem(CONTAINER_KEY), "迁移后应写入版本化容器");
});

test("reads directly when the versioned container already exists", () => {
  installMockStorage({
    [CONTAINER_KEY]: JSON.stringify({
      schemaVersion: 2,
      favorites: ["a"],
      notes: { a: "n" },
      followups: { a: "已联系" },
    }),
  });
  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.migrated, false);
  assert.deepEqual(result.state.favorites, ["a"]);
  assert.deepEqual(result.state.notes, { a: "n" });
  assert.deepEqual(result.state.followups, { a: "已联系" });
});

test("upgrades an older container version through the migration chain", () => {
  installMockStorage({
    [CONTAINER_KEY]: JSON.stringify({
      schemaVersion: 1,
      favorites: ["old-1"],
      notes: { "old-1": "旧容器备注" },
      followups: {},
    }),
  });
  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.migrated, true);
  assert.equal(result.state.schemaVersion, STORAGE_SCHEMA_VERSION);
  assert.deepEqual(result.state.favorites, ["old-1"]);
  assert.deepEqual(result.state.notes, { "old-1": "旧容器备注" });
  const rewritten = JSON.parse(globalThis.localStorage.getItem(CONTAINER_KEY));
  assert.equal(rewritten.schemaVersion, STORAGE_SCHEMA_VERSION, "旧容器应被回写为新版本");
});

test("does not overwrite an unrecognized newer container", () => {
  const newerContainer = JSON.stringify({
    schemaVersion: 99,
    favorites: ["future-1"],
    notes: { "future-1": "未来版本写入的备注" },
    followups: {},
  });
  installMockStorage({ [CONTAINER_KEY]: newerContainer });

  const result = loadStorageState();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "newer_version");
  // 现有容器原样保留，未被空数据覆盖。
  assert.equal(globalThis.localStorage.getItem(CONTAINER_KEY), newerContainer);
});

test("corrupted fields do not destroy valid fields", () => {
  installMockStorage({
    [CONTAINER_KEY]: JSON.stringify({
      schemaVersion: 2,
      favorites: "not-an-array",
      notes: { keep: "有效备注" },
      followups: { keep: "已投递" },
    }),
  });
  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.favorites, [], "损坏的 favorites 应重置为空");
  assert.deepEqual(result.state.notes, { keep: "有效备注" }, "有效的 notes 不应被破坏");
  assert.deepEqual(result.state.followups, { keep: "已投递" }, "有效的 followups 不应被破坏");
  assert.ok(result.warnings.length > 0, "字段损坏应给出警告");
});

test("falls back to legacy keys when the container JSON is corrupted", () => {
  installMockStorage({
    [CONTAINER_KEY]: "{not valid json",
    "teacher-job-favorites": JSON.stringify(["salvage-1"]),
    "teacher-job-notes": JSON.stringify({ "salvage-1": "从旧键抢救的备注" }),
    "teacher-job-followups": JSON.stringify({}),
  });
  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.favorites, ["salvage-1"]);
  assert.deepEqual(result.state.notes, { "salvage-1": "从旧键抢救的备注" });
});

test("reports a corrupted state when nothing is recoverable", () => {
  installMockStorage({ [CONTAINER_KEY]: "{not valid json" });
  const result = loadStorageState();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "corrupted");
  assert.equal(globalThis.localStorage.getItem(CONTAINER_KEY), "{not valid json", "损坏容器不应被修改");
});

test("does not overwrite a corrupted container when every legacy key is also corrupted", () => {
  const original = "{broken container";
  const store = installMockStorage({
    [CONTAINER_KEY]: original,
    "teacher-job-favorites": "{broken favorites",
    "teacher-job-notes": "{broken notes",
    "teacher-job-followups": "{broken followups",
  });
  const result = loadStorageState();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "corrupted");
  assert.equal(store.get(CONTAINER_KEY), original, "全部损坏时不得用空状态覆盖原容器");
});

test("does not overwrite a current container when all three fields and legacy keys are invalid", () => {
  const original = JSON.stringify({ schemaVersion: 2, favorites: "bad", notes: [], followups: 42 });
  const store = installMockStorage({
    [CONTAINER_KEY]: original,
    "teacher-job-favorites": "{broken favorites",
    "teacher-job-notes": "{broken notes",
    "teacher-job-followups": "{broken followups",
  });
  const result = loadStorageState();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "corrupted");
  assert.equal(store.get(CONTAINER_KEY), original);
});

test("does not overwrite a container when a migration step is missing", () => {
  const original = JSON.stringify({ schemaVersion: 0, favorites: ["old"], notes: {}, followups: {} });
  const store = installMockStorage({ [CONTAINER_KEY]: original });
  const result = loadStorageState();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "migration_unsupported");
  assert.equal(store.get(CONTAINER_KEY), original);
});

test("reports unavailable storage without attempting to save", () => {
  const resultStore = installMockStorage({ [CONTAINER_KEY]: "keep" }, false, true);
  const result = loadStorageState();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "unavailable");
  assert.equal(resultStore.get(CONTAINER_KEY), "keep");
});

test("save failures are visible to callers", () => {
  installMockStorage({}, true);
  const saved = saveStorageState({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    favorites: ["x"],
    notes: {},
    followups: {},
  });
  assert.equal(saved, false, "写入失败应返回 false 而非静默成功");

  // 迁移过程中写入失败也不应丢失已解析的状态。
  installMockStorage(
    {
      "teacher-job-favorites": JSON.stringify(["y"]),
      "teacher-job-notes": JSON.stringify({}),
      "teacher-job-followups": JSON.stringify({}),
    },
    true,
  );
  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.favorites, ["y"], "容器写入失败时迁移结果仍应返回给调用方");
  assert.ok(result.warnings.some((warning) => /未能写回/.test(warning)), "迁移回写失败应给出警告");
});

test("tolerates absent storage", () => {
  installMockStorage({});
  const result = loadStorageState();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.state.favorites, []);
  assert.deepEqual(result.state.notes, {});
  assert.deepEqual(result.state.followups, {});
  assert.equal(result.migrated, false, "没有旧键时不应声称执行了恢复");
  assert.equal(globalThis.localStorage.getItem(CONTAINER_KEY), null, "没有旧键时加载函数不应主动写入空容器");
});
