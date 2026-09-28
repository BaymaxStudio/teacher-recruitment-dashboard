// 默认视图的状态分组：可行动的岗位默认显示，往届参考与已截止只在“参考”里出现。
import assert from "node:assert/strict";
import test from "node:test";
import { matchesStatusFilter, statusGroup, statusKey } from "../app/ui/status-group.ts";

const ALL = ["27届开放", "2027秋季开放", "常年储备", "等待27届", "26届参考", "已截止", "状态待确认"];

test("every recruitment status belongs to exactly one group", () => {
  const actionable = ALL.filter((status) => statusGroup(status) === "actionable");
  const reference = ALL.filter((status) => statusGroup(status) === "reference");
  assert.deepEqual(actionable, ["27届开放", "2027秋季开放", "常年储备", "等待27届", "状态待确认"]);
  assert.deepEqual(reference, ["26届参考", "已截止"]);
});

test("both autumn and current openings count as 现在可投", () => {
  assert.equal(statusKey("27届开放"), "open");
  assert.equal(statusKey("2027秋季开放"), "open");
});

test("status filters select the intended positions", () => {
  assert.equal(matchesStatusFilter("26届参考", "actionable"), false);
  assert.equal(matchesStatusFilter("已截止", "reference"), true);
  assert.equal(matchesStatusFilter("状态待确认", "unknown"), true);
  assert.equal(matchesStatusFilter("常年储备", "open"), false);
  assert.ok(ALL.every((status) => matchesStatusFilter(status, "all")));
});
