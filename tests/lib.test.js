"use strict";
const assert = require("node:assert");
const test = require("node:test");
const L = require("../js/lib.js");

const ev = (visit, at, name, extra) => Object.assign({ visit_id: visit, site: "lab", name: name, at: at, referrer: null, device: "desktop" }, extra || {});

test("summarize counts visits, page views, events and ignores page views in top list", function () {
  const s = L.summarize([
    ev("a1", "2026-11-19T10:00:00Z", "pageview", { referrer: "linkedin.com" }),
    ev("a1", "2026-11-19T10:01:00Z", "screen/intune.home"),
    ev("a1", "2026-11-19T10:02:00Z", "screen/intune.home"),
    ev("b2", "2026-11-19T11:00:00Z", "pageview"),
    ev("b2", "2026-11-19T11:00:30Z", "phone/tickets", { device: "phone" })
  ]);
  assert.strictEqual(s.visitCount, 2);
  assert.strictEqual(s.pageviews, 2);
  assert.strictEqual(s.eventCount, 3);
  assert.deepStrictEqual(s.top[0], ["screen/intune.home", 2]);
  assert.ok(!s.top.some(function (t) { return t[0] === "pageview"; }));
  assert.deepStrictEqual(s.referrers.map(function (r) { return r[0]; }).sort(), ["(direct)", "linkedin.com"]);
});

test("funnel counts distinct visits that started and finished tickets and missions", function () {
  const s = L.summarize([
    ev("a1", "2026-11-19T10:00:00Z", "ticket/s1-started"),
    ev("a1", "2026-11-19T10:00:05Z", "ticket/s1-started"),
    ev("a1", "2026-11-19T10:05:00Z", "ticket/s1-resolved"),
    ev("b2", "2026-11-19T11:00:00Z", "ticket/s1-started"),
    ev("b2", "2026-11-19T11:00:10Z", "mission/new-hire-started"),
    ev("b2", "2026-11-19T11:09:00Z", "mission/new-hire-finished")
  ]);
  const t = s.funnel.filter(function (f) { return f.key === "ticket/s1"; })[0];
  assert.deepStrictEqual([t.started, t.finished], [2, 1]);
  const m = s.funnel.filter(function (f) { return f.key === "mission/new-hire"; })[0];
  assert.deepStrictEqual([m.started, m.finished], [1, 1]);
  assert.strictEqual(s.ticketsStarted, 2);
  assert.strictEqual(s.ticketsFinished, 1);
});

test("journeys are sorted by time and visits newest first", function () {
  const s = L.summarize([
    ev("late", "2026-11-19T12:00:00Z", "pageview"),
    ev("early", "2026-11-19T09:00:05Z", "b"),
    ev("early", "2026-11-19T09:00:00Z", "pageview")
  ]);
  assert.strictEqual(s.visits[0].id, "late");
  assert.deepStrictEqual(s.visits[1].events.map(function (e) { return e.name; }), ["pageview", "b"]);
});

test("lastDays fills missing days with zero and keeps the requested length", function () {
  const now = new Date(2026, 10, 19, 12).getTime();
  const out = L.lastDays({ "2026-11-19": 3 }, 3, now);
  assert.deepStrictEqual(out.map(function (d) { return d.day; }), ["2026-11-17", "2026-11-18", "2026-11-19"]);
  assert.deepStrictEqual(out.map(function (d) { return d.n; }), [0, 0, 3]);
});

test("csv escapes quotes and commas and neutralises spreadsheet formulas", function () {
  assert.strictEqual(L.csvCell('a,"b"'), '"a,""b"""');
  assert.strictEqual(L.csvCell("=SUM(A1)"), "'=SUM(A1)");
  const csv = L.toCsv([ev("a1", "2026-11-19T10:00:00Z", "x", { referrer: "=evil" })]);
  assert.ok(csv.split("\n")[0] === "at,site,visit_id,name,device,referrer");
  assert.ok(csv.indexOf("'=evil") > 0);
});
