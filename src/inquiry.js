// The quote form's endpoint: validate the submission, drop obvious bots,
// and send it as an email through Resend.
//
// Called by src/index.js for POST /api/inquiry.
// RESEND_API_KEY is a secret stored on the Worker in the Cloudflare dashboard.

const INBOX = "heatherbond2024@hotmail.com";
const FROM = "Heather's Cleaning Services <hello@heatherscleaning.ca>";

const CLEAN = (s, max) => String(s || "").trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleInquiry(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "Server not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Bad request." }, 400);
  }

  // Honeypot: bots fill hidden fields. Accept quietly and send nothing.
  if (CLEAN(body.website, 100)) return json({ ok: true });

  const name = CLEAN(body.name, 80);
  const email = CLEAN(body.email, 120);
  const phone = CLEAN(body.phone, 30);

  if (name.length < 2) {
    return json({ ok: false, error: "Please add your name." }, 400);
  }
  if (email && !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "That email address doesn't look right." }, 400);
  }
  if (!email && !phone) {
    return json({ ok: false, error: "Add a phone number or an email so we can reach you." }, 400);
  }

  const message = CLEAN(body.message, 2000);
  const fields = {
    "Home size": CLEAN(body.home_size, 50),
    Service: CLEAN(body.service, 50),
  };

  const lines = [`Name: ${name}`];
  if (phone) lines.push(`Phone: ${phone}`);
  if (email) lines.push(`Email: ${email}`);
  for (const [label, value] of Object.entries(fields)) {
    if (value) lines.push(`${label}: ${value}`);
  }
  if (message) lines.push("", "Message:", message);
  lines.push("", "— Sent from the contact form at heatherscleaning.ca");

  const emailPayload = {
    from: FROM,
    to: [INBOX],
    subject: `New cleaning inquiry — ${name}`,
    text: lines.join("\n"),
  };
  if (email) emailPayload.reply_to = email; // so Heather can hit "Reply" to answer the client

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resp.ok) {
    return json(
      { ok: false, error: "Could not send right now. Please email or call us directly." },
      502
    );
  }
  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
