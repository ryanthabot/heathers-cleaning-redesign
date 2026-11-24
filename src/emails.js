// The two emails sent when someone asks for a quote:
//   - businessEmail: the notification to the business
//   - customerEmail: the confirmation to the person who asked
//
// Both are built to match the website: a cream card on deep teal, a serif
// headline carrying the yellow mark, the mint price block with a large figure,
// a pill button and a dark footer. Email programs cannot load the site's web
// fonts and ignore modern page layout, so this uses table layout with inline
// styles, Georgia for headings and Arial for body text.

import { BUSINESS, homeSize, service, frequency, estimate } from "../public/pricing.js";

const TEAL = "#0A3A3E";
const BODY = "#2C5B5A";
const MUTED = "#556C6B";
const CREAM = "#FBFAF7";
const AQUA = "#2EC4B6";
const AQUA_TEXT = "#0B7A6E";
const AQUA_LIGHT = "#6EE7DB";
const SUN = "#F9D45C";
const MINT = "#E6F4F0";
const LINE = "#E1E8E5";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

// Everything a visitor types goes through this before it is put in HTML.
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Escaped text with line breaks kept.
const lines = (s) => esc(s).replace(/\r\n?/g, "\n").replace(/\n/g, "<br>");

// One line, for subjects and greetings.
const singleLine = (s) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();

function firstName(name) {
  return singleLine(name).split(" ")[0] || "there";
}

function whenFormatted(date) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

// Turn the visitor's choices into labels, a price estimate and plain sentences.
function summarise(req) {
  const size = homeSize(req.homeSizeId);
  const svc = service(req.serviceId);
  // "How often" only means something for a standard clean
  const freq = svc && svc.id === "standard" ? frequency(req.frequencyId) : null;
  const est = estimate(req.serviceId, req.homeSizeId, freq ? freq.id : "");

  return {
    size: size ? size.long : "",
    service: svc ? svc.label : "",
    frequency: freq ? freq.label : "",
    est,
  };
}

/* ---------- Shared pieces ---------- */

