/* visit-tracker client script.
   Add to a site:  <script src="https://markplowwright.github.io/visit-tracker/tracker.js" data-site="lab" async></script>
   Sends only: a random visit id, the site label, an event name, the device type, and (on the page view) the
   referring site name. No cookies, no IP address stored, nothing typed. Call window.vtrack("name") for events.
   Skips: localhost and file pages, known bots, and any browser that opened a page with ?notrack (undo with ?track). */
(function () {
  "use strict";
  var URL_BASE = "https://yqhkupmeqteeitflhlwy.supabase.co";
  var KEY = "sb_publishable_stRjOx09cCoNWHcaVbPyYQ_4go085H6"; /* publishable key: it can only add events */
  var MAX_PER_VISIT = 300;
  var tag = document.currentScript;
  var site = String((tag && tag.getAttribute("data-site")) || "site").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 30);
  var sent = 0, memVisit = "";

  function flags() {
    try {
      var q = location.search;
      if (/[?&]notrack(=|&|$)/.test(q)) { localStorage.setItem("vt_off", "1"); }
      if (/[?&]track(=|&|$)/.test(q)) { localStorage.removeItem("vt_off"); }
      return localStorage.getItem("vt_off") === "1";
    } catch (e) { return false; }
  }
  function isBot() {
    var ua = navigator.userAgent || "";
    return !!navigator.webdriver || /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|telegram|discord|pingdom|monitor/i.test(ua);
  }
  function isLocal() {
    var h = location.hostname;
    return location.protocol === "file:" || h === "" || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /\.localhost$/.test(h);
  }
  var off = flags() || isBot() || isLocal();

  function visitId() {
    try {
      var v = sessionStorage.getItem("vt_visit");
      if (v) { return v; }
      v = rand(); sessionStorage.setItem("vt_visit", v); return v;
    } catch (e) { if (!memVisit) { memVisit = rand(); } return memVisit; }
  }
  function rand() {
    var a = new Uint8Array(8), s = "";
    if (window.crypto && crypto.getRandomValues) { crypto.getRandomValues(a); } else { for (var i = 0; i < 8; i++) { a[i] = Math.floor(Math.random() * 256); } }
    for (var j = 0; j < a.length; j++) { s += ("0" + a[j].toString(16)).slice(-2); }
    return s;
  }
  function clean(name) {
    var n = String(name || "").toLowerCase().replace(/[^a-z0-9/._:-]+/g, "-").replace(/^[^a-z0-9]+/, "").slice(0, 120);
    return n;
  }
  function device() {
    var w = window.innerWidth || 1024;
    return w <= 520 ? "phone" : (w <= 1024 ? "tablet" : "desktop");
  }
  function refHost() {
    try {
      if (!document.referrer) { return null; }
      var h = new URL(document.referrer).hostname.replace(/^www\./, "");
      return h && h !== location.hostname ? h.slice(0, 100) : null;
    } catch (e) { return null; }
  }
  function send(name, extra) {
    if (off || sent >= MAX_PER_VISIT) { return; }
    var n = clean(name);
    if (!n) { return; }
    sent += 1;
    var body = { visit_id: visitId(), site: site, name: n, device: device() };
    if (extra && extra.referrer) { body.referrer = extra.referrer; }
    try {
      fetch(URL_BASE + "/rest/v1/events", {
        method: "POST", keepalive: true,
        headers: { "apikey": KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) {}
  }
  window.vtrack = function (name) { send(name); };
  send("pageview", { referrer: refHost() });
})();
