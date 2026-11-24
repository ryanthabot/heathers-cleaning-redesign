/* ============================================================
   Heather's Cleaning Services — interactions
   - Header state + mobile menu
   - Hero "squeegee" reveal
   - Scroll reveal for sections and the checklist ticks
   - Pricing: home-size picker
   - Mobile action bar (call + quote)
   - Quote form: POST to api/inquiry (a Cloudflare Worker in src/ that
     relays through Resend); falls back to a mailto: link on any failure.
   ============================================================ */

(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PHONE = "(905) 904-1566";
  var TEL = "tel:+19059041566";
  var INBOX = "heatherbond2024@hotmail.com";

  /* ---------- Header state + mobile menu ---------- */
  var header = $(".site-header");
  var navToggle = $("#nav-toggle");
  var nav = $("#site-nav");

  function setMenu(open) {
    header.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
    updateBar();
  }

  if (header && navToggle && nav) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    navToggle.addEventListener("click", function () {
      setMenu(navToggle.getAttribute("aria-expanded") !== "true");
    });

    // Close after choosing a link, or on Escape
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setMenu(false);
        navToggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1000 && header.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ---------- Hero: squeegee reveal ---------- */
  var wipe = $("#hero-wipe");
  var heroImg = $("#hero-img");
  var haze = wipe && $(".wipe-haze", wipe);

  if (wipe && heroImg && haze) {
    var reveal = function () {
      wipe.classList.add("is-ready");
    };
    if (reduceMotion) {
      reveal();
    } else {
      var start = function () {
        // Two frames so the clean photo is painted beneath the haze before the wipe begins
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            haze.style.backgroundImage = 'url("' + (heroImg.currentSrc || heroImg.src) + '")';
            reveal();
          });
        });
      };
      if (heroImg.complete && heroImg.naturalWidth) start();
      else {
        heroImg.addEventListener("load", start, { once: true });
        heroImg.addEventListener("error", reveal, { once: true });
      }
    }
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = $$(".rv");
  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Pricing: home-size picker ---------- */
  var picker = $("#size-picker");
  var priceOnce = $("#price-once");
  var priceBiweekly = $("#price-biweekly");
  var sizeButtons = picker ? $$(".size-btn", picker) : [];

  function chooseSize(btn) {
    sizeButtons.forEach(function (b) {
      var active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    priceOnce.textContent = btn.getAttribute("data-once");
    priceBiweekly.textContent = btn.getAttribute("data-biweekly");
  }

  if (picker && sizeButtons.length) {
    picker.addEventListener("click", function (e) {
      var btn = e.target.closest(".size-btn");
      if (btn && !btn.classList.contains("is-active")) chooseSize(btn);
    });
    // Left / Right arrows move between sizes
    picker.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var current = sizeButtons.indexOf(document.activeElement);
      if (current === -1) return;
      e.preventDefault();
      var dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      var next = sizeButtons[(current + dir + sizeButtons.length) % sizeButtons.length];
      chooseSize(next);
      next.focus();
    });
  }

  /* ---------- Mobile action bar ---------- */
  // Shown whenever the hero's main button is not fully on screen (and the quote
  // form isn't already in view), so a call/quote is always one tap away.
  var bar = $("#mobile-bar");
  var heroCta = $(".hero-actions .btn-primary");
  var contact = $("#contact");
  var ctaOffScreen = false;
  var onContact = false;

  function updateBar() {
    if (!bar) return;
    var menuOpen = header && header.classList.contains("is-open");
    bar.classList.toggle("is-shown", ctaOffScreen && !onContact && !menuOpen);
  }

  if (bar && heroCta && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) { ctaOffScreen = !entries[0].isIntersecting; updateBar(); },
      { threshold: 1 }
    ).observe(heroCta);

    new IntersectionObserver(
      function (entries) { onContact = entries[0].isIntersecting; updateBar(); },
      { threshold: 0.12 }
    ).observe(contact);
  }

  /* ---------- Quote form ---------- */
  var form = $("#quote-form");

  if (form) {
    var phoneInput = $("#phone");
    var emailInput = $("#email");
    var errorBox = $("#form-error");

    var showReachError = function (show) {
      if (errorBox) errorBox.hidden = !show;
      [phoneInput, emailInput].forEach(function (input) {
        input.setAttribute("aria-invalid", String(show));
        if (show) input.classList.add("is-invalid"); else input.classList.remove("is-invalid");
      });
    };

    [phoneInput, emailInput].forEach(function (input) {
      input.addEventListener("input", function () { showReachError(false); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Browser-level checks first (name is required, email must be well-formed)
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var value = function (name) {
        var el = form.elements[name];
        return el ? el.value.trim() : "";
      };

      // We need at least one way to answer
      if (!value("phone") && !value("email")) {
        showReachError(true);
        phoneInput.focus();
        return;
      }

      var data = {
        name: value("name"),
        phone: value("phone"),
        email: value("email"),
        home_size: value("home_size"),
        service: value("service"),
        message: value("message"),
        website: value("website") // honeypot — people never see or fill this
      };

      // Honeypot tripped: pretend it worked, send nothing
      if (data.website) {
        form.replaceChildren(successPanel());
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Sending…";

      var mailtoFallback = function () {
        var subject = "Cleaning quote request — " + (data.name || "new client");
        var lines = [
          "Name: " + data.name,
          "Phone: " + data.phone,
          "Email: " + data.email,
          "Home size: " + data.home_size,
          "Service: " + data.service,
          "",
          "Message:",
          data.message
        ].join("\n");
        window.location.href = "mailto:" + INBOX +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(lines);
        btn.disabled = false;
        btn.textContent = "Request my free quote";
      };

      fetch("api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (json) {
          if (!json || json.ok === false) throw new Error("rejected");
          form.replaceChildren(successPanel());
        })
        .catch(mailtoFallback);
    });
  }

  function successPanel() {
    var wrap = document.createElement("div");
    wrap.className = "form-success";
    wrap.setAttribute("role", "status");
    wrap.innerHTML =
      '<span class="form-success-icon" aria-hidden="true"><svg class="icon"><use href="#i-check"></use></svg></span>' +
      "<h3>Request received</h3>" +
      "<p>Thanks — we\u2019ll be in touch to confirm your rate and a time that works.</p>" +
      "<p>Prefer to talk? <a href=\"" + TEL + "\">" + PHONE + "</a></p>";
    return wrap;
  }
})();
