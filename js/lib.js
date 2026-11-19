/* Pure data helpers for the dashboard (no page access, so they can be tested). */
(function (root) {
  "use strict";
  function dayKey(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function count(map) { return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); }); }
  function addTo(map, key, id) { if (!map[key]) { map[key] = {}; } map[key][id] = 1; }
  function sizes(map) { var o = {}; Object.keys(map).forEach(function (k) { o[k] = Object.keys(map[k]).length; }); return o; }

  function summarize(events) {
    var visits = {}, names = {}, daily = {}, refs = {}, devs = {}, ctry = {}, started = {}, done = {}, pageviews = 0;
    events.forEach(function (e) {
      var v = visits[e.visit_id];
      if (!v) { v = visits[e.visit_id] = { id: e.visit_id, site: e.site, device: e.device || "", referrer: null, country: null, first: e.at, last: e.at, events: [] }; }
      v.events.push({ at: e.at, name: e.name });
      if (e.at < v.first) { v.first = e.at; }
      if (e.at > v.last) { v.last = e.at; }
      if (e.name === "pageview") {
        pageviews += 1;
        if (e.referrer && !v.referrer) { v.referrer = e.referrer; }
        if (e.device && !v.device) { v.device = e.device; }
        if (e.country && !v.country) { v.country = e.country; }
      } else {
        names[e.name] = (names[e.name] || 0) + 1;
      }
      var m;
      if ((m = /^ticket\/(.+)-started$/.exec(e.name))) { addTo(started, "ticket/" + m[1], e.visit_id); }
      else if ((m = /^ticket\/(.+)-resolved$/.exec(e.name))) { addTo(done, "ticket/" + m[1], e.visit_id); }
      else if ((m = /^mission\/(.+)-started$/.exec(e.name))) { addTo(started, "mission/" + m[1], e.visit_id); }
      else if ((m = /^mission\/(.+)-finished$/.exec(e.name))) { addTo(done, "mission/" + m[1], e.visit_id); }
    });
    var list = Object.keys(visits).map(function (k) { return visits[k]; });
    list.forEach(function (v) {
      v.events.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
      addTo(daily, dayKey(v.first), v.id);
      addTo(refs, v.referrer || "(direct)", v.id);
      addTo(devs, v.device || "(unknown)", v.id);
      addTo(ctry, v.country || "(unknown)", v.id);
    });
    list.sort(function (a, b) { return a.first < b.first ? 1 : -1; });
    var s = sizes(started), d = sizes(done);
    var funnel = Object.keys(s).map(function (k) { return { key: k, started: s[k], finished: d[k] || 0 }; })
      .sort(function (a, b) { return b.started - a.started || (a.key < b.key ? -1 : 1); });
    var finishedTotal = 0, startedTotal = 0;
    funnel.forEach(function (f) { if (/^ticket\//.test(f.key)) { startedTotal += f.started; finishedTotal += f.finished; } });
    return {
      visitCount: list.length, pageviews: pageviews,
      eventCount: events.length - pageviews,
      top: count(names), daily: sizes(daily), referrers: count(sizes(refs)), devices: count(sizes(devs)), countries: count(sizes(ctry)),
      funnel: funnel, ticketsStarted: startedTotal, ticketsFinished: finishedTotal, visits: list
    };
  }

  function csvCell(v) {
    var s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) { s = "'" + s; }
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv(events) {
    var head = ["at", "site", "visit_id", "name", "device", "referrer", "country"];
    return [head.join(",")].concat(events.map(function (e) { return head.map(function (h) { return csvCell(e[h]); }).join(","); })).join("\n") + "\n";
  }
  function lastDays(map, days, now) {
    var out = [], base = new Date(now || Date.now());
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      var k = dayKey(d.toISOString());
      out.push({ day: k, n: map[k] || 0 });
    }
    return out;
  }
  var lib = { dayKey: dayKey, summarize: summarize, toCsv: toCsv, csvCell: csvCell, lastDays: lastDays };
  if (typeof module !== "undefined" && module.exports) { module.exports = lib; } else { root.VTLib = lib; }
})(typeof window !== "undefined" ? window : this);
