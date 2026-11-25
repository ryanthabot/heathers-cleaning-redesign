/* ============================================================
   Cookie choices
   The site sets no cookies. One optional thing exists: a statistics
   script from Cloudflare. It is loaded only after the visitor chooses
   Accept, and it is never loaded when the browser sends a privacy
   signal that says no.

   The choice is kept in this browser's local storage, on this device,
   for twelve months. It is not a cookie and it never leaves the device.
   ============================================================ */(function () {
  "use strict";

  var KEY = "hcs-consent";
  var MONTHS = 12;
  var MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;
  var BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

  var root = document.documentElement;
  var banner = document.getElementById("consent");
  // The inert tag in the page that holds the site's public statistics token.
  var hold = document.querySelector('script[type="text/plain"][data-cf-beacon]');
  var settingsButtons = document.querySelectorAll("[data-consent-settings]");
  if (!banner || !hold) return;

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
    var config;
    try {
      config = JSON.parse(hold.getAttribute("data-cf-beacon") || "null");
    } catch (err) {
      config = null;
    }
    if (!config || !config.token) return;
    var script = document.createElement("script");
    script.setAttribute("data-cf-beacon", JSON.stringify({ token: config.token }));
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
