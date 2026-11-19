(function () {
  "use strict";
  var BASE = "https://yqhkupmeqteeitflhlwy.supabase.co";
  var KEY = "sb_publishable_stRjOx09cCoNWHcaVbPyYQ_4go085H6"; /* publishable key: safe in a page, reads still need a login */
  var SK = "vt_session";
  var PAGE = 1000, MAX_PAGES = 50;
  var data = [], summary = null, picked = "";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function show(id, on) { $(id).classList.toggle("hidden", !on); }

  /* ---------- session ---------- */
  function getSess() { try { return JSON.parse(localStorage.getItem(SK) || "null"); } catch (e) { return null; } }
  function setSess(s) { try { if (s) { localStorage.setItem(SK, JSON.stringify(s)); } else { localStorage.removeItem(SK); } } catch (e) {} }
  function authFetch(path, body) {
    return fetch(BASE + "/auth/v1/" + path, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function keep(j) { setSess({ access: j.access_token, refresh: j.refresh_token }); }
  function refresh() {
    var s = getSess();
    if (!s || !s.refresh) { return Promise.reject(new Error("no session")); }
    return authFetch("token?grant_type=refresh_token", { refresh_token: s.refresh }).then(function (r) {
      if (!r.ok) { setSess(null); throw new Error("expired"); }
      keep(r.j);
    });
  }

  /* ---------- data ---------- */
  function page(from, sinceIso, retried) {
    var s = getSess();
    var url = BASE + "/rest/v1/events?select=visit_id,site,name,at,referrer,device,country&at=gte." + encodeURIComponent(sinceIso) + "&order=at.asc";
    return fetch(url, { headers: { apikey: KEY, Authorization: "Bearer " + (s ? s.access : ""), "Range-Unit": "items", Range: from + "-" + (from + PAGE - 1) } })
      .then(function (r) {
        if (r.status === 401 && !retried) { return refresh().then(function () { return page(from, sinceIso, true); }); }
        if (!r.ok && r.status !== 206) { throw new Error("read failed (" + r.status + ")"); }
        return r.json();
      });
  }
  function loadAll(sinceIso) {
    var all = [], n = 0;
    function next(from) {
      return page(from, sinceIso).then(function (rows) {
        all = all.concat(rows); n += 1;
        if (rows.length === PAGE && n < MAX_PAGES) { return next(from + PAGE); }
        return { rows: all, capped: rows.length === PAGE };
      });
    }
    return next(0);
  }

  /* ---------- render ---------- */
  function bars(box, rows, max, label) {
    box.textContent = "";
    if (!rows.length) { box.appendChild(el("p", "empty", "Nothing yet.")); return; }
    rows.forEach(function (r) {
      var line = el("div", "br");
      line.appendChild(el("span", "nm", r[0]));
      var tr = el("span", "tr"), fl = el("span", "fl"); fl.style.width = Math.max(2, Math.round(r[1] / max * 100)) + "%";
      tr.appendChild(fl); line.appendChild(tr);
      line.appendChild(el("span", "ct", String(r[1])));
      box.appendChild(line);
    });
  }
  function kpi(l, v, n) { var c = el("div", "card kpi"); c.appendChild(el("div", "l", l)); c.appendChild(el("div", "v", v)); c.appendChild(el("div", "n", n)); return c; }
  function fmtDur(a, b) { var s = Math.round((new Date(b) - new Date(a)) / 1000); return s < 60 ? s + " s" : Math.round(s / 60) + " min"; }
  function evClass(n) { return /-(resolved|finished)$/.test(n) ? "ok" : /^(hint|ticket\/.+-reset)/.test(n) ? "warn" : ""; }

  function render() {
    var site = $("site").value;
    var rows = site ? data.filter(function (e) { return e.site === site; }) : data;
    summary = VTLib.summarize(rows);
    var k = $("kpis"); k.textContent = "";
    var fin = summary.ticketsStarted ? Math.round(summary.ticketsFinished / summary.ticketsStarted * 100) + "%" : "-";
    k.appendChild(kpi("Visits", String(summary.visitCount), "distinct visit IDs"));
    k.appendChild(kpi("Page views", String(summary.pageviews), "loads of a page"));
    k.appendChild(kpi("Events", String(summary.eventCount), "clicks and actions"));
    k.appendChild(kpi("Tickets finished", fin, summary.ticketsFinished + " of " + summary.ticketsStarted + " started"));

    var days = Number($("range").value) || 7;
    var series = VTLib.lastDays(summary.daily, days);
    var mx = Math.max.apply(null, series.map(function (s) { return s.n; }).concat([1]));
    var tr = $("trend"); tr.textContent = "";
    series.forEach(function (s) { var c = el("div", "col"); c.style.height = Math.max(2, Math.round(s.n / mx * 100)) + "%"; c.title = s.day + ": " + s.n; tr.appendChild(c); });
    var ax = $("axis"); ax.textContent = ""; ax.appendChild(el("span", "", series[0].day)); ax.appendChild(el("span", "", "peak " + mx)); ax.appendChild(el("span", "", series[series.length - 1].day));

    var top = summary.top.slice(0, 10);
    bars($("top"), top, top.length ? top[0][1] : 1);
    var fb = $("funnel"); fb.textContent = "";
    if (!summary.funnel.length) { fb.appendChild(el("p", "empty", "Nothing yet.")); }
    summary.funnel.slice(0, 10).forEach(function (f) {
      var pct = f.started ? Math.round(f.finished / f.started * 100) : 0;
      var line = el("div", "br"); line.appendChild(el("span", "nm", f.key));
      var t = el("span", "tr"), fl = el("span", "fl " + (pct >= 40 ? "ok" : "warn")); fl.style.width = Math.max(2, pct) + "%"; t.appendChild(fl); line.appendChild(t);
      line.appendChild(el("span", "ct", f.finished + "/" + f.started)); fb.appendChild(line);
    });
    var rf = summary.referrers.slice(0, 6), dv = summary.devices;
    bars($("refs"), rf, rf.length ? rf[0][1] : 1);
    bars($("devs"), dv, dv.length ? dv[0][1] : 1);
    var cy = summary.countries.slice(0, 8);
    bars($("ctry"), cy, cy.length ? cy[0][1] : 1);

    var vl = $("visits"); vl.textContent = "";
    if (!summary.visits.length) { vl.appendChild(el("p", "empty", "No visits in this range.")); }
    summary.visits.slice(0, 100).forEach(function (v) {
      var b = el("button", "vb" + (v.id === picked ? " on" : "")); b.type = "button";
      var t = el("span", "t"); t.appendChild(el("span", "", v.id)); t.appendChild(el("span", "", v.site)); b.appendChild(t);
      b.appendChild(el("span", "m", [v.device || "unknown device", v.country || "country unknown", v.referrer ? "from " + v.referrer : "direct", new Date(v.first).toLocaleString(), v.events.length + " events"].join(" - ")));
      b.addEventListener("click", function () { picked = v.id; render(); });
      vl.appendChild(b);
    });
    var cur = summary.visits.filter(function (v) { return v.id === picked; })[0] || summary.visits[0];
    var jr = $("journey"); jr.textContent = ""; $("jhead").textContent = "";
    if (cur) {
      $("jhead").textContent = cur.id + " - " + cur.site + " - " + fmtDur(cur.first, cur.last);
      cur.events.forEach(function (e) {
        var li = el("li"); var secs = Math.round((new Date(e.at) - new Date(cur.first)) / 1000);
        li.appendChild(el("span", "at", Math.floor(secs / 60) + ":" + ("0" + (secs % 60)).slice(-2)));
        li.appendChild(el("span", "dot " + evClass(e.name))); li.appendChild(el("span", "", e.name)); jr.appendChild(li);
      });
    }
  }

  function sites() {
    var s = {}; data.forEach(function (e) { s[e.site] = 1; });
    var sel = $("site"), keep = sel.value; sel.textContent = "";
    var all = el("option", "", "All sites"); all.value = ""; sel.appendChild(all);
    Object.keys(s).sort().forEach(function (x) { var o = el("option", "", x); o.value = x; sel.appendChild(o); });
    sel.value = s[keep] ? keep : "";
  }

  function load() {
    $("status").textContent = "Loading...";
    var since = new Date(Date.now() - Number($("range").value) * 86400000).toISOString();
    loadAll(since).then(function (res) {
      data = res.rows; sites(); render();
      $("status").textContent = data.length + " rows loaded" + (res.capped ? " (limit reached: showing the oldest " + data.length + ")" : "");
    }).catch(function (err) {
      if (String(err.message) === "expired" || String(err.message) === "no session") { start(); return; }
      $("status").textContent = "Could not load: " + err.message;
    });
  }

  function start() {
    if (getSess()) { show("login", false); show("app", true); load(); } else { show("app", false); show("login", true); }
  }

  $("loginForm").addEventListener("submit", function (ev) {
    ev.preventDefault(); $("loginErr").textContent = "";
    authFetch("token?grant_type=password", { email: $("email").value.trim(), password: $("password").value }).then(function (r) {
      if (!r.ok) { $("loginErr").textContent = "Sign in failed. Check the email and password."; return; }
      keep(r.j); $("password").value = ""; start();
    }).catch(function () { $("loginErr").textContent = "Could not reach the server."; });
  });
  $("range").addEventListener("change", load);
  $("site").addEventListener("change", function () { picked = ""; render(); });
  $("refresh").addEventListener("click", load);
  $("out").addEventListener("click", function () { setSess(null); data = []; start(); });
  $("csv").addEventListener("click", function () {
    var site = $("site").value, rows = site ? data.filter(function (e) { return e.site === site; }) : data;
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([VTLib.toCsv(rows)], { type: "text/csv" }));
    a.download = "visit-tracker-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  start();
})();
