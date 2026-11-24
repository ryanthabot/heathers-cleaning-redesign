// The quote form's endpoint: validate the submission, drop obvious bots, and
// send two emails through Resend:
//   1. a notification to the business
//   2. a confirmation to the person who asked, with an estimated price
//
// Called by src/index.js for POST /api/inquiry.
// RESEND_API_KEY is a secret stored on the Worker in the Cloudflare dashboard.

import { businessEmail, customerEmail } from "./emails.js";
import { BUSINESS, homeSize, service, frequency } from "../public/pricing.js";

const FROM = `${BUSINESS.name} <hello@heatherscleaning.ca>`;
const INBOX = BUSINESS.email;

const CLEAN = (s, max) => String(s ?? "").trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// An id the visitor chose in the form. Anything else is treated as "not given".
const ID = (s) => CLEAN(s, 20).toLowerCase();

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

  const name = CLEAN(body.name, 80).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ");
  const email = CLEAN(body.email, 120);
  const phone = CLEAN(body.phone, 30);

  if (name.length < 2) {
    return json({ ok: false, error: "Please add your name." }, 400);
  }
  if (!email) {
    return json({ ok: false, error: "Please add your email address, so we can send you a copy of your request." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "That email address doesn't look right." }, 400);
  }

  const svc = service(ID(body.service));
  const details = {
    name,
    email,
    phone,
    homeSizeId: (homeSize(ID(body.home_size)) || {}).id || "",
    serviceId: (svc || {}).id || "",
    // "How often" is only meaningful for a standard clean
    frequencyId: svc && svc.id === "standard" ? (frequency(ID(body.frequency)) || {}).id || "" : "",
    message: CLEAN(body.message, 2000),
    now: new Date(),
  };

  // The business must always hear about a request. If that email fails, tell
  // the visitor so the page falls back to opening their email app.
  const toBusiness = await sendEmail(env, INBOX, businessEmail(details), { replyTo: email });
  if (!toBusiness) {
    return json({ ok: false, error: "Could not send right now. Please email or call us directly." }, 502);
  }

  // The confirmation is a courtesy: a failure here must not look like the request
  // failed. The page is told whether it went, so it never promises a copy that
  // was not sent.
  const copySent = await sendEmail(env, email, customerEmail(details), { replyTo: INBOX });

  return json({ ok: true, copySent });
}

async function sendEmail(env, to, message, { replyTo }) {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
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
