/* ============================================================
   Heather's Cleaning Services — interactions
   - Mobile nav toggle
   - Active nav-link highlighting on scroll (scrollspy)
   - Booking form: POST to /api/inquiry (Cloudflare Pages Function
     relaying via Resend). Falls back to a mailto: link when the
     API isn't deployed (e.g., on GitHub Pages previews).
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Mobile nav ---------- */
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    // Close after navigating from the mobile menu
    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        if (links.classList.contains("open")) {
          links.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Open menu");
        }
      });
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("open")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  /* ---------- Scrollspy: highlight active nav link ---------- */
  const navItems = Array.from(document.querySelectorAll(".nav-links a"));
  const sections = navItems
    .map((a) => {
      const id = a.getAttribute("href");
      return id && id.startsWith("#") ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const setActive = (id) => {
      navItems.forEach((a) => {
        const match = a.getAttribute("href") === "#" + id;
        a.style.color = match ? "var(--aqua)" : "";
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
  }

  /* ---------- Booking form ---------- */
  const form = document.getElementById("booking-form");
  const INBOX = "heatherbond2024@hotmail.com"; // where inquiries are delivered

  if (form) {
    const collectFields = () => {
      const get = (name) => {
        const el = form.elements[name];
        return el ? el.value.trim() : "";
      };
      return {
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        home_size: get("home_size"),
        service: get("service"),
        frequency: get("frequency"),
        when: get("when"),
        message: get("message"),
        website: get("website"), // honeypot — humans never see or fill this
      };
    };

    const buildMailto = (d) => {
      const subject = `Cleaning quote request — ${d.name || "new client"}`;
      const lines = [
        `Name: ${d.name}`,
        `Email: ${d.email}`,
        d.phone ? `Phone: ${d.phone}` : null,
        d.home_size ? `Home size: ${d.home_size}` : null,
        d.service ? `Service needed: ${d.service}` : null,
        d.frequency ? `Frequency: ${d.frequency}` : null,
        d.when ? `Preferred times: ${d.when}` : null,
        d.message ? `\nMessage:\n${d.message}` : null,
        "",
        "— Sent from the Heather's Cleaning Services website",
      ].filter(Boolean);

      return `mailto:${INBOX}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(lines.join("\n"))}`;
    };

    const setFoot = (text) => {
      const foot = form.querySelector(".form-foot");
      if (foot) foot.textContent = text;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Validate required fields natively first
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = collectFields();

      // Honeypot tripped — pretend success, send nothing
      if (data.website) {
        form.reset();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";

      try {
        const res = await fetch("api/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);

        setFoot("✅ Thanks! Your inquiry is on its way — we'll reply within 24 hours.");
        form.reset();
      } catch (err) {
        // API not available here (e.g., GitHub Pages preview) —
        // fall back to opening the visitor's email client.
        window.location.href = buildMailto(data);
        setFoot("Opening your email app… or email us directly at " + INBOX);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }
})();
