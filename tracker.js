/* visit-tracker client script.
   Add to a site:  <script src="https://markplowwright.github.io/visit-tracker/tracker.js" data-site="lab" async></script>
   Sends only: a random visit id, the site label, an event name, the device type, and (on the page view) the
   referring site name and a country guessed from the browser time zone (no IP lookup). No cookies, no IP address stored, nothing typed. Call window.vtrack("name") for events.
   Skips: localhost and file pages, known bots, and any browser that opened a page with ?notrack (undo with ?track). */
(function () {
  "use strict";
  var URL_BASE = "https://yqhkupmeqteeitflhlwy.supabase.co";
  var KEY = "sb_publishable_stRjOx09cCoNWHcaVbPyYQ_4go085H6"; /* publishable key: it can only add events */
  var MAX_PER_VISIT = 300;
  var tag = document.currentScript;
  var site = String((tag && tag.getAttribute("data-site")) || "site").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 30);
  var sent = 0, memVisit = "";
  /* time zone to country: a rough guess from the browser, no IP address involved. Unknown zones send no country. */
  var TZ = {"America/New_York":"US","America/Chicago":"US","America/Denver":"US","America/Los_Angeles":"US","America/Phoenix":"US","America/Anchorage":"US","America/Honolulu":"US","America/Detroit":"US","America/Indiana/Indianapolis":"US","America/Boise":"US","America/Kentucky/Louisville":"US","America/Adak":"US","America/Juneau":"US","Pacific/Honolulu":"US","America/Indianapolis":"US","America/Louisville":"US","America/Toronto":"CA","America/Vancouver":"CA","America/Edmonton":"CA","America/Winnipeg":"CA","America/Halifax":"CA","America/St_Johns":"CA","America/Regina":"CA","America/Montreal":"CA","America/Moncton":"CA","America/Whitehorse":"CA","America/Mexico_City":"MX","America/Cancun":"MX","America/Monterrey":"MX","America/Tijuana":"MX","America/Merida":"MX","America/Chihuahua":"MX","America/Hermosillo":"MX","America/Mazatlan":"MX","America/Sao_Paulo":"BR","America/Manaus":"BR","America/Fortaleza":"BR","America/Recife":"BR","America/Bahia":"BR","America/Belem":"BR","America/Cuiaba":"BR","America/Campo_Grande":"BR","America/Argentina/Buenos_Aires":"AR","America/Buenos_Aires":"AR","America/Argentina/Cordoba":"AR","America/Bogota":"CO","America/Lima":"PE","America/Santiago":"CL","America/Caracas":"VE","America/Guayaquil":"EC","America/Montevideo":"UY","America/Santo_Domingo":"DO","America/Jamaica":"JM","America/Guatemala":"GT","America/Costa_Rica":"CR","America/Panama":"PA","America/La_Paz":"BO","America/Asuncion":"PY","America/Port_of_Spain":"TT","America/Port-au-Prince":"HT","America/El_Salvador":"SV","America/Tegucigalpa":"HN","America/Managua":"NI","America/Havana":"CU","America/Puerto_Rico":"PR","Europe/London":"GB","Europe/Dublin":"IE","Europe/Paris":"FR","Europe/Berlin":"DE","Europe/Busingen":"DE","Europe/Madrid":"ES","Europe/Rome":"IT","Europe/Amsterdam":"NL","Europe/Brussels":"BE","Europe/Zurich":"CH","Europe/Vienna":"AT","Europe/Stockholm":"SE","Europe/Oslo":"NO","Europe/Copenhagen":"DK","Europe/Helsinki":"FI","Europe/Warsaw":"PL","Europe/Lisbon":"PT","Europe/Athens":"GR","Europe/Prague":"CZ","Europe/Budapest":"HU","Europe/Bucharest":"RO","Europe/Sofia":"BG","Europe/Kyiv":"UA","Europe/Kiev":"UA","Europe/Istanbul":"TR","Europe/Moscow":"RU","Asia/Yekaterinburg":"RU","Asia/Novosibirsk":"RU","Asia/Vladivostok":"RU","Asia/Krasnoyarsk":"RU","Asia/Irkutsk":"RU","Europe/Minsk":"BY","Europe/Belgrade":"RS","Europe/Zagreb":"HR","Europe/Ljubljana":"SI","Europe/Bratislava":"SK","Europe/Vilnius":"LT","Europe/Riga":"LV","Europe/Tallinn":"EE","Europe/Luxembourg":"LU","Europe/Malta":"MT","Atlantic/Reykjavik":"IS","Europe/Sarajevo":"BA","Europe/Skopje":"MK","Europe/Tirane":"AL","Europe/Chisinau":"MD","Africa/Lagos":"NG","Africa/Cairo":"EG","Africa/Johannesburg":"ZA","Africa/Nairobi":"KE","Africa/Accra":"GH","Africa/Casablanca":"MA","Africa/Algiers":"DZ","Africa/Tunis":"TN","Africa/Addis_Ababa":"ET","Africa/Dar_es_Salaam":"TZ","Africa/Kampala":"UG","Africa/Kinshasa":"CD","Africa/Luanda":"AO","Africa/Abidjan":"CI","Africa/Dakar":"SN","Africa/Harare":"ZW","Africa/Lusaka":"ZM","Africa/Khartoum":"SD","Africa/Tripoli":"LY","Africa/Maputo":"MZ","Asia/Kolkata":"IN","Asia/Calcutta":"IN","Asia/Karachi":"PK","Asia/Dhaka":"BD","Asia/Colombo":"LK","Asia/Kathmandu":"NP","Asia/Katmandu":"NP","Asia/Shanghai":"CN","Asia/Urumqi":"CN","Asia/Hong_Kong":"HK","Asia/Taipei":"TW","Asia/Tokyo":"JP","Asia/Seoul":"KR","Asia/Singapore":"SG","Asia/Bangkok":"TH","Asia/Ho_Chi_Minh":"VN","Asia/Saigon":"VN","Asia/Jakarta":"ID","Asia/Makassar":"ID","Asia/Manila":"PH","Asia/Kuala_Lumpur":"MY","Asia/Dubai":"AE","Asia/Riyadh":"SA","Asia/Tehran":"IR","Asia/Baghdad":"IQ","Asia/Jerusalem":"IL","Asia/Tel_Aviv":"IL","Asia/Beirut":"LB","Asia/Amman":"JO","Asia/Kuwait":"KW","Asia/Qatar":"QA","Asia/Baku":"AZ","Asia/Tbilisi":"GE","Asia/Yerevan":"AM","Asia/Tashkent":"UZ","Asia/Almaty":"KZ","Asia/Kabul":"AF","Asia/Yangon":"MM","Asia/Rangoon":"MM","Asia/Phnom_Penh":"KH","Asia/Muscat":"OM","Asia/Ulaanbaatar":"MN","Australia/Sydney":"AU","Australia/Melbourne":"AU","Australia/Brisbane":"AU","Australia/Perth":"AU","Australia/Adelaide":"AU","Australia/Hobart":"AU","Australia/Darwin":"AU","Pacific/Auckland":"NZ","Pacific/Fiji":"FJ","Pacific/Guam":"GU"};

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
  function country() {
    try { return TZ[Intl.DateTimeFormat().resolvedOptions().timeZone] || null; } catch (e) { return null; }
  }
  function send(name, extra) {
    if (off || sent >= MAX_PER_VISIT) { return; }
    var n = clean(name);
    if (!n) { return; }
    sent += 1;
    var body = { visit_id: visitId(), site: site, name: n, device: device() };
    if (extra && extra.referrer) { body.referrer = extra.referrer; }
    if (extra && extra.country) { body.country = extra.country; }
    try {
      fetch(URL_BASE + "/rest/v1/events", {
        method: "POST", keepalive: true,
        headers: { "apikey": KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify(body)
      }).catch(function () {});
    } catch (e) {}
  }
  window.vtrack = function (name) { send(name); };
  send("pageview", { referrer: refHost(), country: country() });
})();
