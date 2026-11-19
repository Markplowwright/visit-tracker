"use strict";
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM, VirtualConsole } = require("jsdom");

const src = fs.readFileSync(path.join(__dirname, "..", "tracker.js"), "utf8");

function boot(url, opts) {
  opts = opts || {};
  const calls = [];
  const cfg = {
    url: url, runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
    beforeParse: function (w) {
      w.fetch = function (u, o) { calls.push({ url: u, opts: o, body: JSON.parse(o.body) }); return Promise.resolve({}); };
      Object.defineProperty(w.navigator, "userAgent", { value: opts.ua || "Mozilla/5.0 (Macintosh) Chrome/150 Safari/537.36" });
      if (opts.webdriver) { Object.defineProperty(w.navigator, "webdriver", { value: true }); }
    }
  };
  if (opts.referrer) { cfg.referrer = opts.referrer; }
  const dom = new JSDOM("<!doctype html><html><body></body></html>", cfg);
  const d = dom.window.document, sc = d.createElement("script");
  sc.setAttribute("data-site", "lab"); sc.textContent = src; d.body.appendChild(sc); /* inline script, so currentScript is set */
  return { w: dom.window, calls: calls };
}

test("sends a page view with site, visit id and device only", function () {
  const t = boot("https://markplowwright.github.io/", { referrer: "https://www.linkedin.com/feed/" });
  assert.strictEqual(t.calls.length, 1);
  const b = t.calls[0].body;
  assert.strictEqual(b.name, "pageview");
  assert.strictEqual(b.site, "lab");
  assert.match(b.visit_id, /^[a-z0-9]{8,32}$/);
  assert.ok(["desktop", "phone", "tablet"].includes(b.device));
  assert.strictEqual(b.referrer, "linkedin.com");
  assert.deepStrictEqual(Object.keys(b).sort(), ["device", "name", "referrer", "site", "visit_id"]);
  assert.strictEqual(t.calls[0].opts.headers.Prefer, "return=minimal");
});

test("vtrack cleans the event name and keeps the same visit id", function () {
  const t = boot("https://markplowwright.github.io/");
  t.w.vtrack("Screen/Intune Home!");
  assert.strictEqual(t.calls[1].body.name, "screen/intune-home-");
  assert.strictEqual(t.calls[1].body.visit_id, t.calls[0].body.visit_id);
  assert.ok(!("referrer" in t.calls[1].body));
});

test("sends nothing on localhost, for bots, or after ?notrack", function () {
  assert.strictEqual(boot("http://localhost:8765/").calls.length, 0);
  assert.strictEqual(boot("https://markplowwright.github.io/", { ua: "Mozilla/5.0 (compatible; LinkedInBot/1.0)" }).calls.length, 0);
  assert.strictEqual(boot("https://markplowwright.github.io/", { webdriver: true }).calls.length, 0);
  const t = boot("https://markplowwright.github.io/?notrack");
  assert.strictEqual(t.calls.length, 0);
  t.w.vtrack("x/y");
  assert.strictEqual(t.calls.length, 0);
  assert.strictEqual(t.w.localStorage.getItem("vt_off"), "1");
});

test("caps events per visit", function () {
  const t = boot("https://markplowwright.github.io/");
  for (let i = 0; i < 400; i++) { t.w.vtrack("loop/x"); }
  assert.strictEqual(t.calls.length, 300);
});
