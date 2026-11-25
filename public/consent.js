/* ============================================================
   Cookie choices
   The site sets no cookies. One optional thing exists: a statistics
   script from Cloudflare. It is loaded only after the visitor chooses
   Accept. A browser privacy signal counts as Reject: the banner is
   then not shown.

   The choice is kept in this browser's local storage, on this device,
   for twelve months. It is not a cookie and it never leaves the device.
   ============================================================ */
(function () {
  "use strict";

  // The site's public statistics token, from the Cloudflare dashboard. It is kept
  // here and not in the page, so that nothing in the page can start the
  // statistics script by itself.
  var TOKEN = "7428e594f9564a3b92b7845753d4ab2c";
  var KEY = "hcs-consent";
  var MONTHS = 12;
  var MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;
  var BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
  // The settings the host itself gave the statistics script while it was adding
  // that script to these pages. "version" matters: with it, the script reports to
  // this site's own address (/cdn-cgi/rum), which the host accepts. Without it,
  // the script reports to cloudflareinsights.com, which refuses reports from a
  // site that Cloudflare itself serves. (That address is for sites hosted
  // elsewhere.) The other two keep the measuring as the host had it.
  var BEACON_SETTINGS = { version: "2024.11.0", r: 1, spa: 2 };
  // A tag that would start the statistics script, however its settings are passed.
  var LIVE_TAG = 'script:not([type="text/plain"])[data-cf-beacon], script[src*="beacon"][src*="?token="]';

  var root = document.documentElement;
  var banner = document.getElementById("consent");
  var settingsButtons = document.querySelectorAll("[data-consent-settings]");
  if (!banner) return;

  // The pages ask the host not to add anything to them (see public/_headers).
  // That is what keeps the host's own statistics script out. This is the second
  // line of defence, for a page with such a tag anyway. The host writes its tag
  // at the end of the page, so it would run after this file: taken out here, it
  // never runs. Statistics then start from this file only.
  Array.prototype.forEach.call(document.querySelectorAll(LIVE_TAG), function (tag) {
    tag.remove();
  });

  var loaded = false;

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var choice = JSON.parse(raw);
      var validAt = choice && typeof choice.at === "string" && !isNaN(Date.parse(choice.at));
      return validAt && typeof choice.analytics === "boolean" ? choice : null;
    } catch (err) {
      // Storage may be blocked, or an old value may not be JSON.
      return null;
    }
  }

  function save(analytics) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ analytics: analytics, at: new Date().toISOString() }));
    } catch (err) {
      // Storage is blocked. The choice then lasts for this page only.
    }
  }

  // The saved choice, or null if there is none or it is too old to rely on.
  function current() {
    var choice = read();
    if (!choice) return null;
    return Date.now() - Date.parse(choice.at) < MONTHS * MS_PER_MONTH ? choice : null;
  }

  function loadStatistics() {
    if (loaded) return;
    loaded = true;
    var script = document.createElement("script");
    script.setAttribute("data-cf-beacon", JSON.stringify(Object.assign({ token: TOKEN }, BEACON_SETTINGS)));
    script.src = BEACON_SRC;
    document.body.appendChild(script);
  }

  // The stylesheet gives the footer room for the banner while a choice is waiting,
  // so the banner never covers its last lines. Nothing is measured here.
  function show(focusIt) {
    banner.hidden = false;
    root.classList.add("consent-pending");
    if (focusIt) {
      var first = banner.querySelector("[data-consent]");
      if (first) first.focus();
    }
  }

  function hide() {
    banner.hidden = true;
    root.classList.remove("consent-pending");
  }

  function decide(analytics) {
    save(analytics);
    if (analytics) loadStatistics();
    hide();
    // The button that was just pressed is hidden now. Put focus on the link
    // that brings the banner back, so a keyboard user is not left nowhere.
    // Without scrolling: a visitor at the top of the page must stay there.
    var back = settingsButtons[0];
    if (back) back.focus({ preventScroll: true });
  }

  banner.addEventListener("click", function (event) {
    var button = event.target.closest("[data-consent]");
    if (!button) return;
    decide(button.getAttribute("data-consent") === "accept");
  });

  Array.prototype.forEach.call(settingsButtons, function (button) {
    button.addEventListener("click", function (event) {
      // This may be a link. Jumping would only reach the hidden banner.
      event.preventDefault();
      show(true);
    });
  });

  // A browser-wide privacy signal counts as a no. No banner then: the visitor
  // has already answered in their browser settings. "Cookie settings" still works.
  if (navigator.globalPrivacyControl === true) return;

  var choice = current();
  if (!choice) {
    // Nothing optional loads until the visitor has answered.
    show(false);
    return;
  }
  if (choice.analytics) loadStatistics();
})();
