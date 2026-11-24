/* ============================================================
   Heather's Cleaning Services — page behaviour
   - Header state + mobile menu
   - Hero "squeegee" reveal
   - Scroll reveal for sections and the checklist ticks
   - Pricing: home-size picker
   - Quote form: live price estimate, then POST to api/inquiry (a
     Cloudflare Worker that emails the request through Resend).
     Falls back to opening the visitor's email app on any failure.
   Prices come from pricing.js, the same file the Worker reads.
   ============================================================ */

import { BUSINESS, STANDARD_CLEAN, service, estimate } from "./pricing.js";

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Header state + mobile menu ---------- */
const header = $(".site-header");
const navToggle = $("#nav-toggle");
const nav = $("#site-nav");

function setMenu(open) {
  header.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.style.overflow = open ? "hidden" : "";
  updateBar();
}

if (header && navToggle && nav) {
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener("click", () => {
    setMenu(navToggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("is-open")) {
      setMenu(false);
      navToggle.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1000 && header.classList.contains("is-open")) setMenu(false);
  });
}

/* ---------- Hero: squeegee reveal ---------- */
const wipe = $("#hero-wipe");
const heroImg = $("#hero-img");
const haze = wipe && $(".wipe-haze", wipe);

if (wipe && heroImg && haze) {
  const reveal = () => wipe.classList.add("is-ready");

  if (reduceMotion) {
    reveal();
  } else {
    const start = () => {
      // Two frames so the clean photo is painted beneath the haze before the wipe begins
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          haze.style.backgroundImage = `url("${heroImg.currentSrc || heroImg.src}")`;
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
const revealEls = $$(".rv");
if (!("IntersectionObserver" in window) || reduceMotion) {
  revealEls.forEach((el) => el.classList.add("is-in"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

/* ---------- Pricing: home-size picker ---------- */
const picker = $("#size-picker");
const priceOnce = $("#price-once");
const priceBiweekly = $("#price-biweekly");
const sizeButtons = picker ? $$(".size-btn", picker) : [];

function chooseSize(btn) {
  const rates = STANDARD_CLEAN[btn.getAttribute("data-size")];
  if (!rates) return;
  sizeButtons.forEach((b) => {
    const active = b === btn;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  priceOnce.textContent = rates.once;
  priceBiweekly.textContent = rates.biweekly;
}

if (picker && sizeButtons.length) {
  picker.addEventListener("click", (e) => {
    const btn = e.target.closest(".size-btn");
    if (btn && !btn.classList.contains("is-active")) chooseSize(btn);
  });
  picker.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const current = sizeButtons.indexOf(document.activeElement);
    if (current === -1) return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = sizeButtons[(current + dir + sizeButtons.length) % sizeButtons.length];
    chooseSize(next);
    next.focus();
  });
  // Put the figures in step with pricing.js (the page shows default numbers without JavaScript)
  const initiallyActive = picker.querySelector(".size-btn.is-active");
  if (initiallyActive) chooseSize(initiallyActive);
}

/* ---------- Quote form ---------- */
const form = $("#quote-form");

// A local preview has no server behind it, so the form can't send from there.
const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

if (form) {
  const homeSizeSelect = $("#home_size");
  const serviceSelect = $("#service");
  const frequencySelect = $("#frequency");
  const frequencyRow = $("#frequency-row");
  const estimateBox = $("#estimate");
  const estimateFigure = $("#estimate-figure");
  const estimateDetail = $("#estimate-detail");

  const value = (name) => {
    const el = form.elements[name];
    return el ? el.value.trim() : "";
  };

  /* A range such as "$125 to $150" is wider than a phone, so the figure's size
     steps down until it fits on one line. A single price keeps the full size. */
  const FIT_STEPS = 3;
  const fitsOnOneLine = () => {
    const { height } = estimateFigure.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(estimateFigure).lineHeight);
    // Rounded, because the yellow mark adds a hair of padding under the text.
    return Math.round(height / lineHeight) <= 1;
  };
  const fitFigure = () => {
    delete estimateFigure.dataset.fit;
    if (!estimateBox.classList.contains("is-set")) return;
    for (let step = 1; step <= FIT_STEPS && !fitsOnOneLine(); step += 1) {
      estimateFigure.dataset.fit = String(step);
    }
  };
  window.addEventListener("resize", fitFigure);
  // The headline font is wider than the stand-in the browser uses first, so the
  // figure can start on one line and wrap when the real font arrives.
  if (document.fonts) {
    document.fonts.ready.then(fitFigure);
    document.fonts.addEventListener("loadingdone", fitFigure);
  }

  /* The estimate: reworked out whenever a choice changes. */
  const updateEstimate = () => {
    const isStandardClean = serviceSelect.value === "standard";
    frequencyRow.hidden = !isStandardClean;
    if (!isStandardClean) frequencySelect.value = "";

    const est = estimate(serviceSelect.value, homeSizeSelect.value, frequencySelect.value);
    estimateBox.classList.toggle("is-set", Boolean(est));
    if (!est) {
      estimateFigure.classList.remove("is-highlighted");
      estimateFigure.textContent = "Choose your home size and service";
      estimateDetail.textContent = "Your price appears here before you send.";
      return;
    }
    estimateFigure.classList.toggle("is-highlighted", est.highlight);
    estimateFigure.textContent = est.headline;
    estimateDetail.textContent = est.description;
    fitFigure();
  };

  [homeSizeSelect, serviceSelect, frequencySelect].forEach((el) => {
    el.addEventListener("change", updateEstimate);
  });
  updateEstimate();

  /* "Get a free quote" buttons carry the visitor's choice down into the form. */
  $$("a[data-quote-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const chosen = service(link.getAttribute("data-quote-service"));
      if (chosen) serviceSelect.value = chosen.id;
      if (link.hasAttribute("data-quote-size")) {
        const active = picker && picker.querySelector(".size-btn.is-active");
        if (active) homeSizeSelect.value = active.getAttribute("data-size");
      }
      updateEstimate();
    });
  });

  const setFoot = (text) => {
    const foot = form.querySelector(".form-foot");
    if (foot) foot.textContent = text;
  };

  // `copySent` is false when the server could not email the visitor their copy.
  const showReceived = (email, copySent) => {
    const wrap = document.createElement("div");
    wrap.className = "form-success";
    wrap.setAttribute("role", "status");

    const icon = document.createElement("span");
    icon.className = "form-success-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg class="icon"><use href="#i-check"></use></svg>';

    const title = document.createElement("h3");
    title.textContent = "Request received";

    const copy = document.createElement("p");
    if (copySent) {
      copy.append("Thanks. We've emailed a copy of your request, with your estimated price, to ");
      copy.append(email);          // typed by the visitor, so added as text, never as markup
      copy.append(". We'll be in touch to confirm your price and a time that works.");
    } else {
      copy.append("Thanks. We've received your request, and we'll be in touch to confirm your price and a time that works.");
    }

    const call = document.createElement("p");
    call.append("Prefer to talk? ");
    const link = document.createElement("a");
    link.href = BUSINESS.phoneHref;
    link.textContent = BUSINESS.phone;
    call.append(link);

    wrap.append(icon, title, copy, call);
    form.replaceChildren(wrap);
  };

  const mailtoFallback = (data) => {
    const lines = [
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Email: ${data.email}`,
      `Home size: ${homeSizeSelect.options[homeSizeSelect.selectedIndex].text}`,
      `Service: ${serviceSelect.options[serviceSelect.selectedIndex].text}`,
    ];
    if (data.frequency) lines.push(`How often: ${frequencySelect.options[frequencySelect.selectedIndex].text}`);
    lines.push("", "Message:", data.message);
    window.location.href =
      `mailto:${BUSINESS.email}?subject=${encodeURIComponent("Cleaning quote request — " + (data.name || "new client"))}` +
      `&body=${encodeURIComponent(lines.join("\n"))}`;
    setFoot("Couldn't send from here, so we've opened your email app instead. Or call " + BUSINESS.phone + ".");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = {
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      home_size: homeSizeSelect.value,
      service: serviceSelect.value,
      frequency: frequencyRow.hidden ? "" : frequencySelect.value,
      message: value("message"),
      website: value("website"), // honeypot: people never see or fill this
    };

    // Honeypot tripped: pretend it worked, send nothing
    if (data.website) {
      showReceived(data.email, true);
      return;
    }

    if (isLocalPreview) {
      setFoot(`This is a local preview, so the form can't send from here. Try it on the live site: ${BUSINESS.websiteLabel}`);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const res = await fetch("api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (!json || json.ok === false) throw new Error("rejected");
      showReceived(data.email, json.copySent !== false);
    } catch (err) {
      mailtoFallback(data);
    } finally {
      btn.disabled = false;
      btn.textContent = "Request my free quote";
    }
  });
}

/* ---------- Mobile action bar ---------- */
// Shown whenever the hero's main button is not fully on screen (and the quote
// form isn't already in view), so a call/quote is always one tap away.
const bar = $("#mobile-bar");
const heroCta = $(".hero-actions .btn-primary");
const contact = $("#contact");
let ctaOffScreen = false;
let onContact = false;

function updateBar() {
  if (!bar) return;
  const menuOpen = header && header.classList.contains("is-open");
  bar.classList.toggle("is-shown", ctaOffScreen && !onContact && !menuOpen);
}

if (bar && heroCta && "IntersectionObserver" in window) {
  new IntersectionObserver(
    (entries) => {
      ctaOffScreen = !entries[0].isIntersecting;
      updateBar();
    },
    { threshold: 1 }
  ).observe(heroCta);

  new IntersectionObserver(
    (entries) => {
      onContact = entries[0].isIntersecting;
      updateBar();
    },
    { threshold: 0.12 }
  ).observe(contact);
}
