// Cloudflare Pages Function: POST /api/inquiry
// Validates the booking form and relays it as an email via Resend.
// Requires the RESEND_API_KEY secret in Pages project settings.

const INBOX = "heatherbond2024@hotmail.com";
const FROM = "Heather's Cleaning Services <hello@heatherscleaning.ca>";

const CLEAN = (s, max) => String(s || "").trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "Server not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Bad request." }, 400);
  }

  // Honeypot: bots fill hidden fields — silently accept and drop.
  if (CLEAN(body.website, 100)) return json({ ok: true });

  const name = CLEAN(body.name, 80);
  const email = CLEAN(body.email, 120);
  if (name.length < 2 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "Name and a valid email are required." }, 400);
  }

  const phone = CLEAN(body.phone, 30);
  const message = CLEAN(body.message, 2000);
  const fields = {
    "Home size": CLEAN(body.home_size, 50),
    "Service needed": CLEAN(body.service, 50),
    "Frequency": CLEAN(body.frequency, 50),
    "Preferred times": CLEAN(body.when, 100),
  };

  const lines = [`Name: ${name}`, `Email: ${email}`];
  if (phone) lines.push(`Phone: ${phone}`);
  for (const [label, value] of Object.entries(fields)) {
    if (value) lines.push(`${label}: ${value}`);
  }
  if (message) lines.push("", "Message:", message);
  lines.push("", "— Sent from the contact form at heatherscleaning.ca");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [INBOX],
      reply_to: email, // Heather can hit "Reply" to answer the client directly
      subject: `New cleaning inquiry — ${name}`,
      text: lines.join("\n"),
    }),
  });

  if (!resp.ok) {
    return json(
      { ok: false, error: "Could not send right now — please email or call us directly." },
      502
    );
  }
  return json({ ok: true });
}

export async function onRequest() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