function priceBlock(est, note) {
  if (!est) return "";
  const figure = est.highlight
    ? `<span style="background-color:${SUN}; padding:2px 14px 6px; border-radius:10px;">${esc(est.headline)}</span>`
    : esc(est.headline);
  return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:0 0 32px;">
            <tr>
              <td align="center" style="background-color:${MINT}; border-radius:18px; padding:26px 20px 24px;">
                <p style="margin:0; font-family:${SANS}; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${MUTED};">Estimated price</p>
                <p class="figure" style="margin:12px 0 12px; font-family:${SERIF}; font-size:46px; line-height:1.1; color:${TEAL};">${figure}</p>
                <p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.5; color:${BODY};">${esc(est.description)}</p>
                <p style="margin:8px 0 0; font-family:${SANS}; font-size:13px; line-height:1.5; color:${MUTED};">${esc(note)}</p>
              </td>
            </tr>
          </table>`;
}

function heading(eyebrow, firstLine, markedLine) {
  return `
          <p style="margin:0 0 14px; font-family:${SANS}; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${AQUA_TEXT};">${esc(eyebrow)}</p>
          <h1 class="title" style="margin:0 0 18px; font-family:${SERIF}; font-weight:normal; font-size:36px; line-height:1.18; color:${TEAL};">
            ${esc(firstLine)}<br>
            <span style="background-color:${SUN}; padding:0 8px 3px; -webkit-box-decoration-break:clone; box-decoration-break:clone;">${esc(markedLine)}</span>
          </h1>`;
}

function lead(text) {
  return `
          <p style="margin:0 0 32px; font-family:${SANS}; font-size:16px; line-height:1.65; color:${BODY};">${text}</p>`;
}

function detailsTable(title, rows) {
  const body = rows
    .map(
      ([label, value], i) => `
            <tr>
              <td style="width:36%; padding:12px 0; border-top:1px solid ${LINE}; font-size:12px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; color:${MUTED}; vertical-align:top;">${esc(label)}</td>
              <td style="padding:12px 0; border-top:1px solid ${LINE}; color:${TEAL}; vertical-align:top;">${value}</td>
            </tr>`
    )
    .join("");
  return `
          <p style="margin:0 0 4px; font-family:${SANS}; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${MUTED};">${esc(title)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin-bottom:32px; border-bottom:1px solid ${LINE}; font-family:${SANS}; font-size:15px; line-height:1.55;">
${body}
          </table>`;
}

function button(href, label, note) {
  return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:8px 0 10px;">
            <tr>
              <td align="center">
                <a href="${esc(href)}" style="display:inline-block; padding:15px 32px; background-color:${AQUA}; border-radius:32px; color:${TEAL}; font-family:${SANS}; font-size:16px; font-weight:bold; text-decoration:none;">${esc(label)}</a>
              </td>
            </tr>
          </table>
          <p align="center" style="margin:0; font-family:${SANS}; font-size:14px; line-height:1.5; color:${MUTED};">${esc(note)}</p>`;
}

function layout({ preheader, content, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(preheader)}</title>
  <style>
    @media only screen and (max-width: 480px) {
      .card-inner, .card-footer { padding-left: 22px !important; padding-right: 22px !important; }
      .title { font-size: 28px !important; }
      .figure { font-size: 34px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${TEAL};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${esc(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${TEAL};">
    <tr>
      <td align="center" style="padding:32px 12px 40px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:${CREAM}; border-radius:24px;">
          <tr>
            <td class="card-inner" style="padding:40px 44px 36px;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="width:44px; height:44px; vertical-align:middle;">
                    <div style="width:44px; height:44px; border-radius:50%; background-color:${AQUA}; font-family:${SERIF}; font-size:24px; font-weight:bold; color:${TEAL}; text-align:center; line-height:44px;">${esc(BUSINESS.initial)}</div>
                  </td>
                  <td style="padding-left:12px; font-family:${SERIF}; font-size:20px; color:${TEAL};">${esc(BUSINESS.name)}</td>
                </tr>
              </table>
${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0; font-family:${SANS};">
              <div class="card-footer" style="padding:28px 44px 30px; background-color:${TEAL}; border-radius:0 0 24px 24px;">
                <p style="margin:0 0 2px; font-family:${SERIF}; font-size:18px; color:#FFFFFF;">${esc(BUSINESS.name)}</p>
                <p style="margin:0 0 14px; font-size:14px; color:${AQUA_LIGHT};">${esc(BUSINESS.tagline)}</p>
                <p style="margin:0; font-size:13px; line-height:1.6; color:#C9D4D5;">${esc(BUSINESS.phone)} &middot; ${esc(BUSINESS.email)} &middot; ${esc(BUSINESS.websiteLabel)}</p>
                <p style="margin:12px 0 0; font-size:12px; line-height:1.5; color:#8FA5A2;">${esc(footerNote)}</p>
              </div>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ---------- The confirmation to the customer ---------- */

export function customerEmail(req) {
  const { size, service: serviceName, frequency: howOften, est } = summarise(req);
  const first = firstName(req.name);
  const subject = `We received your quote request — ${BUSINESS.name}`;

  const rows = [
    ["Name", esc(singleLine(req.name))],
    ["Email", esc(req.email)],
  ];
  if (req.phone) rows.push(["Phone", esc(singleLine(req.phone))]);
  if (size) rows.push(["Home size", esc(size)]);
  if (serviceName) rows.push(["Service", esc(serviceName)]);
  if (howOften) rows.push(["How often", esc(howOften)]);
  if (req.message) rows.push(["Message", lines(req.message)]);

  const steps = [
    "We reply with your confirmed price and the times that work.",
    "You pick the time that suits you.",
    `We arrive, and you come home to spotless. Your first clean is ${BUSINESS.firstCleanOffer}.`,
  ];
  const stepsHtml = steps
    .map(
      (text, i) => `
            <tr>
              <td style="width:44px; padding:0 12px 14px 0; vertical-align:top;">
                <div style="width:32px; height:32px; border:1px solid ${LINE}; border-radius:50%; text-align:center; line-height:30px; font-family:${SERIF}; font-size:15px; color:${TEAL};">${i + 1}</div>
              </td>
              <td style="padding:4px 0 14px; vertical-align:top;">${esc(text)}</td>
            </tr>`
    )
    .join("");

  const priceSentence = est
    ? `Estimated price: ${est.sentence}`
    : "Once we know a little more about your home we will send you a price.";

  const html = layout({
    preheader: `A copy of what you sent us. ${priceSentence}`,
    content:
      heading("Quote request received", `Thanks, ${singleLine(first)}.`, "We've received your request.") +
      lead(
        `Here is a copy of what you sent us${
          est ? ", with your estimated price" : ""
        }. Heather will be in touch to confirm the price and find a time that works.`
      ) +
      priceBlock(est, "Heather confirms your final price when she replies.") +
      detailsTable("What you told us", rows) +
      `
          <p style="margin:0 0 20px; font-family:${SANS}; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${MUTED};">What happens next</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin-bottom:32px; font-family:${SANS}; font-size:15px; line-height:1.55; color:${BODY};">
${stepsHtml}
          </table>` +
      button(BUSINESS.phoneHref, `Call ${BUSINESS.phone}`, "Prefer to write? Just reply to this email."),
    footerNote: `You are receiving this because the quote form at ${BUSINESS.websiteLabel} was filled in with this address on ${whenFormatted(req.now)}. If this was not you, you can safely ignore this email.`,
  });

  const text = [
    `Thanks, ${first}. We've received your quote request.`,
    "",
    priceSentence,
    "",
    "WHAT YOU TOLD US",
    `Name: ${singleLine(req.name)}`,
    `Email: ${req.email}`,
    req.phone ? `Phone: ${singleLine(req.phone)}` : null,
    size ? `Home size: ${size}` : null,
    serviceName ? `Service: ${serviceName}` : null,
    howOften ? `How often: ${howOften}` : null,
    req.message ? `Message:\n${req.message}` : null,
    "",
    "WHAT HAPPENS NEXT",
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "",
    `Questions? Call ${BUSINESS.phone}, or simply reply to this email.`,
    "",
    BUSINESS.name,
    BUSINESS.tagline,
    `${BUSINESS.phone} | ${BUSINESS.email} | ${BUSINESS.websiteLabel}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html, text };
}

/* ---------- The notification to the business ---------- */

export function businessEmail(req) {
  const { size, service: serviceName, frequency: howOften, est } = summarise(req);
  const name = singleLine(req.name);
  const subject = est
    ? `New quote request from ${name} — ${est.headline} estimated`
    : `New quote request from ${name}`;

  const rows = [
    ["Name", esc(name)],
    ["Phone", req.phone ? `<a href="tel:${esc(req.phone.replace(/[^\d+]/g, ""))}" style="color:${AQUA_TEXT}; text-decoration:underline;">${esc(singleLine(req.phone))}</a>` : "&#8212;"],
    ["Email", `<a href="mailto:${esc(req.email)}" style="color:${AQUA_TEXT}; text-decoration:underline;">${esc(req.email)}</a>`],
  ];
  if (size) rows.push(["Home size", esc(size)]);
  if (serviceName) rows.push(["Service", esc(serviceName)]);
  if (howOften) rows.push(["How often", esc(howOften)]);
  if (req.message) rows.push(["Message", lines(req.message)]);

  const html = layout({
    preheader: est ? `Estimated price: ${est.headline}. ${est.description}.` : `No estimate yet: ${serviceName || "service not chosen"}.`,
    content:
      heading("New quote request", "New quote request", `from ${name}.`) +
      lead(
        `Sent from the quote form at ${BUSINESS.websiteLabel}. Reply to this email to answer ${esc(
          firstName(name)
        )} directly.`
      ) +
      priceBlock(est, "Confirm this price when you reply.") +
      detailsTable("The request", rows) +
      button(`mailto:${req.email}`, `Reply to ${firstName(name)}`, `Received ${whenFormatted(req.now)} (Toronto time).`),
    footerNote: `Sent automatically by the quote form at ${BUSINESS.websiteLabel}.`,
  });

  const text = [
    `New quote request from ${name}`,
    "",
    est ? `ESTIMATED PRICE: ${est.headline} — ${est.description}` : `ESTIMATE: none yet (${serviceName || "service not chosen"})`,
    "",
    "THE REQUEST",
    `Name: ${name}`,
    `Phone: ${req.phone ? singleLine(req.phone) : "not given"}`,
    `Email: ${req.email}`,
    size ? `Home size: ${size}` : null,
    serviceName ? `Service: ${serviceName}` : null,
    howOften ? `How often: ${howOften}` : null,
    req.message ? `Message:\n${req.message}` : null,
    "",
    `Received ${whenFormatted(req.now)} (Toronto time) from the quote form at ${BUSINESS.websiteLabel}.`,
    `Hit Reply to answer ${firstName(name)} directly.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html, text };
}
